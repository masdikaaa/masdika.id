import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/auth-middleware";
import { detectStackFromManifests } from "@/lib/repo-detector";

const execFileAsync = promisify(execFile);

async function fetchText(url: string, headers: Record<string, string>, timeoutMs = 4500): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function discoverBranchesViaGitLsRemote(
  gitUrl: string,
  gitToken?: string
): Promise<{ defaultBranch?: string; branches: string[] }> {
  try {
    if (!/^https?:\/\//i.test(gitUrl)) {
      return { branches: [] };
    }
    let authUrl = gitUrl;
    if (gitToken) {
      const u = new URL(gitUrl);
      u.username = "oauth2";
      u.password = gitToken;
      authUrl = u.toString();
    }
    const [symrefRes, headsRes] = await Promise.all([
      execFileAsync("git", ["ls-remote", "--symref", authUrl, "HEAD"], { timeout: 6000 }).catch(() => ({ stdout: "" })),
      execFileAsync("git", ["ls-remote", "--heads", authUrl], { timeout: 6000 }).catch(() => ({ stdout: "" })),
    ]);

    let defaultBranch: string | undefined;
    const symMatch = symrefRes.stdout.match(/ref:\s+refs\/heads\/([^\s]+)\s+HEAD/);
    if (symMatch) {
      defaultBranch = symMatch[1];
    }

    const branches: string[] = [];
    for (const line of headsRes.stdout.split(/\r?\n/)) {
      const m = line.match(/refs\/heads\/([^\s]+)$/);
      if (m) branches.push(m[1]);
    }
    return { defaultBranch: defaultBranch || branches[0], branches: branches.slice(0, 30) };
  } catch {
    return { branches: [] };
  }
}

/**
 * POST /api/user/app-platform/detect-repo
 * Smart multi-language repository inspector:
 * - Detects real default branch & available branches (GitHub, GitLab, and generic Git via ls-remote)
 * - Detects Dockerfile, language, framework, package manager, requirements/dependencies, port & commands
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => null);
    const gitUrl = typeof body?.gitUrl === "string" ? body.gitUrl.trim() : "";
    const branchInput = typeof body?.branch === "string" ? body.branch.trim() : "";
    const gitToken = typeof body?.gitToken === "string" ? body.gitToken.trim() : "";
    const rawRootDir = typeof body?.rootDirectory === "string" ? body.rootDirectory.trim() : "";
    const subDir = rawRootDir.replace(/^\/+|\/+$/g, "");

    if (!gitUrl) {
      return NextResponse.json({ error: "Git URL is required" }, { status: 400 });
    }

    // 1. GitHub Inspector
    const ghMatch = gitUrl.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i);
    if (ghMatch) {
      const [, owner, repo] = ghMatch;
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Masdika-Cloud-AppPlatform/1.0",
      };
      if (gitToken) {
        headers.Authorization = `Bearer ${gitToken}`;
      }

      let defaultBranch = "main";
      let branches: string[] = [];

      const [repoRes, branchesRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers,
          signal: AbortSignal.timeout(6000),
        }).catch(() => null),
        fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`, {
          headers,
          signal: AbortSignal.timeout(6000),
        }).catch(() => null),
      ]);

      if (repoRes?.ok) {
        const repoData = await repoRes.json().catch(() => null);
        if (repoData?.default_branch) {
          defaultBranch = repoData.default_branch;
        }
      }
      if (branchesRes?.ok) {
        const branchList = await branchesRes.json().catch(() => null);
        if (Array.isArray(branchList)) {
          branches = branchList.map((b: any) => String(b.name || "")).filter(Boolean);
        }
      }

      // If API rate-limited, fall back to git ls-remote for branch discovery
      if (branches.length === 0) {
        const lsRemote = await discoverBranchesViaGitLsRemote(gitUrl, gitToken);
        if (lsRemote.defaultBranch) defaultBranch = lsRemote.defaultBranch;
        if (lsRemote.branches.length > 0) branches = lsRemote.branches;
      }

      if (branches.length > 0 && !branches.includes(defaultBranch)) {
        defaultBranch = branches[0];
      }

      const targetBranch =
        branchInput && (branches.length === 0 || branches.includes(branchInput))
          ? branchInput
          : defaultBranch;

      const contentsPath = subDir ? `/${subDir}` : "";
      const contentsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents${contentsPath}?ref=${encodeURIComponent(targetBranch)}`,
        { headers, signal: AbortSignal.timeout(7000) }
      ).catch(() => null);

      if (!contentsRes || !contentsRes.ok) {
        return NextResponse.json({
          success: true,
          detected: {
            supported: true,
            hasDockerfile: false,
            buildMode: "BUILDPACK",
            buildType: "DOCKERFILE",
            defaultPort: 80,
            defaultBranch: targetBranch,
            branches,
            dependencies: [],
            message: "Branch detected. Stack will be automatically detected during deployment (GitHub file inspection skipped or private repo).",
          },
        });
      }

      const items: any[] = await contentsRes.json();
      const fileNames = (Array.isArray(items) ? items : []).map((f) => String(f.name || "")).filter(Boolean);
      const fileSet = new Set(fileNames);
      const lowerSet = new Set(fileNames.map((f) => f.toLowerCase()));
      const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(targetBranch)}${subDir ? `/${subDir}` : ""}`;
      const rawHeaders: Record<string, string> = gitToken ? { Authorization: `Bearer ${gitToken}` } : {};

      const dockerfileName = fileNames.find((f) => f.toLowerCase() === "dockerfile");

      const [
        dockerfile,
        composerJson,
        packageJson,
        requirementsTxt,
        pyprojectToml,
        pipfile,
        goMod,
        cargoToml,
        gemfile,
        pomXml,
        buildGradle,
      ] = await Promise.all([
        dockerfileName ? fetchText(`${rawBase}/${dockerfileName}`, rawHeaders) : Promise.resolve(null),
        fileSet.has("composer.json") ? fetchText(`${rawBase}/composer.json`, rawHeaders) : Promise.resolve(null),
        fileSet.has("package.json") ? fetchText(`${rawBase}/package.json`, rawHeaders) : Promise.resolve(null),
        fileSet.has("requirements.txt") ? fetchText(`${rawBase}/requirements.txt`, rawHeaders) : Promise.resolve(null),
        fileSet.has("pyproject.toml") ? fetchText(`${rawBase}/pyproject.toml`, rawHeaders) : Promise.resolve(null),
        fileSet.has("Pipfile") ? fetchText(`${rawBase}/Pipfile`, rawHeaders) : Promise.resolve(null),
        fileSet.has("go.mod") ? fetchText(`${rawBase}/go.mod`, rawHeaders) : Promise.resolve(null),
        fileSet.has("Cargo.toml") ? fetchText(`${rawBase}/Cargo.toml`, rawHeaders) : Promise.resolve(null),
        fileSet.has("Gemfile") ? fetchText(`${rawBase}/Gemfile`, rawHeaders) : Promise.resolve(null),
        fileSet.has("pom.xml") ? fetchText(`${rawBase}/pom.xml`, rawHeaders) : Promise.resolve(null),
        lowerSet.has("build.gradle") || lowerSet.has("build.gradle.kts")
          ? fetchText(
              `${rawBase}/${fileSet.has("build.gradle.kts") ? "build.gradle.kts" : "build.gradle"}`,
              rawHeaders
            )
          : Promise.resolve(null),
      ]);

      const stack = detectStackFromManifests({
        fileNames,
        dockerfile,
        composerJson,
        packageJson,
        requirementsTxt,
        pyprojectToml,
        pipfile,
        goMod,
        cargoToml,
        gemfile,
        pomXml,
        buildGradle,
      });

      return NextResponse.json({
        success: true,
        detected: {
          supported: true,
          ...stack,
          defaultBranch: targetBranch,
          repoDefaultBranch: defaultBranch,
          branches,
        },
      });
    }

    // 2. GitLab Inspector (gitlab.com)
    const glMatch = gitUrl.match(/gitlab\.com[/:](.+?)(?:\.git)?\/?$/i);
    if (glMatch) {
      const projectPath = encodeURIComponent(glMatch[1]);
      const glHeaders: Record<string, string> = gitToken ? { "PRIVATE-TOKEN": gitToken } : {};

      let defaultBranch = "main";
      let branches: string[] = [];

      const [projRes, brRes] = await Promise.all([
        fetch(`https://gitlab.com/api/v4/projects/${projectPath}`, {
          headers: glHeaders,
          signal: AbortSignal.timeout(6000),
        }).catch(() => null),
        fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/branches?per_page=30`, {
          headers: glHeaders,
          signal: AbortSignal.timeout(6000),
        }).catch(() => null),
      ]);

      if (projRes?.ok) {
        const proj = await projRes.json().catch(() => null);
        if (proj?.default_branch) defaultBranch = proj.default_branch;
      }
      if (brRes?.ok) {
        const brList = await brRes.json().catch(() => null);
        if (Array.isArray(brList)) {
          branches = brList.map((b: any) => String(b.name || "")).filter(Boolean);
        }
      }

      const targetBranch =
        branchInput && (branches.length === 0 || branches.includes(branchInput))
          ? branchInput
          : defaultBranch;

      const treeRes = await fetch(
        `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?ref=${encodeURIComponent(targetBranch)}${subDir ? `&path=${encodeURIComponent(subDir)}` : ""}`,
        { headers: glHeaders, signal: AbortSignal.timeout(7000) }
      ).catch(() => null);

      if (!treeRes || !treeRes.ok) {
        return NextResponse.json({
          success: true,
          detected: {
            supported: true,
            hasDockerfile: false,
            buildMode: "BUILDPACK",
            buildType: "DOCKERFILE",
            defaultPort: 80,
            defaultBranch: targetBranch,
            branches,
            dependencies: [],
            message: "Branch detected. Stack will be automatically detected during deployment.",
          },
        });
      }

      const items: any[] = await treeRes.json();
      const fileNames = (Array.isArray(items) ? items : []).map((f) => String(f.name || "")).filter(Boolean);
      const fileSet = new Set(fileNames);
      const fetchGlRaw = (file: string) => {
        const fullPath = subDir ? `${subDir}/${file}` : file;
        return fetchText(
          `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(fullPath)}/raw?ref=${encodeURIComponent(targetBranch)}`,
          glHeaders
        );
      };

      const dockerfileName = fileNames.find((f) => f.toLowerCase() === "dockerfile");
      const [dockerfile, composerJson, packageJson, requirementsTxt, pyprojectToml, pipfile, goMod, cargoToml, gemfile, pomXml] =
        await Promise.all([
          dockerfileName ? fetchGlRaw(dockerfileName) : Promise.resolve(null),
          fileSet.has("composer.json") ? fetchGlRaw("composer.json") : Promise.resolve(null),
          fileSet.has("package.json") ? fetchGlRaw("package.json") : Promise.resolve(null),
          fileSet.has("requirements.txt") ? fetchGlRaw("requirements.txt") : Promise.resolve(null),
          fileSet.has("pyproject.toml") ? fetchGlRaw("pyproject.toml") : Promise.resolve(null),
          fileSet.has("Pipfile") ? fetchGlRaw("Pipfile") : Promise.resolve(null),
          fileSet.has("go.mod") ? fetchGlRaw("go.mod") : Promise.resolve(null),
          fileSet.has("Cargo.toml") ? fetchGlRaw("Cargo.toml") : Promise.resolve(null),
          fileSet.has("Gemfile") ? fetchGlRaw("Gemfile") : Promise.resolve(null),
          fileSet.has("pom.xml") ? fetchGlRaw("pom.xml") : Promise.resolve(null),
        ]);

      const stack = detectStackFromManifests({
        fileNames,
        dockerfile,
        composerJson,
        packageJson,
        requirementsTxt,
        pyprojectToml,
        pipfile,
        goMod,
        cargoToml,
        gemfile,
        pomXml,
      });

      return NextResponse.json({
        success: true,
        detected: {
          supported: true,
          ...stack,
          defaultBranch: targetBranch,
          repoDefaultBranch: defaultBranch,
          branches,
        },
      });
    }

    // 3. Fallback for Bitbucket / Gitea / Self-hosted Git (branch discovery via git ls-remote)
    const lsRemote = await discoverBranchesViaGitLsRemote(gitUrl, gitToken);
    const targetBranch =
      branchInput && (lsRemote.branches.length === 0 || lsRemote.branches.includes(branchInput))
        ? branchInput
        : lsRemote.defaultBranch || "main";

    return NextResponse.json({
      success: true,
      detected: {
        supported: false,
        hasDockerfile: false,
        buildMode: "BUILDPACK",
        buildType: "DOCKERFILE",
        defaultPort: 80,
        defaultBranch: targetBranch,
        branches: lsRemote.branches,
        dependencies: [],
        message:
          lsRemote.branches.length > 0
            ? `Detected ${lsRemote.branches.length} branches (default: ${targetBranch}). Stack will be auto-detected during build.`
            : "Stack will be automatically detected and built during deployment.",
      },
    });
  } catch (error: any) {
    console.error("[AppPlatform] Detect repo error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
