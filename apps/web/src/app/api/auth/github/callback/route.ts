import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptDeterministic } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");

  let userId: number | null = null;
  let returnTo = "/dashboard/app-platform/new";

  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
      userId = Number(parsed.userId) || null;
      if (typeof parsed.returnTo === "string" && parsed.returnTo.startsWith("/")) {
        returnTo = parsed.returnTo;
      }
    } catch {}
  }

  if (!code || !userId) {
    return NextResponse.redirect(new URL(`${returnTo}?github_error=invalid_callback`, req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${returnTo}?github_error=oauth_not_configured`, req.url));
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL(`${returnTo}?github_error=token_exchange_failed`, req.url));
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Masdika-Cloud-AppPlatform/1.0",
      },
    });
    const ghUser = await userRes.json();

    await prisma.user.update({
      where: { id: userId },
      data: {
        githubUsername: ghUser?.login || "github-user",
        githubAccessToken: encryptDeterministic(accessToken),
      },
    });

    return NextResponse.redirect(new URL(`${returnTo}?github_connected=1`, req.url));
  } catch (err) {
    console.error("[GitHub OAuth Callback] Error:", err);
    return NextResponse.redirect(new URL(`${returnTo}?github_error=server_error`, req.url));
  }
}
