import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

/**
 * POST /api/user/app-platform/detect-repo
 * Automatically detects language, framework, Dockerfile presence, and default branch from a Git repository URL (Railway-style)
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

    if (!gitUrl) {
      return NextResponse.json({ error: "Git URL is required" }, { status: 400 });
    }

    // Parse GitHub owner/repo
    const ghMatch = gitUrl.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i);
    if (!ghMatch) {
      return NextResponse.json({
        success: true,
        detected: {
          supported: false,
          hasDockerfile: false,
          buildMode: "BUILDPACK",
          buildType: "DOCKERFILE",
          defaultPort: 80,
          message: "Stack will be automatically detected and built during deployment.",
        },
      });
    }

    const [, owner, repo] = ghMatch;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Masdika-Cloud-AppPlatform/1.0",
    };
    if (gitToken) {
      headers.Authorization = `Bearer ${gitToken}`;
    }

    // 1. Fetch repo metadata to know default branch
    let targetBranch = branchInput || "main";
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        if (!branchInput && repoData?.default_branch) {
          targetBranch = repoData.default_branch;
        }
      }
    } catch {
      // Fallback to provided or main
    }

    // 2. Fetch root directory contents
    const contentsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(targetBranch)}`,
      { headers, signal: AbortSignal.timeout(7000) }
    );

    if (!contentsRes.ok) {
      return NextResponse.json({
        success: true,
        detected: {
          supported: true,
          hasDockerfile: false,
          buildMode: "BUILDPACK",
          buildType: "DOCKERFILE",
          defaultPort: 80,
          defaultBranch: targetBranch,
          message: "Stack will be automatically detected and built during deployment (GitHub inspection skipped or private repo).",
        },
      });
    }

    const items: any[] = await contentsRes.json();
    const fileNames = new Set(
      (Array.isArray(items) ? items : []).map((f) => String(f.name || ""))
    );
    const lowerFileNames = new Set(
      Array.from(fileNames).map((f) => f.toLowerCase())
    );

    const hasDockerfile = lowerFileNames.has("dockerfile");
    let detectedFramework = "DOCKERFILE";
    let defaultPort = 80;
    let detectedLabel = "Custom Container";

    if (
      fileNames.has("wp-config.php") ||
      fileNames.has("wp-config-sample.php") ||
      fileNames.has("wp-content") ||
      fileNames.has("wp-includes")
    ) {
      detectedFramework = "WORDPRESS";
      detectedLabel = "WordPress";
      defaultPort = 80;
    } else if (fileNames.has("artisan") || fileNames.has("composer.json") || fileNames.has("index.php")) {
      detectedFramework = "PHP";
      detectedLabel = "PHP";
      defaultPort = 80;
      if (fileNames.has("artisan")) {
        detectedFramework = "LARAVEL";
        detectedLabel = "Laravel (PHP 8.2)";
      } else {
        // Inspect composer.json briefly
        try {
          const compRes = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(targetBranch)}/composer.json`,
            { headers, signal: AbortSignal.timeout(4000) }
          );
          if (compRes.ok) {
            const compText = await compRes.text();
            if (compText.includes("laravel/framework")) {
              detectedFramework = "LARAVEL";
              detectedLabel = "Laravel (PHP 8.2)";
            }
          }
        } catch {}
      }
    } else if (fileNames.has("package.json")) {
      detectedFramework = "NODEJS";
      detectedLabel = "Node.js";
      defaultPort = 3000;
      try {
        const pkgRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(targetBranch)}/package.json`,
          { headers, signal: AbortSignal.timeout(4000) }
        );
        if (pkgRes.ok) {
          const pkg = await pkgRes.json();
          const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          if (allDeps.next) {
            detectedFramework = "NEXTJS";
            detectedLabel = "Next.js";
            defaultPort = 3000;
          } else if (allDeps["@nestjs/core"]) {
            detectedFramework = "NESTJS";
            detectedLabel = "NestJS";
            defaultPort = 3000;
          } else if (allDeps.astro) {
            detectedFramework = "ASTRO";
            detectedLabel = "Astro";
            defaultPort = 4321;
          } else if (allDeps["@sveltejs/kit"]) {
            detectedFramework = "SVELTE";
            detectedLabel = "SvelteKit";
            defaultPort = 3000;
          } else if (allDeps["@remix-run/react"]) {
            detectedFramework = "REMIX";
            detectedLabel = "Remix";
            defaultPort = 3000;
          } else if (allDeps.vite) {
            detectedFramework = "VITE";
            detectedLabel = "Vite SPA";
            defaultPort = 80;
          }
        }
      } catch {}
    } else if (fileNames.has("go.mod") || fileNames.has("main.go")) {
      detectedFramework = "GOLANG";
      detectedLabel = "Go (Golang)";
      defaultPort = 8080;
    } else if (fileNames.has("Cargo.toml")) {
      detectedFramework = "RUST";
      detectedLabel = "Rust";
      defaultPort = 8080;
    } else if (fileNames.has("Gemfile") || fileNames.has("config.ru")) {
      detectedFramework = "RUBY";
      detectedLabel = "Ruby on Rails";
      defaultPort = 3000;
    } else if (
      fileNames.has("pom.xml") ||
      fileNames.has("build.gradle") ||
      fileNames.has("build.gradle.kts")
    ) {
      detectedFramework = "JAVA";
      detectedLabel = "Java (Spring Boot)";
      defaultPort = 8080;
    } else if (
      fileNames.has("manage.py") ||
      fileNames.has("requirements.txt") ||
      fileNames.has("pyproject.toml") ||
      fileNames.has("Pipfile") ||
      fileNames.has("main.py") ||
      fileNames.has("app.py") ||
      fileNames.has("server.py")
    ) {
      detectedFramework = "PYTHON";
      detectedLabel = "Python";
      defaultPort = 8000;
      if (fileNames.has("manage.py")) {
        detectedFramework = "DJANGO";
        detectedLabel = "Django (Python)";
      } else {
        try {
          const reqRes = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(targetBranch)}/requirements.txt`,
            { headers, signal: AbortSignal.timeout(4000) }
          );
          if (reqRes.ok) {
            const reqText = (await reqRes.text()).toLowerCase();
            if (reqText.includes("fastapi")) {
              detectedFramework = "FASTAPI";
              detectedLabel = "FastAPI (Python)";
            } else if (reqText.includes("django")) {
              detectedFramework = "DJANGO";
              detectedLabel = "Django (Python)";
            }
          }
        } catch {}
      }
    } else if (fileNames.has("index.html")) {
      detectedFramework = "STATIC";
      detectedLabel = "Static HTML / Nginx";
      defaultPort = 80;
    }

    const recommendedBuildMode = hasDockerfile ? "DOCKERFILE" : "AUTO";

    return NextResponse.json({
      success: true,
      detected: {
        supported: true,
        hasDockerfile,
        buildMode: recommendedBuildMode,
        buildType: hasDockerfile ? "DOCKERFILE" : detectedFramework,
        detectedFramework,
        detectedLabel: hasDockerfile ? `Dockerfile (${detectedLabel})` : detectedLabel,
        defaultPort,
        defaultBranch: targetBranch,
        detectedFiles: Array.from(fileNames).slice(0, 20),
      },
    });
  } catch (error: any) {
    console.error("[AppPlatform] Detect repo error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
