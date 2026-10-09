import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptDeterministic } from "@/lib/encryption";
import { getClientIp } from "@/lib/get-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const MAX_OTP_ATTEMPTS = 5; // Max wrong OTP attempts before invalidating registration

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit: 10 OTP verification attempts per 15 minutes per IP
    if (!(await checkRateLimit('VERIFY_OTP', ip, 10, 900))) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }

    // Validate OTP format (must be exactly 6 digits)
    const codeStr = String(code).trim();
    if (!/^\d{6}$/.test(codeStr)) {
      return NextResponse.json({ error: "Invalid OTP format" }, { status: 400 });
    }

    const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

    // Find pending registration
    const pendingRegistration = await prisma.registrationOtp.findUnique({
      where: { email: encryptedEmail }
    });

    if (!pendingRegistration) {
      return NextResponse.json({ error: "No pending registration found" }, { status: 400 });
    }

    // Check expiration BEFORE checking code (don't leak valid codes for expired OTPs)
    if (new Date() > pendingRegistration.expiresAt) {
      // Clean up expired registration
      await prisma.registrationOtp.delete({ where: { email: encryptedEmail } }).catch(() => {});
      return NextResponse.json({ error: "OTP code has expired. Please try registering again." }, { status: 400 });
    }

    // Check OTP attempt count — auto-invalidate after too many wrong attempts
    const attempts = pendingRegistration.attempts ?? 0;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      // Delete the registration to force re-register with new OTP
      await prisma.registrationOtp.delete({ where: { email: encryptedEmail } }).catch(() => {});
      return NextResponse.json(
        { error: "Too many invalid attempts. Please register again to get a new OTP code." },
        { status: 400 }
      );
    }

    // Verify OTP code
    if (pendingRegistration.code !== codeStr) {
      // Increment attempt counter
      await prisma.registrationOtp.update({
        where: { email: encryptedEmail },
        data: { attempts: { increment: 1 } }
      }).catch(() => {});

      const remaining = MAX_OTP_ATTEMPTS - attempts - 1;
      return NextResponse.json(
        { error: `Invalid OTP code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
        { status: 400 }
      );
    }

    // Handle referral code
    let referredById = null;
    if (pendingRegistration.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: pendingRegistration.referralCode }
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Generate unique referral code for new user
    let newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.user.findUnique({ where: { referralCode: newReferralCode } });
      if (!existing) isUnique = true;
      else newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: pendingRegistration.name,
        email: pendingRegistration.email,
        password: pendingRegistration.password,
        role: "USER",
        referralCode: newReferralCode,
        referredById: referredById,
        companyName: pendingRegistration.companyName || null,
        phone: pendingRegistration.phone || null,
        address1: pendingRegistration.address1 || null,
        address2: pendingRegistration.address2 || null,
        city: pendingRegistration.city || null,
        state: pendingRegistration.state || null,
        postalCode: pendingRegistration.postalCode || null,
        country: pendingRegistration.country || null,
      }
    });

    // Delete pending registration
    await prisma.registrationOtp.delete({
      where: { email: encryptedEmail }
    });

    return NextResponse.json({ success: true, message: "Registration successful" });
  } catch (error) {
    console.error("Verify registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
