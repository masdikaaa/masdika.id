import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";

/**
 * GET /api/user/app-platform/github
 * Lists connected GitHub status, user repositories, or branches for a specific repo (?repo=owner/name)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user!.id },
      select: { id: true, githubUsername: true, githubAccessToken: true },
    });

    const oauthConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    if (!user?.githubAccessToken) {
      return NextResponse.json({
        success: true,
        connected: false,
        oauthConfigured,
        githubUsername: null,
        repos: [],
      });
    }

    let token = user.githubAccessToken;
    try {
      token = decryptDeterministic(token);
    } catch {}

    const repoParam = req.nextUrl.searchParams.get("repo");
    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Masdika-Cloud-AppPlatform/1.0",
    };

    // If ?repo=owner/name is provided, fetch branches for that repository
    if (repoParam && /^[^/]+\/[^/]+$/.test(repoParam)) {
      const brRes = await fetch(
        `https://api.github.com/repos/${repoParam}/branches?per_page=100`,
        { headers: ghHeaders, signal: AbortSignal.timeout(7000) }
      );
      if (!brRes.ok) {
        return NextResponse.json({ success: true, branches: ["main", "master"] });
      }
      const branchesData = await brRes.json();
      const branches = Array.isArray(branchesData) ? branchesData.map((b: any) => b.name) : ["main"];
      return NextResponse.json({ success: true, branches });
    }

    // Fetch user repositories (sorted by recently pushed)
    const reposRes = await fetch(
      "https://api.github.com/user/repos?sort=pushed&per_page=50&affiliation=owner,collaborator,organization_member",
      { headers: ghHeaders, signal: AbortSignal.timeout(8000) }
    );

    if (!reposRes.ok) {
      return NextResponse.json({
        success: true,
        connected: false,
        oauthConfigured,
        githubUsername: null,
        repos: [],
        error: "GitHub token expired or invalid. Please reconnect.",
      });
    }

    const reposData = await reposRes.json();
    const repos = (Array.isArray(reposData) ? reposData : []).map((r: any) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      cloneUrl: r.clone_url,
      defaultBranch: r.default_branch || "main",
      private: Boolean(r.private),
      language: r.language || null,
      pushedAt: r.pushed_at,
    }));

    return NextResponse.json({
      success: true,
      connected: true,
      oauthConfigured,
      githubUsername: user.githubUsername,
      repos,
    });
  } catch (error: any) {
    console.error("[AppPlatform GitHub] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/user/app-platform/github
 * Connect GitHub account using a Personal Access Token (PAT)
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "GitHub Personal Access Token is required" }, { status: 400 });
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Masdika-Cloud-AppPlatform/1.0",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Invalid GitHub token. Please check permissions (repo scope)." }, { status: 400 });
    }

    const ghUser = await userRes.json();
    await prisma.user.update({
      where: { id: authResult.user!.id },
      data: {
        githubUsername: ghUser.login || "github-user",
        githubAccessToken: encryptDeterministic(token),
      },
    });

    return NextResponse.json({
      success: true,
      githubUsername: ghUser.login,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/app-platform/github
 * Disconnect GitHub account
 */
export async function DELETE() {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await prisma.user.update({
      where: { id: authResult.user!.id },
      data: {
        githubUsername: null,
        githubAccessToken: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
