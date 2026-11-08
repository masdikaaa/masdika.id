import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { encryptDeterministic, decryptDeterministic } from "@/lib/encryption";

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const comments = await prisma.mediaComment.findMany({
      where: {
        media: {
          userId: auth.userId,
        },
      },
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
      where: {
        media: {
          userId: auth.userId,
        },
      },
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

    const resolvedRatings = ratings.map((r) => ({
      ...r,
      userEmail: r.userEmail?.toLowerCase().trim() || null,
    }));

    // Pre-resolve avatars and names for registered users
    const plainEmails = [
      ...comments.map((c) => c.email.toLowerCase().trim()),
      ...resolvedRatings.filter((r) => r.userEmail).map((r) => r.userEmail!.toLowerCase().trim()),
    ];
    const encryptedEmails = plainEmails.map((e) => encryptDeterministic(e));
    const allEmailLookups = Array.from(new Set([...plainEmails, ...encryptedEmails]));
    const registeredUsers = await prisma.user.findMany({
      where: {
        email: { in: allEmailLookups },
      },
      select: { email: true, name: true, image: true },
    });

    const userImageMap = new Map<string, string>();
    const userNameMap = new Map<string, string>();
    for (const u of registeredUsers) {
      const dec = decryptDeterministic(u.email) || u.email;
      const lower = dec.toLowerCase().trim();
      const enc = encryptDeterministic(lower);
      if (u.image) {
        userImageMap.set(lower, u.image);
        userImageMap.set(enc, u.image);
      }
      if (u.name) {
        const nameDec = decryptDeterministic(u.name) || u.name;
        userNameMap.set(lower, nameDec);
        userNameMap.set(enc, nameDec);
      }
    }

    const mappedComments = comments.map((c) => {
      const lower = c.email.toLowerCase().trim();
      const enc = encryptDeterministic(lower);
      const customAvatar = userImageMap.get(enc) || userImageMap.get(lower);
      const resolvedName = userNameMap.get(enc) || userNameMap.get(lower);
      const avatar = customAvatar || `/api/avatar?email=${encodeURIComponent(c.email)}&name=${encodeURIComponent(resolvedName || c.name)}&v=4`;
      return { ...c, name: resolvedName || c.name, avatar };
    });

    const mappedRatings = resolvedRatings.map((r) => {
      const email = r.userEmail?.toLowerCase().trim() || "";
      const enc = email ? encryptDeterministic(email) : "";
      const customAvatar = enc ? (userImageMap.get(enc) || userImageMap.get(email)) : null;
      const resolvedName = enc ? (userNameMap.get(enc) || userNameMap.get(email)) : null;
      const avatar = customAvatar || (email ? `/api/avatar?email=${encodeURIComponent(email)}&name=${encodeURIComponent(resolvedName || "User")}&v=4` : null);
      return {
        ...r,
        userName: resolvedName || null,
        avatar,
      };
    });

    // Compute user-isolated media review metrics
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
    console.error("User CDN reviews error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    const ratingId = searchParams.get("ratingId");

    if (commentId) {
      const comment = await prisma.mediaComment.findUnique({
        where: { id: parseInt(commentId, 10) },
        include: { media: { select: { userId: true } } },
      });

      if (!comment || comment.media.userId !== auth.userId) {
        return NextResponse.json(
          { error: "Comment not found or you are not authorized to moderate this item" },
          { status: 403 }
        );
      }

      await prisma.mediaComment.delete({
        where: { id: comment.id },
      });
      return NextResponse.json({ success: true, message: "Comment deleted successfully" });
    }

    if (ratingId) {
      const rating = await prisma.mediaRating.findUnique({
        where: { id: parseInt(ratingId, 10) },
        include: { media: { select: { userId: true } } },
      });

      if (!rating || rating.media.userId !== auth.userId) {
        return NextResponse.json(
          { error: "Rating not found or you are not authorized to moderate this item" },
          { status: 403 }
        );
      }

      await prisma.mediaRating.delete({
        where: { id: rating.id },
      });
      return NextResponse.json({ success: true, message: "Rating deleted successfully" });
    }

    return NextResponse.json({ error: "Missing commentId or ratingId" }, { status: 400 });
  } catch (error) {
    console.error("Delete user CDN review error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
