import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { encryptDeterministic, decryptDeterministic } from "@/lib/encryption";

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const comments = await prisma.mediaComment.findMany({
      include: {
        media: {
          select: {
            id: true,
            originalName: true,
            token: true,
            mimeType: true,
            size: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ratings = await prisma.mediaRating.findMany({
      include: {
        media: {
          select: {
            id: true,
            originalName: true,
            token: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Pre-resolve avatars for registered users (Google/custom image) or fallback to /api/avatar
    const plainEmails = [
      ...comments.map((c) => c.email.toLowerCase().trim()),
      ...ratings.filter((r) => r.userEmail).map((r) => r.userEmail!.toLowerCase().trim()),
    ];
    const encryptedEmails = plainEmails.map((e) => encryptDeterministic(e));
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

    const mappedComments = comments.map((c) => {
      const lower = c.email.toLowerCase().trim();
      const enc = encryptDeterministic(lower);
      const customAvatar = userImageMap.get(enc) || userImageMap.get(lower);
      const avatar = customAvatar || `/api/avatar?email=${encodeURIComponent(c.email)}&name=${encodeURIComponent(c.name)}&v=4`;
      return { ...c, avatar };
    });

    const mappedRatings = ratings.map((r) => {
      const email = r.userEmail?.toLowerCase().trim() || "";
      const enc = email ? encryptDeterministic(email) : "";
      const customAvatar = enc ? (userImageMap.get(enc) || userImageMap.get(email)) : null;
      const avatar = customAvatar || (email ? `/api/avatar?email=${encodeURIComponent(email)}&name=User&v=4` : null);
      return { ...r, avatar };
    });

    // Compute platform media metrics
    const totalComments = comments.length;
    const totalRatings = ratings.length;
    const totalRatingSum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = totalRatings > 0 ? parseFloat((totalRatingSum / totalRatings).toFixed(2)) : 0;

    const uniqueMediaIds = new Set([
      ...comments.map((c) => c.mediaId),
      ...ratings.map((r) => r.mediaId),
    ]);

    return NextResponse.json({
      comments: mappedComments,
      ratings: mappedRatings,
      stats: {
        totalComments,
        totalRatings,
        averageRating,
        totalMediaReviewed: uniqueMediaIds.size,
      },
    });
  } catch (error) {
    console.error("Admin media reviews error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    const ratingId = searchParams.get("ratingId");

    if (commentId) {
      await prisma.mediaComment.delete({
        where: { id: parseInt(commentId, 10) },
      });
      return NextResponse.json({ success: true, message: "Comment deleted successfully" });
    }

    if (ratingId) {
      await prisma.mediaRating.delete({
        where: { id: parseInt(ratingId, 10) },
      });
      return NextResponse.json({ success: true, message: "Rating deleted successfully" });
    }

    return NextResponse.json({ error: "Missing commentId or ratingId" }, { status: 400 });
  } catch (error) {
    console.error("Delete media review error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
