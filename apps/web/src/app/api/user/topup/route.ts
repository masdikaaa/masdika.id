import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { requireAuth } from "@/lib/auth-middleware";
import { createDuitkuTransaction } from "@/lib/duitku";
import { sendCustomerInvoiceEmail } from "@/lib/email";

const MAX_WALLET_BALANCE = 2_000_000_000;

function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TOPUP-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;
    const rawEmail = auth.user!.email || '';
    const decryptedEmailVal = decryptDeterministic(rawEmail);
    const userEmail = (decryptedEmailVal && decryptedEmailVal.includes('@')) ? decryptedEmailVal : (rawEmail.includes('@') ? rawEmail : 'customer@masdika.id');
    const rawName = auth.user!.name || '';
    const decryptedName = decryptDeterministic(rawName);
    const userName = decryptedName || rawName || 'Customer';
    
    const body = await req.json();
    
    const amount = Number(body.amount);
    const paymentMethodCode = body.paymentMethodCode;
    const voucherCode = body.voucherCode;

    if (voucherCode && String(voucherCode).trim().length > 0) {
      return NextResponse.json(
        { error: "Discount vouchers cannot be applied to wallet top-ups." },
        { status: 400 }
      );
    }

    const MAX_TOPUP = 50000000; // Rp 50.000.000
    const MIN_TOPUP = 10000;    // Rp 10.000

    if (
      !Number.isSafeInteger(amount) ||
      amount < MIN_TOPUP ||
      amount > MAX_TOPUP
    ) {
      return NextResponse.json({ error: "Invalid amount. Minimum top up is Rp 10.000 and max is Rp 50.000.000 (must be an integer)" }, { status: 400 });
    }

    if ((auth.user!.balance || 0) + amount > MAX_WALLET_BALANCE) {
      return NextResponse.json({ error: "Maximum wallet balance limit (Rp 2.000.000.000) exceeded." }, { status: 400 });
    }

    if (!paymentMethodCode || typeof paymentMethodCode !== 'string') {
      return NextResponse.json({ error: "Payment method is required" }, { status: 400 });
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        code: { equals: String(paymentMethodCode).trim(), mode: 'insensitive' },
        isActive: true
      }
    });
    if (!paymentMethod) {
      return NextResponse.json({ error: "Invalid or inactive payment method" }, { status: 400 });
    }

    const taxRateSetting = await prisma.setting.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxRateSetting && !isNaN(Number(taxRateSetting.value)) ? Math.max(0, Number(taxRateSetting.value)) : 0;

    const fee = Math.max(0, paymentMethod.fee || 0);
    const subtotal = amount;
    const paymentSubtotal = amount;
    const taxAmount = Math.floor(paymentSubtotal * (taxRate / 100));
    const totalAmount = paymentSubtotal + taxAmount + fee;

    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0 || totalAmount > MAX_WALLET_BALANCE) {
      return NextResponse.json({ error: "Calculated invoice total is out of range." }, { status: 400 });
    }

    const merchantOrderId = generateOrderId();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: merchantOrderId,
        userId,
        subtotal,
        taxRate,
        taxAmount,
        amount: totalAmount,
        status: 'PENDING',
        paymentMethod: paymentMethod.name,
        merchantOrderId: merchantOrderId,
        type: 'TOP_UP',
        details: null
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.masdika.id';
    
    let transaction;
    try {
      transaction = await createDuitkuTransaction({
        paymentAmount: totalAmount,
        merchantOrderId,
        productDetails: `Account Balance Top Up`,
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
      console.error("Duitku Transaction Failed for topup, rolling back...", duitkuError);
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
      return NextResponse.json({ error: "Failed to connect to payment gateway. Please check your payment method and try again." }, { status: 500 });
    }

    if (!transaction || !transaction.paymentUrl) {
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
      return NextResponse.json({ error: "Failed to generate payment gateway link for top up" }, { status: 500 });
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
      paymentUrl: transaction.paymentUrl,
      reference: transaction.reference
    });
  } catch (error) {
    console.error("Top-Up Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
