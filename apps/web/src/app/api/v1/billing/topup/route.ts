import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateReseller, apiError } from "@/lib/reseller-api";
import { createDuitkuTransaction } from "@/lib/duitku";
import { sendCustomerInvoiceEmail } from "@/lib/email";
import { decryptDeterministic } from "@/lib/encryption";

export const dynamic = "force-dynamic";

function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
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
          minAmount: 50000,
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
    const MIN_TOPUP = 50000;    // Rp 50.000

    if (
      !amount ||
      isNaN(amount) ||
      !Number.isFinite(amount) ||
      Math.floor(amount) !== amount ||
      amount < MIN_TOPUP ||
      amount > MAX_TOPUP
    ) {
      return apiError(
        `Invalid amount. Minimum top up is Rp ${MIN_TOPUP.toLocaleString("id-ID")} and maximum is Rp ${MAX_TOPUP.toLocaleString("id-ID")} (must be an integer).`,
        400
      );
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

    let discountAmount = 0;
    let appliedVoucherCode: string | null = null;
    let voucherRecordId: number | null = null;

    const voucherCode = typeof body.voucherCode === "string" ? body.voucherCode.trim().toUpperCase() : null;

    if (voucherCode) {
      try {
        await prisma.$transaction(async (tx) => {
          const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
          if (!voucher || !voucher.isActive) throw new Error("INVALID");
          if (voucher.validUntil && voucher.validUntil < new Date()) throw new Error("EXPIRED");

          const usageCount = await tx.voucherUsage.count({
            where: { userId: user.id, voucherId: voucher.id },
          });
          if (usageCount > 0) throw new Error("ALREADY_USED");

          if (voucher.maxUses > 0) {
            const updated = await tx.voucher.updateMany({
              where: { id: voucher.id, currentUses: { lt: voucher.maxUses } },
              data: { currentUses: { increment: 1 } },
            });
            if (updated.count === 0) throw new Error("LIMIT_REACHED");
          } else {
            await tx.voucher.update({
              where: { id: voucher.id },
              data: { currentUses: { increment: 1 } },
            });
          }

          await tx.voucherUsage.create({
            data: {
              userId: user.id,
              voucherId: voucher.id,
            },
          });

          discountAmount = Math.floor(amount * (voucher.discountPercent / 100));
          appliedVoucherCode = voucher.code;
          voucherRecordId = voucher.id;
        });
      } catch (err: any) {
        let errorMsg = "Voucher has been fully claimed or is no longer valid.";
        if (err.message === "ALREADY_USED") errorMsg = "You have already used this voucher code.";
        if (err.message === "EXPIRED") errorMsg = "Voucher code has expired.";
        return apiError(errorMsg, 400);
      }
    }

    const fee = paymentMethod.fee || 0;
    const subtotal = amount;
    const paymentSubtotal = Math.max(0, amount - discountAmount);
    const taxAmount = Math.floor(paymentSubtotal * (taxRate / 100));
    const totalAmount = paymentSubtotal + taxAmount + fee;

    const merchantOrderId = generateOrderId();

    let detailsJson: string | null = null;
    if (appliedVoucherCode) {
      detailsJson = JSON.stringify({ voucherCode: appliedVoucherCode, discountAmount });
    }

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
        details: detailsJson,
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
          ...(discountAmount > 0 && appliedVoucherCode
            ? [
                {
                  name: `Voucher Discount (${appliedVoucherCode})`,
                  price: -discountAmount,
                  quantity: 1,
                },
              ]
            : []),
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
      // Clean rollback of draft invoice
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
      // Rollback voucher usage if applied
      if (voucherRecordId) {
        await prisma.voucherUsage
          .deleteMany({ where: { userId: user.id, voucherId: voucherRecordId } })
          .catch(() => {});
        await prisma.voucher
          .update({ where: { id: voucherRecordId }, data: { currentUses: { decrement: 1 } } })
          .catch(() => {});
      }
      return apiError("Failed to connect to payment gateway. Please check your payment method and try again.", 500);
    }

    if (!transaction || !transaction.paymentUrl) {
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
      if (voucherRecordId) {
        await prisma.voucherUsage
          .deleteMany({ where: { userId: user.id, voucherId: voucherRecordId } })
          .catch(() => {});
        await prisma.voucher
          .update({ where: { id: voucherRecordId }, data: { currentUses: { decrement: 1 } } })
          .catch(() => {});
      }
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
