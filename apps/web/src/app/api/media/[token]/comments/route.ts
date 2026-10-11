import { NextRequest, NextResponse } from "next/server";
import { getClientIp, getIpVariants } from "@/lib/get-ip";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendAdminMediaNotificationEmail } from "@/lib/email";
import { encryptDeterministic, decryptDeterministic } from "@/lib/encryption";
import crypto from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!UUID_RE.test(token)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const media = await prisma.secureMedia.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!media) return new NextResponse("Not Found", { status: 404 });

    const ip = getClientIp(req);
    const ipVariants = getIpVariants(ip);
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
    const emailParam = req.nextUrl.searchParams.get("email");

    const rawComments = await prisma.mediaComment.findMany({
      where: { mediaId: media.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        content: true,
        rating: true,
        isVerified: true,
        createdAt: true,
        reactions: {
          select: {
            emoji: true,
            ipHash: true,
          },
        },
      },
    });

    // Resolve user avatars for registered accounts (e.g. Google profile pictures)
    const plainEmails = rawComments.map((c) => c.email.toLowerCase().trim());
    const encryptedEmails = rawComments.map((c) => encryptDeterministic(c.email.toLowerCase().trim()));
    const allEmailLookups = Array.from(new Set([...plainEmails, ...encryptedEmails]));
    const registeredUsers = await prisma.user.findMany({
      where: {
        email: { in: allEmailLookups },
      },
      select: { email: true, image: true },
    });
    const userImageMap = new Map<string, string>();
    for (const u of registeredUsers) {
      if (u.image) {
        userImageMap.set(u.email.toLowerCase().trim(), u.image);
        try {
          const dec = decryptDeterministic(u.email);
          if (dec) userImageMap.set(dec.toLowerCase().trim(), u.image);
          const enc = encryptDeterministic(u.email);
          if (enc) userImageMap.set(enc, u.image);
        } catch {
          // ignore
        }
      }
    }

    const comments = rawComments.map((c) => {
      const reactionMap: Record<string, { count: number; hasReacted: boolean }> = {};
      for (const r of c.reactions) {
        if (!reactionMap[r.emoji]) {
          reactionMap[r.emoji] = { count: 0, hasReacted: false };
        }
        reactionMap[r.emoji].count += 1;
        if (r.ipHash === ipHash) {
          reactionMap[r.emoji].hasReacted = true;
        }
      }

      const lower = c.email.toLowerCase().trim();
      const encEmail = encryptDeterministic(lower);
      const customAvatar = userImageMap.get(encEmail) || userImageMap.get(lower);
      const avatar = customAvatar || `/api/avatar?email=${encodeURIComponent(c.email)}&name=${encodeURIComponent(c.name)}&v=4`;

      return {
        id: c.id,
        name: c.name,
        avatar,
        content: c.content,
        rating: c.rating,
        isVerified: c.isVerified,
        createdAt: c.createdAt,
        reactions: Object.entries(reactionMap).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          hasReacted: data.hasReacted,
        })),
      };
    });

    const existingComment = await prisma.mediaComment.findFirst({
      where: {
        mediaId: media.id,
        OR: [
          { ipAddress: { in: ipVariants } },
          ...(emailParam ? [{ email: emailParam.toLowerCase().trim() }] : []),
        ],
      },
      select: { id: true },
    });

    return NextResponse.json({
      comments,
      total: comments.length,
      hasCommented: !!existingComment,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

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
    const allowed = await checkRateLimit("MEDIA_COMMENT", ip, 20, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many comments submitted. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const media = await prisma.secureMedia.findUnique({
      where: { token },
      select: { id: true, originalName: true, token: true },
    });
    if (!media) return new NextResponse("Not Found", { status: 404 });

    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const content = String(body?.content || "").trim();
    const otp = String(body?.otp || "").trim();
    const ratingVal = body?.rating ? Number(body.rating) : null;

    // Anti-spoofing guard
    if (email.endsWith("@masdika.id") || email.endsWith(".masdika.id")) {
      return NextResponse.json(
        { error: "Official @masdika.id email addresses cannot be used for public comments to prevent impersonation." },
        { status: 403 }
      );
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

    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: "Name must be between 2 and 60 characters." }, { status: 400 });
    }

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
    }

    if (!content || content.length < 2 || content.length > 2000) {
      return NextResponse.json({ error: "Comment must be between 2 and 2000 characters." }, { status: 400 });
    }

    // HTML sanitization to prevent stored XSS
    const cleanName = name.replace(/[<>]/g, "");
    const cleanContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "A 6-digit OTP code is required for email verification." }, { status: 400 });
    }

    // Verify OTP in MediaOtp table
    const otpRecord = await prisma.mediaOtp.findFirst({
      where: {
        email,
        code: otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired OTP code. Please request a new code." },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await prisma.mediaOtp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Strict 1 rating rule: Check if rating already exists by email or IP variants
    let finalRating: number | null = null;
    const existingRating = await prisma.mediaRating.findFirst({
      where: {
        mediaId: media.id,
        OR: [
          { ipAddress: { in: ipVariants } },
          { userEmail: email },
        ],
      },
    });

    if (existingRating) {
      // User has already rated once — keep their existing rating, never duplicate
      finalRating = existingRating.rating;
    } else if (ratingVal && ratingVal >= 1 && ratingVal <= 5) {
      // Record their 1 allowed rating
      await prisma.mediaRating.create({
        data: {
          mediaId: media.id,
          rating: ratingVal,
          userEmail: email,
          ipAddress: ip,
        },
      });
      finalRating = ratingVal;
    }

    // Create verified comment
    const comment = await prisma.mediaComment.create({
      data: {
        mediaId: media.id,
        name: cleanName,
        email,
        content: cleanContent,
        rating: finalRating,
        ipAddress: ip,
        isVerified: true,
      },
      select: {
        id: true,
        name: true,
        content: true,
        rating: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Send email notification to admin asynchronously
    sendAdminMediaNotificationEmail({
      type: "comment",
      fileName: media.originalName,
      mediaToken: media.token,
      authorName: cleanName,
      authorEmail: email,
      rating: finalRating || undefined,
      content: content,
    }).catch((err) => console.error("Admin comment notification error:", err));

    const cleanEmail = email.toLowerCase().trim();
    const encEmail = encryptDeterministic(cleanEmail);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: encEmail },
          { email: cleanEmail },
        ],
      },
      select: { image: true },
    });
    const avatar = existingUser?.image || `/api/avatar?email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(cleanName)}&v=4`;

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        avatar,
        reactions: [],
      },
      message: "Comment successfully verified and published!",
    });
  } catch (error) {
    console.error("Post comment error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
