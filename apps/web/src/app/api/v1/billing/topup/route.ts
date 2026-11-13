import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateReseller, apiError } from "@/lib/reseller-api";
import { createDuitkuTransaction } from "@/lib/duitku";
import { sendCustomerInvoiceEmail } from "@/lib/email";
import { decryptDeterministic } from "@/lib/encryption";

export const dynamic = "force-dynamic";

const MAX_WALLET_BALANCE = 2_000_000_000;

function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `TOPUP-${timestamp}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_TOPUP_GET", max: 60, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const invoiceNumber = req.nextUrl.searchParams.get("invoiceNumber");

    if (invoiceNumber) {
      const trimmedInvoice = invoiceNumber.trim();
      const invoice = await prisma.invoice.findFirst({
        where: {
          OR: [
            { merchantOrderId: trimmedInvoice },
            { invoiceNumber: trimmedInvoice },
          ],
          userId: apiKey.userId,
          type: "TOP_UP",
        },
      });

      if (!invoice) {
        return apiError(`Top up invoice '${trimmedInvoice}' not found for your account`, 404);
      }

      return NextResponse.json({
        success: true,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          merchantOrderId: invoice.merchantOrderId,
          status: invoice.status,
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          taxRate: invoice.taxRate,
          amount: invoice.amount,
          paymentMethod: invoice.paymentMethod,
          paymentUrl: invoice.paymentUrl,
          reference: invoice.reference,
          vaNumber: invoice.vaNumber,
          qrString: invoice.qrString,
          paidAt: invoice.paidAt,
          createdAt: invoice.createdAt,
        },
      });
    }

    // Default: Return available active payment methods, top up limits, and recent topup history
    const [paymentMethods, taxRateSetting, recentTopups] = await Promise.all([
      prisma.paymentMethod.findMany({
        where: { isActive: true },
        select: {
          code: true,
          name: true,
          type: true,
          fee: true,
          image: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.setting.findUnique({ where: { key: "tax_rate" } }),
      prisma.invoice.findMany({
        where: {
          userId: apiKey.userId,
          type: "TOP_UP",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          invoiceNumber: true,
          subtotal: true,
          amount: true,
          status: true,
          paymentMethod: true,
          paymentUrl: true,
          paidAt: true,
          createdAt: true,
        },
      }),
    ]);

    const taxRate = taxRateSetting && !isNaN(Number(taxRateSetting.value)) ? Math.max(0, Number(taxRateSetting.value)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        limits: {
          minAmount: 10000,
          maxAmount: 50000000,
          currency: "IDR",
          taxRatePercent: taxRate,
        },
        paymentMethods,
        recentTopups,
      },
    });
  } catch (error: any) {
    console.error("[RESELLER_API_TOPUP_GET]", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_TOPUP_POST", max: 30, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const user = await prisma.user.findUnique({ where: { id: apiKey.userId } });
    if (!user) return apiError("User not found", 404);

    const body = await req.json().catch(() => ({}));
    const rawAmount = body.amount;
    const amount = Number(rawAmount);

    const MAX_TOPUP = 50000000; // Rp 50.000.000
    const MIN_TOPUP = 10000;    // Rp 10.000

    if (body.voucherCode && String(body.voucherCode).trim().length > 0) {
      return apiError("Discount vouchers cannot be applied to wallet top-ups.", 400);
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < MIN_TOPUP ||
      amount > MAX_TOPUP
    ) {
      return apiError(
        `Invalid amount. Minimum top up is Rp ${MIN_TOPUP.toLocaleString("id-ID")} and maximum is Rp ${MAX_TOPUP.toLocaleString("id-ID")} (must be an integer).`,
        400
      );
    }

    if ((user.balance || 0) + amount > MAX_WALLET_BALANCE) {
      return apiError("Maximum wallet balance limit (Rp 2.000.000.000) exceeded.", 400);
    }

    const rawCode = String(body.paymentMethodCode || "").trim();
    if (!rawCode) {
      return apiError(
        "paymentMethodCode is required. Perform a GET request to /api/v1/billing/topup to view active payment methods.",
        400
      );
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        code: { equals: rawCode, mode: "insensitive" },
        isActive: true,
      },
    });

    if (!paymentMethod) {
      const activeMethods = await prisma.paymentMethod.findMany({
        where: { isActive: true },
        select: { code: true, name: true },
      });
      const validCodes = activeMethods.map((m) => `${m.code} (${m.name})`).join(", ");
      return apiError(
        `Invalid or inactive paymentMethodCode '${rawCode}'. Available options: ${validCodes || "None active"}`,
        400
      );
    }

    const taxRateSetting = await prisma.setting.findUnique({ where: { key: "tax_rate" } });
    const taxRate = taxRateSetting && !isNaN(Number(taxRateSetting.value)) ? Math.max(0, Number(taxRateSetting.value)) : 0;

    const discountAmount = 0;
    const fee = Math.max(0, paymentMethod.fee || 0);
    const subtotal = amount;
    const paymentSubtotal = amount;
    const taxAmount = Math.floor(paymentSubtotal * (taxRate / 100));
    const totalAmount = paymentSubtotal + taxAmount + fee;

    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0 || totalAmount > MAX_WALLET_BALANCE) {
      return apiError("Calculated invoice total is out of range.", 400);
    }

    const merchantOrderId = generateOrderId();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: merchantOrderId,
        userId: user.id,
        subtotal,
        taxRate,
        taxAmount,
        amount: totalAmount,
        status: "PENDING",
        paymentMethod: paymentMethod.name,
        merchantOrderId,
        type: "TOP_UP",
        details: null,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.masdika.id";

    const rawEmail = user.email || "";
    const decryptedEmailVal = decryptDeterministic(rawEmail);
    const userEmail =
      decryptedEmailVal && decryptedEmailVal.includes("@")
        ? decryptedEmailVal
        : rawEmail.includes("@")
        ? rawEmail
        : "customer@masdika.id";

    const rawName = user.name || "";
    const decryptedName = decryptDeterministic(rawName);
    const userName = decryptedName || rawName || "Customer";

    let transaction;
    try {
      transaction = await createDuitkuTransaction({
        paymentAmount: totalAmount,
        merchantOrderId,
        productDetails: `Account Balance Top Up (Reseller API)`,
        email: userEmail,
        phoneNumber: "08123456789",
        customerVaName: userName || "Customer",
        callbackUrl: `${baseUrl}/api/payment/callback`,
        returnUrl: `${baseUrl}/dashboard/billing`,
        paymentMethod: paymentMethod.code,
        itemDetails: [
          {
            name: "Top Up Balance",
            price: amount,
            quantity: 1,
          },
          ...(taxAmount > 0
            ? [
                {
                  name: `PPN (${taxRate}%)`,
                  price: taxAmount,
                  quantity: 1,
                },
              ]
            : []),
          ...(fee > 0
            ? [
                {
                  name: "Payment Gateway Fee",
                  price: fee,
                  quantity: 1,
                },
              ]
            : []),
        ],
      });
    } catch (duitkuError) {
      console.error("[RESELLER_TOPUP] Duitku error:", duitkuError);
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
      return apiError("Failed to connect to payment gateway. Please check your payment method and try again.", 500);
    }

    if (!transaction || !transaction.paymentUrl) {
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
      return apiError("Payment gateway did not return a valid payment URL", 500);
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentUrl: transaction.paymentUrl,
        reference: transaction.reference,
        vaNumber: transaction.vaNumber,
        qrString: transaction.qrString,
      },
    });

    sendCustomerInvoiceEmail({
      toEmail: userEmail,
      customerName: userName,
      type: "TOP_UP",
      amount: totalAmount,
      paymentMethod: paymentMethod.name,
      invoiceNumber: merchantOrderId,
      paymentUrl: transaction.paymentUrl,
    }).catch((e) => console.error("[RESELLER_TOPUP] Email error:", e));

    return NextResponse.json({
      success: true,
      message: "Top up invoice created successfully",
      data: {
        invoiceNumber: merchantOrderId,
        subtotal,
        discountAmount,
        taxAmount,
        taxRate,
        fee,
        totalAmount,
        creditedBalance: subtotal,
        currency: "IDR",
        paymentMethod: paymentMethod.name,
        paymentMethodCode: paymentMethod.code,
        paymentUrl: transaction.paymentUrl,
        reference: transaction.reference,
        vaNumber: transaction.vaNumber || null,
        qrString: transaction.qrString || null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[RESELLER_API_TOPUP_POST]", error);
    return apiError("Internal server error", 500);
  }
}
