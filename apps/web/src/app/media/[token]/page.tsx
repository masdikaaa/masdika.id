import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import MediaClient, { MediaInfo, MediaStatus } from "./MediaClient";

async function getMediaData(token: string): Promise<{ status: MediaStatus; media: MediaInfo | null }> {
  // UUID validation
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) {
    return { status: "notfound", media: null };
  }

  try {
    const media = await prisma.secureMedia.findUnique({
      where: { token },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        expiresAt: true,
        token: true,
        isPublic: true,
        userId: true,
      },
    });

    if (!media) {
      return { status: "notfound", media: null };
    }

    if (!media.isPublic) {
      let isAuthorized = false;
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("admin_session")?.value;
      if (sessionToken) {
        const userId = verifySessionToken(sessionToken);
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
          });
          if (user && (user.role === "ADMIN" || user.id === media.userId)) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return { status: "private", media: null };
      }
    }

    if (media.expiresAt && media.expiresAt < new Date()) {
      return { status: "expired", media: null };
    }

    const initialMedia: MediaInfo = {
      id: media.id,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      expiresAt: media.expiresAt ? media.expiresAt.toISOString() : null,
      token: media.token,
      isPublic: media.isPublic,
    };

    return { status: "ok", media: initialMedia };
  } catch (error) {
    console.error("PublicMediaPage getMediaData Error:", error);
    return { status: "error", media: null };
  }
}

export default async function PublicMediaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { status, media } = await getMediaData(token);

  return <MediaClient token={token} initialStatus={status} initialMedia={media} />;
}
