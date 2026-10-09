import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { requireAuth } from "@/lib/auth-middleware";
import { createDuitkuTransaction } from "@/lib/duitku";
import { sendCustomerInvoiceEmail } from "@/lib/email";

function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TOPUP-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  console.log("[TOPUP API] Request received");
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
    
    console.log("[TOPUP API] Reading body...");
    const body = await req.json();
    console.log("[TOPUP API] Body read:", body);
    
    const amount = Number(body.amount);
    const paymentMethodCode = body.paymentMethodCode;
    const voucherCode = body.voucherCode;

    const MAX_TOPUP = 50000000; // Rp 50.000.000
    if (!amount || isNaN(amount) || !paymentMethodCode || amount < 50000 || amount > MAX_TOPUP) {
      return NextResponse.json({ error: "Invalid amount or missing fields. Minimum top up is Rp 50.000 and max is Rp50.000.000" }, { status: 400 });
    }

    const paymentMethod = await prisma.paymentMethod.findUnique({ where: { code: paymentMethodCode } });
    if (!paymentMethod || !paymentMethod.isActive) {
      return NextResponse.json({ error: "Invalid or inactive payment method" }, { status: 400 });
    }

    const taxRateSetting = await prisma.setting.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxRateSetting && !isNaN(Number(taxRateSetting.value)) ? Number(taxRateSetting.value) : 0;

    let discountAmount = 0;
    let appliedVoucherCode = null;

    if (voucherCode) {
      try {
        await prisma.$transaction(async (tx) => {
          const voucher = await tx.voucher.findUnique({ where: { code: voucherCode.toUpperCase() } });
          if (!voucher || !voucher.isActive) throw new Error("INVALID");
          if (voucher.validUntil && voucher.validUntil < new Date()) throw new Error("EXPIRED");

          const usageCount = await tx.voucherUsage.count({
            where: { userId, voucherId: voucher.id }
          });
          if (usageCount > 0) throw new Error("ALREADY_USED");

          if (voucher.maxUses > 0) {
            const updated = await tx.voucher.updateMany({
              where: { id: voucher.id, currentUses: { lt: voucher.maxUses } },
              data: { currentUses: { increment: 1 } }
            });
            if (updated.count === 0) throw new Error("LIMIT_REACHED");
          } else {
            await tx.voucher.update({
              where: { id: voucher.id },
              data: { currentUses: { increment: 1 } }
            });
          }
          
          await tx.voucherUsage.create({
            data: {
              userId,
              voucherId: voucher.id
            }
          });
          
          discountAmount = Math.floor(amount * (voucher.discountPercent / 100));
          appliedVoucherCode = voucher.code;
        });
      } catch (err: any) {
        let errorMsg = "Voucher has been fully claimed or is no longer valid.";
        if (err.message === "ALREADY_USED") errorMsg = "You have already used this voucher code.";
        if (err.message === "EXPIRED") errorMsg = "Voucher code has expired.";
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }
    }

    const fee = paymentMethod.fee || 0;
    const subtotal = amount;
    const paymentSubtotal = Math.max(0, amount - discountAmount);
    const taxAmount = Math.floor(paymentSubtotal * (taxRate / 100));
    const totalAmount = paymentSubtotal + taxAmount + fee;

    const merchantOrderId = generateOrderId();

    let detailsJson = null;
    if (appliedVoucherCode) {
      detailsJson = JSON.stringify({ voucherCode: appliedVoucherCode, discountAmount });
    }

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
        details: detailsJson
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    let transaction;
    try {
      console.log("[TOPUP API] Calling createDuitkuTransaction...");
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
          ...(discountAmount > 0 ? [{
            name: `Voucher Discount (${appliedVoucherCode})`,
            price: -discountAmount,
            quantity: 1
          }] : []),
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
      console.log("[TOPUP API] Duitku response received");
    } catch (duitkuError) {
      console.error("Duitku Transaction Failed for topup, rolling back...", duitkuError);
      await prisma.invoice.delete({ where: { id: invoice.id } });
      if (appliedVoucherCode) {
        await prisma.voucher.update({ where: { code: appliedVoucherCode }, data: { currentUses: { decrement: 1 } } }).catch(console.error);
      }
      return NextResponse.json({ error: "Failed to connect to payment gateway. Please check your payment method and try again." }, { status: 500 });
    }

    if (!transaction || !transaction.paymentUrl) {
      await prisma.invoice.delete({ where: { id: invoice.id } });
      if (appliedVoucherCode) {
        await prisma.voucher.update({ where: { code: appliedVoucherCode }, data: { currentUses: { decrement: 1 } } }).catch(console.error);
      }
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
