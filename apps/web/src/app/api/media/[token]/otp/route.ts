import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getClientIp, getIpVariants } from "@/lib/get-ip";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendMediaCommentOtpEmail } from "@/lib/email";
import { requireAuth } from "@/lib/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!UUID_RE.test(token)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const ip = getClientIp(req);
    const ipVariants = getIpVariants(ip);
    // Anti-abuse: max 5 OTP requests per IP per 10 minutes
    const allowed = await checkRateLimit("MEDIA_OTP", ip, 5, 600);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait a few moments before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const email = body?.email ? String(body.email).trim().toLowerCase() : "";

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
    }

    const emailAllowed = await checkRateLimit("MEDIA_OTP_EMAIL", email, 3, 600);
    if (!emailAllowed) {
      return NextResponse.json(
        { error: "Too many OTP requests for this email. Please wait before trying again." },
        { status: 429 }
      );
    }

    // Anti-spoofing guard: Disallow using official domain for public comments
    if (email.endsWith("@masdika.id") || email.endsWith(".masdika.id")) {
      return NextResponse.json(
        { error: "Official @masdika.id email addresses cannot be used for public comments to prevent impersonation." },
        { status: 403 }
      );
    }

    // Verify media exists, is not expired, and is accessible
    const media = await prisma.secureMedia.findUnique({
      where: { token },
      select: { id: true, originalName: true, isPublic: true, userId: true, expiresAt: true },
    });
    if (!media) return new NextResponse("Not Found", { status: 404 });
    if (media.expiresAt && media.expiresAt < new Date()) {
      return new NextResponse("Link has expired", { status: 410 });
    }
    if (!media.isPublic) {
      const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
      const isAuthorized =
        !auth.error &&
        auth.user &&
        (auth.user.role === "ADMIN" || auth.user.role === "SUPER_ADMIN" || auth.user.id === media.userId);
      if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden: This file is private" }, { status: 403 });
      }
    }

    // Strict Anti-Spam: 1 comment per person/IP per media
    const existingComment = await prisma.mediaComment.findFirst({
      where: {
        mediaId: media.id,
        OR: [
          { ipAddress: { in: ipVariants } },
          { email },
        ],
      },
    });
    if (existingComment) {
      return NextResponse.json(
        { error: "You have already submitted a comment for this media. Each user/IP is limited to 1 comment." },
        { status: 409 }
      );
    }

    // Generate cryptographically secure 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any older unused OTPs for this email
    await prisma.mediaOtp.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    // Create new OTP record
    await prisma.mediaOtp.create({
      data: {
        email,
        code: otpCode,
        expiresAt,
        used: false,
      },
    });

    // Send email
    try {
      await sendMediaCommentOtpEmail(email, otpCode, media.originalName);
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr);
      return NextResponse.json(
        { error: "Failed to send OTP email. Please ensure your email is correct or try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification OTP code has been sent to ${email}`,
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
