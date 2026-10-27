import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/user/vps/[id]/cloud-backups/gdrive/authorize
// Redirects user to Google OAuth2 consent screen for Personal Google Drive authorization
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
      return NextResponse.redirect(new URL("/login", baseUrl));
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google OAuth is not configured on this server. Missing GOOGLE_CLIENT_ID." }, { status: 500 });
    }

    // Determine redirectUri using NEXT_PUBLIC_APP_URL or current request origin without trailing slash
    const rawOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const baseUrl = rawOrigin.replace(/\/+$/, "");
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // State payload encodes the VPS ID, User ID, timestamp, and exact redirectUri
    const statePayload = {
      action: "gdrive_connect",
      vpsId: vps.id,
      userId: auth.userId,
      redirectUri,
      ts: Date.now()
    };
    const state = `gdrive_${Buffer.from(JSON.stringify(statePayload)).toString("base64url")}`;

    // Scopes needed for Google Drive backup storage (drive.file avoids restricted scope verification blocks)
    const scopes = [
      "https://www.googleapis.com/auth/drive.file",
      "email",
      "profile"
    ].join(" ");

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      scopes
    )}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (error: any) {
    console.error("GDrive OAuth authorize error:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate Google authorization" }, { status: 500 });
  }
}
