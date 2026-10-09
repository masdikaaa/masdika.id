import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from '@/lib/get-ip';
import { prisma } from "@/lib/prisma";
import { encryptDeterministic, hashPassword } from "@/lib/encryption";
import { sendRegistrationOtpEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    
    // Max 5 registrations per IP per hour
    if (!(await checkRateLimit('REGISTER', ip, 5, 3600))) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    const { name, email, password, ref, turnstileToken, _hp, _ts, companyName, phone, address1, address2, city, state, postalCode, country } = await req.json();

    // Turnstile Verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'Please complete the captcha verification.' }, { status: 400 });
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}&remoteip=${encodeURIComponent(ip)}`
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: 'Failed captcha verification. Please try again.' }, { status: 400 });
      }
    }

    // Honeypot: bots fill hidden fields, humans don't
    if (_hp) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Timing check: block submissions faster than 2 seconds (bots)
    if (_ts && Date.now() - _ts < 2000) {
      return NextResponse.json({ error: 'Please slow down.' }, { status: 400 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json({ error: "Name must be between 3 and 50 characters" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    // Validate required billing fields
    if (!phone || !address1 || !city || !state || !postalCode || !country) {
      return NextResponse.json({ error: "Please complete all required billing information." }, { status: 400 });
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return NextResponse.json({ error: "Phone number is invalid" }, { status: 400 });
    }

    const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

    const existingUser = await prisma.user.findUnique({ where: { email: encryptedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
    }

    // Generate 6-digit OTP using cryptographically secure random
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const hashedPassword = hashPassword(password);

    // Save pending registration
    await prisma.registrationOtp.upsert({
      where: { email: encryptedEmail },
      update: {
        name,
        password: hashedPassword,
        code: otpCode,
        referralCode: ref || null,
        expiresAt,
        companyName: companyName || null,
        phone,
        address1,
        address2: address2 || null,
        city,
        state,
        postalCode,
        country,
      },
      create: {
        email: encryptedEmail,
        name,
        password: hashedPassword,
        code: otpCode,
        referralCode: ref || null,
        expiresAt,
        companyName: companyName || null,
        phone,
        address1,
        address2: address2 || null,
        city,
        state,
        postalCode,
        country,
      }
    });

    // Send OTP email
    await sendRegistrationOtpEmail(email, name, otpCode);

    return NextResponse.json({ success: true, requiresOtp: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
