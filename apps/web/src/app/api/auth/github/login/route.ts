import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
  if (authResult.error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/dashboard/app-platform/new?github_error=oauth_not_configured", req.url)
    );
  }

  const redirectUri =
    process.env.GITHUB_CALLBACK_URL ||
    `${req.nextUrl.origin}/api/auth/github/callback`;
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/dashboard/app-platform/new";
  const state = Buffer.from(JSON.stringify({ userId: authResult.user!.id, returnTo })).toString("base64url");

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("scope", "repo read:user");
  githubAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubAuthUrl.toString());
}
