import { NextRequest, NextResponse } from "next/server";
import { getClientIp, getIpVariants } from "@/lib/get-ip";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendAdminMediaNotificationEmail } from "@/lib/email";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { decryptDeterministic } from "@/lib/encryption";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    let emailParam = req.nextUrl.searchParams.get("email");

    // Auto-detect logged-in customer session for GET if emailParam not provided
    if (!emailParam) {
      try {
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get("admin_session")?.value;
        if (tokenCookie) {
          const userId = verifySessionToken(tokenCookie);
          if (userId) {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { email: true },
            });
            if (user?.email) {
              try {
                emailParam = (decryptDeterministic(user.email) || user.email).toLowerCase().trim();
              } catch {
                emailParam = user.email.toLowerCase().trim();
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const ratings = await prisma.mediaRating.findMany({
      where: { mediaId: media.id },
      select: { rating: true, ipAddress: true, userEmail: true },
    });

    const totalRatings = ratings.length;
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    let userRating: number | null = null;

    for (const r of ratings) {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
        sum += r.rating;
      }
      if (emailParam && r.userEmail && r.userEmail.toLowerCase() === emailParam.toLowerCase()) {
        userRating = r.rating;
      } else if (!userRating && r.ipAddress && ipVariants.includes(r.ipAddress)) {
        userRating = r.rating;
      }
    }

    // Cross-check: If user hasn't rated directly but gave a rating inside a comment
    if (!userRating) {
      const commentWithRating = await prisma.mediaComment.findFirst({
        where: {
          mediaId: media.id,
          rating: { not: null },
          OR: [
            { ipAddress: { in: ipVariants } },
            ...(emailParam ? [{ email: emailParam.toLowerCase() }] : []),
          ],
        },
        select: { rating: true },
      });
      if (commentWithRating?.rating) {
        userRating = commentWithRating.rating;
      }
    }

    const averageRating = totalRatings > 0 ? parseFloat((sum / totalRatings).toFixed(1)) : 0;

    return NextResponse.json({
      averageRating,
      totalRatings,
      ratingCounts,
      userRating,
      hasRated: userRating !== null,
    });
  } catch (error) {
    console.error("Get rating error:", error);
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
    const allowed = await checkRateLimit("MEDIA_RATE", ip, 30, 60);
    if (!allowed) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }

    const media = await prisma.secureMedia.findUnique({
      where: { token },
      select: { id: true, originalName: true, token: true },
    });
    if (!media) return new NextResponse("Not Found", { status: 404 });

    const body = await req.json().catch(() => null);
    const ratingVal = Number(body?.rating);
    let email = body?.email ? String(body.email).trim().toLowerCase() : null;

    // 1. Auto-detect logged-in customer session
    if (!email) {
      try {
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get("admin_session")?.value;
        if (tokenCookie) {
          const userId = verifySessionToken(tokenCookie);
          if (userId) {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { email: true },
            });
            if (user?.email) {
              try {
                email = (decryptDeterministic(user.email) || user.email).toLowerCase().trim();
              } catch {
                email = user.email.toLowerCase().trim();
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Fallback: Auto-associate with customer from loginLog if IP matches a known login
    if (!email && ip !== "unknown") {
      try {
        const recentLogin = await prisma.loginLog.findFirst({
          where: { ipAddress: ip, success: true },
          orderBy: { createdAt: "desc" },
        });
        if (recentLogin?.emailAttempt && recentLogin.emailAttempt !== "unknown") {
          email = recentLogin.emailAttempt.toLowerCase().trim();
        }
      } catch {
        // ignore
      }
    }

    if (!ratingVal || ratingVal < 1 || ratingVal > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Strict Anti-Abuse: Check if rating already exists by email or IP variants
    const existingRating = await prisma.mediaRating.findFirst({
      where: {
        mediaId: media.id,
        OR: [
          { ipAddress: { in: ipVariants } },
          ...(email ? [{ userEmail: email }] : []),
        ],
      },
    });

    // Also check if already rated via verified comment
    const existingCommentRating = await prisma.mediaComment.findFirst({
      where: {
        mediaId: media.id,
        rating: { not: null },
        OR: [
          { ipAddress: { in: ipVariants } },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingRating || existingCommentRating) {
      return NextResponse.json(
        { error: "You have already submitted a rating for this media. Each user/IP is limited to 1 rating." },
        { status: 409 }
      );
    }

    await prisma.mediaRating.create({
      data: {
        mediaId: media.id,
        rating: ratingVal,
        ipAddress: ip,
        userEmail: email,
      },
    });

    // Recalculate summary
    const allRatings = await prisma.mediaRating.findMany({
      where: { mediaId: media.id },
      select: { rating: true },
    });
    const totalRatings = allRatings.length;
    const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = totalRatings > 0 ? parseFloat((sum / totalRatings).toFixed(1)) : ratingVal;

    // Send email notification to admin asynchronously
    sendAdminMediaNotificationEmail({
      type: "rating",
      fileName: media.originalName,
      mediaToken: media.token,
      authorEmail: email || undefined,
      rating: ratingVal,
    }).catch((err) => console.error("Admin rating notification error:", err));

    return NextResponse.json({
      success: true,
      userRating: ratingVal,
      averageRating,
      totalRatings,
    });
  } catch (error) {
    console.error("Submit rating error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
