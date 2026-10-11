import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/get-ip";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_EMOJIS = new Set(["👍", "❤️", "🔥", "👏", "💡", "😂", "🚀", "🎉"]);

export async function POST(
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

    const body = await req.json().catch(() => null);
    const commentId = Number(body?.commentId);
    const emoji = String(body?.emoji || "").trim();

    if (!commentId || isNaN(commentId)) {
      return NextResponse.json({ error: "Invalid comment ID." }, { status: 400 });
    }

    if (!ALLOWED_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: "Unsupported emoji reaction." }, { status: 400 });
    }

    // Ensure comment belongs to this media
    const comment = await prisma.mediaComment.findUnique({
      where: { id: commentId },
      select: { id: true, mediaId: true },
    });
    if (!comment || comment.mediaId !== media.id) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    const ip = getClientIp(req);
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

    // Check if reaction already exists
    const existing = await prisma.mediaCommentReaction.findUnique({
      where: {
        commentId_emoji_ipHash: {
          commentId,
          emoji,
          ipHash,
        },
      },
    });

    let action: "added" | "removed" = "added";
    if (existing) {
      await prisma.mediaCommentReaction.delete({
        where: { id: existing.id },
      });
      action = "removed";
    } else {
      await prisma.mediaCommentReaction.create({
        data: {
          commentId,
          emoji,
          ipHash,
        },
      });
      action = "added";
    }

    // Query updated reactions for this comment
    const allReactions = await prisma.mediaCommentReaction.findMany({
      where: { commentId },
      select: { emoji: true, ipHash: true },
    });

    const reactionMap: Record<string, { count: number; hasReacted: boolean }> = {};
    for (const r of allReactions) {
      if (!reactionMap[r.emoji]) {
        reactionMap[r.emoji] = { count: 0, hasReacted: false };
      }
      reactionMap[r.emoji].count += 1;
      if (r.ipHash === ipHash) {
        reactionMap[r.emoji].hasReacted = true;
      }
    }

    const reactions = Object.entries(reactionMap).map(([em, data]) => ({
      emoji: em,
      count: data.count,
      hasReacted: data.hasReacted,
    }));

    return NextResponse.json({
      success: true,
      action,
      reactions,
    });
  } catch (error) {
    console.error("Reaction toggle error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
