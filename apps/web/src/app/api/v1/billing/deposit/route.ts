import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateReseller, apiError } from "@/lib/reseller-api";
import { createDuitkuTransaction } from "@/lib/duitku";
import { sendCustomerInvoiceEmail } from "@/lib/email";
import { decryptDeterministic } from "@/lib/encryption";

export const dynamic = "force-dynamic";

function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TOPUP-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_DEPOSIT", max: 30, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const user = await prisma.user.findUnique({ where: { id: apiKey.userId } });
    if (!user) return apiError("User not found", 404);

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const paymentMethodCode = body.paymentMethodCode;

    const MAX_TOPUP = 50000000;
    if (!amount || isNaN(amount) || !paymentMethodCode || amount < 50000 || amount > MAX_TOPUP) {
      return apiError("Invalid amount or missing fields. Minimum top up is Rp 50.000 and max is Rp50.000.000", 400);
    }

    const paymentMethod = await prisma.paymentMethod.findUnique({ where: { code: paymentMethodCode } });
    if (!paymentMethod || !paymentMethod.isActive) {
      return apiError("Invalid or inactive payment method", 400);
    }

    const taxRateSetting = await prisma.setting.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxRateSetting && !isNaN(Number(taxRateSetting.value)) ? Number(taxRateSetting.value) : 0;

    const fee = paymentMethod.fee || 0;
    const subtotal = amount;
    const taxAmount = Math.floor(subtotal * (taxRate / 100));
    const totalAmount = subtotal + taxAmount + fee;

    const merchantOrderId = generateOrderId();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: merchantOrderId,
        userId: user.id,
        subtotal,
        taxRate,
        taxAmount,
        amount: totalAmount,
        status: 'PENDING',
        paymentMethod: paymentMethod.name,
        merchantOrderId: merchantOrderId,
        type: 'TOP_UP',
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://masdika.id';
    
    const rawEmail = user.email || '';
    const decryptedEmailVal = decryptDeterministic(rawEmail);
    const userEmail = (decryptedEmailVal && decryptedEmailVal.includes('@')) ? decryptedEmailVal : (rawEmail.includes('@') ? rawEmail : 'customer@masdika.id');
    const rawName = user.name || '';
    const decryptedName = decryptDeterministic(rawName);
    const userName = decryptedName || rawName || 'Customer';

    let transaction;
    try {
      transaction = await createDuitkuTransaction({
        paymentAmount: totalAmount,
        merchantOrderId,
        productDetails: `Account Balance Top Up (API)`,
        email: userEmail,
        phoneNumber: '08123456789',
        customerVaName: userName || 'Customer',
        callbackUrl: `${baseUrl}/api/payment/callback`,
        returnUrl: `${baseUrl}/dashboard/billing`,
        paymentMethod: paymentMethod.code,
        itemDetails: [
          {
            name: `Top Up Balance`,
            price: amount,
            quantity: 1
          },
          ...(taxAmount > 0 ? [{
            name: `PPN (${taxRate}%)`,
            price: taxAmount,
            quantity: 1
          }] : []),
          ...(fee > 0 ? [{
            name: "Payment Gateway Fee",
            price: fee,
            quantity: 1
          }] : [])
        ]
      });
    } catch (duitkuError) {
      await prisma.invoice.delete({ where: { id: invoice.id } });
      return apiError("Failed to connect to payment gateway. Please check your payment method and try again.", 500);
    }

    if (!transaction || !transaction.paymentUrl) {
      await prisma.invoice.delete({ where: { id: invoice.id } });
      return apiError("Failed to generate payment gateway link", 500);
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentUrl: transaction.paymentUrl,
        reference: transaction.reference,
        vaNumber: transaction.vaNumber,
        qrString: transaction.qrString
      }
    });

    sendCustomerInvoiceEmail({
      toEmail: userEmail,
      customerName: userName,
      type: 'TOP_UP',
      amount: totalAmount,
      paymentMethod: paymentMethod.name,
      invoiceNumber: merchantOrderId,
      paymentUrl: transaction.paymentUrl,
    }).catch(e => console.error('Email error:', e));

    return NextResponse.json({
      success: true,
      data: {
        invoiceNumber: merchantOrderId,
        amount: totalAmount,
        paymentUrl: transaction.paymentUrl,
        reference: transaction.reference,
        vaNumber: transaction.vaNumber,
        qrString: transaction.qrString,
        paymentMethod: paymentMethod.name,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error: any) {
    console.error("[RESELLER_API_DEPOSIT]", error);
    return apiError("Internal server error", 500);
  }
}
