import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { sortBranchesNewestFirst } from "@/lib/repo-detector";

/**
 * GET /api/user/app-platform/github
 * Lists connected Git provider status, user repositories, or branches for a specific repo (?repo=owner/name)
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
        provider: null,
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
    const isGitLab = token.startsWith("gitlab:");
    const isBitbucket = token.startsWith("bitbucket:");
    const provider = isGitLab ? "gitlab" : isBitbucket ? "bitbucket" : "github";
    const rawToken = isGitLab
      ? token.slice("gitlab:".length)
      : isBitbucket
      ? token.slice("bitbucket:".length)
      : token;

    if (isGitLab) {
      const glHeaders = { "PRIVATE-TOKEN": rawToken };
      if (repoParam && /^[^/\s]+(\/[^/\s]+)+$/.test(repoParam)) {
        const brRes = await fetch(
          `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoParam)}/repository/branches?per_page=100`,
          { headers: glHeaders, signal: AbortSignal.timeout(7000) }
        );
        if (!brRes.ok) return NextResponse.json({ success: true, branches: ["main", "master"] });
        const branchesData = await brRes.json();
        const branches = sortBranchesNewestFirst(
          Array.isArray(branchesData) ? branchesData.map((b: any) => String(b.name || "")) : ["main"]
        );
        return NextResponse.json({ success: true, branches });
      }

      const reposRes = await fetch(
        "https://gitlab.com/api/v4/projects?membership=true&order_by=last_activity_at&per_page=50",
        { headers: glHeaders, signal: AbortSignal.timeout(8000) }
      );
      if (!reposRes.ok) {
        return NextResponse.json({
          success: true,
          connected: false,
          provider: null,
          oauthConfigured,
          githubUsername: null,
          repos: [],
          error: "GitLab token expired or invalid. Please reconnect.",
        });
      }
      const reposData = await reposRes.json();
      const repos = (Array.isArray(reposData) ? reposData : []).map((r: any) => ({
        id: r.id,
        fullName: r.path_with_namespace,
        name: r.path,
        cloneUrl: r.http_url_to_repo,
        defaultBranch: r.default_branch || "main",
        private: r.visibility !== "public",
        language: "GitLab",
        pushedAt: r.last_activity_at,
      }));
      return NextResponse.json({
        success: true,
        connected: true,
        provider,
        oauthConfigured,
        githubUsername: user.githubUsername,
        repos,
      });
    }

    if (isBitbucket) {
      const bbHeaders = { Authorization: `Bearer ${rawToken}` };
      if (repoParam && /^[^/\s]+\/[^/\s]+$/.test(repoParam)) {
        const brRes = await fetch(
          `https://api.bitbucket.org/2.0/repositories/${repoParam}/refs/branches?pagelen=100`,
          { headers: bbHeaders, signal: AbortSignal.timeout(7000) }
        );
        if (!brRes.ok) return NextResponse.json({ success: true, branches: ["main", "master"] });
        const branchesData = await brRes.json();
        const rawBranches = Array.isArray(branchesData?.values)
          ? branchesData.values.map((b: any) => String(b.name || ""))
          : ["main"];
        return NextResponse.json({ success: true, branches: sortBranchesNewestFirst(rawBranches) });
      }

      const reposRes = await fetch(
        "https://api.bitbucket.org/2.0/repositories?role=member&sort=-updated_on&pagelen=50",
        { headers: bbHeaders, signal: AbortSignal.timeout(8000) }
      );
      if (!reposRes.ok) {
        return NextResponse.json({
          success: true,
          connected: false,
          provider: null,
          oauthConfigured,
          githubUsername: null,
          repos: [],
          error: "Bitbucket token expired or invalid. Please reconnect.",
        });
      }
      const reposData = await reposRes.json();
      const repos = (Array.isArray(reposData?.values) ? reposData.values : []).map((r: any) => {
        const httpsLink = Array.isArray(r.links?.clone)
          ? r.links.clone.find((l: any) => l.name === "https")?.href
          : null;
        return {
          id: r.uuid || r.full_name,
          fullName: r.full_name,
          name: r.slug || r.name,
          cloneUrl: httpsLink || `https://bitbucket.org/${r.full_name}.git`,
          defaultBranch: r.mainbranch?.name || "main",
          private: Boolean(r.is_private),
          language: r.language || "Bitbucket",
          pushedAt: r.updated_on,
        };
      });
      return NextResponse.json({
        success: true,
        connected: true,
        provider,
        oauthConfigured,
        githubUsername: user.githubUsername,
        repos,
      });
    }

    const ghHeaders = {
      Authorization: `Bearer ${rawToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Masdika-Cloud-AppPlatform/1.0",
    };

    // If ?repo=owner/name is provided, fetch branches for that repository
    if (repoParam && /^[^/\s]+\/[^/\s]+$/.test(repoParam)) {
      const brRes = await fetch(
        `https://api.github.com/repos/${repoParam}/branches?per_page=100`,
        { headers: ghHeaders, signal: AbortSignal.timeout(7000) }
      );
      if (!brRes.ok) {
        return NextResponse.json({ success: true, branches: ["main", "master"] });
      }
      const branchesData = await brRes.json();
      const branches = sortBranchesNewestFirst(
        Array.isArray(branchesData) ? branchesData.map((b: any) => String(b.name || "")) : ["main"]
      );
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
        provider: null,
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
      provider,
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
 * Connect GitHub, GitLab, or Bitbucket account using a Personal Access Token (PAT)
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const requestedProvider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "auto";
    if (!token) {
      return NextResponse.json({ error: "Git Personal Access Token is required" }, { status: 400 });
    }

    const resolvedProvider =
      requestedProvider === "gitlab" || (requestedProvider === "auto" && token.startsWith("glpat-"))
        ? "gitlab"
        : requestedProvider === "bitbucket"
        ? "bitbucket"
        : "github";

    if (resolvedProvider === "gitlab") {
      const glRes = await fetch("https://gitlab.com/api/v4/user", {
        headers: { "PRIVATE-TOKEN": token },
        signal: AbortSignal.timeout(6000),
      });
      if (!glRes.ok) {
        return NextResponse.json(
          { error: "Invalid GitLab token. Please check permissions (read_api / read_repository)." },
          { status: 400 }
        );
      }
      const glUser = await glRes.json();
      await prisma.user.update({
        where: { id: authResult.user!.id },
        data: {
          githubUsername: glUser.username || "gitlab-user",
          githubAccessToken: encryptDeterministic(`gitlab:${token}`),
        },
      });
      return NextResponse.json({
        success: true,
        provider: "gitlab",
        githubUsername: glUser.username,
      });
    }

    if (resolvedProvider === "bitbucket") {
      const bbRes = await fetch("https://api.bitbucket.org/2.0/user", {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      });
      if (!bbRes.ok) {
        return NextResponse.json(
          { error: "Invalid Bitbucket token. Please use a Repository/Workspace Access Token with repository:read scope." },
          { status: 400 }
        );
      }
      const bbUser = await bbRes.json();
      const bbUsername = bbUser.username || bbUser.nickname || bbUser.display_name || "bitbucket-user";
      await prisma.user.update({
        where: { id: authResult.user!.id },
        data: {
          githubUsername: bbUsername,
          githubAccessToken: encryptDeterministic(`bitbucket:${token}`),
        },
      });
      return NextResponse.json({
        success: true,
        provider: "bitbucket",
        githubUsername: bbUsername,
      });
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
      provider: "github",
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
