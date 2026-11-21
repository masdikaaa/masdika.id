export interface RepoManifestInputs {
  fileNames: string[];
  dockerfile?: string | null;
  composerJson?: string | null;
  packageJson?: string | null;
  requirementsTxt?: string | null;
  pyprojectToml?: string | null;
  pipfile?: string | null;
  goMod?: string | null;
  cargoToml?: string | null;
  gemfile?: string | null;
  pomXml?: string | null;
  buildGradle?: string | null;
}

export interface DetectedRepoStack {
  hasDockerfile: boolean;
  buildMode: "DOCKERFILE" | "AUTO" | "BUILDPACK";
  buildType: string;
  detectedFramework: string;
  detectedLabel: string;
  language: string;
  runtimeVersion?: string;
  packageManager?: string;
  manifestFile?: string;
  dependencies: string[];
  hasGitDependencies: boolean;
  defaultPort: number;
  suggestedBuildCommand?: string;
  suggestedStartCommand?: string;
  detectedFiles: string[];
}

function parseRequirementsTxt(text: string): { deps: string[]; hasGit: boolean } {
  const deps: string[] = [];
  let hasGit = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line || line.startsWith("-")) continue;
    if (line.includes("git+") || line.includes("git://")) {
      hasGit = true;
    }
    const atMatch = line.match(/^([A-Za-z0-9_.-]+)\s*@\s*(.+)$/);
    if (atMatch) {
      deps.push(atMatch[1]);
      continue;
    }
    const pkgMatch = line.match(/^([A-Za-z0-9_.-]+)/);
    if (pkgMatch) {
      deps.push(pkgMatch[1]);
    }
  }
  return { deps: Array.from(new Set(deps)), hasGit };
}

function extractTomlSection(text: string, header: string): string {
  const lines = text.split(/\r?\n/);
  const captured: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[.+\]$/.test(trimmed)) {
      if (trimmed.toLowerCase() === header.toLowerCase()) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    } else if (inSection) {
      captured.push(line);
    }
  }
  return captured.join("\n");
}

function parsePyprojectToml(text: string): { deps: string[]; hasGit: boolean; pythonVersion?: string } {
  const deps: string[] = [];
  const hasGit = text.includes("git+");
  const pyMatch = text.match(/requires-python\s*=\s*["']([^"']+)["']/i) || text.match(/python\s*=\s*["']([^"']+)["']/i);
  const depBlockMatch = text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/m);
  if (depBlockMatch) {
    const quoted = depBlockMatch[1].matchAll(/["']([A-Za-z0-9_.-]+)/g);
    for (const m of quoted) {
      deps.push(m[1]);
    }
  }
  const poetryDeps = extractTomlSection(text, "[tool.poetry.dependencies]");
  if (poetryDeps) {
    for (const line of poetryDeps.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
      if (m && m[1].toLowerCase() !== "python") {
        deps.push(m[1]);
      }
    }
  }
  return { deps: Array.from(new Set(deps)), hasGit, pythonVersion: pyMatch?.[1] };
}

function parsePipfile(text: string): { deps: string[]; hasGit: boolean; pythonVersion?: string } {
  const deps: string[] = [];
  const hasGit = text.includes("git+");
  const pyMatch = text.match(/python_version\s*=\s*["']([^"']+)["']/i);
  const pkgSection = extractTomlSection(text, "[packages]");
  if (pkgSection) {
    for (const line of pkgSection.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
      if (m) deps.push(m[1]);
    }
  }
  return { deps: Array.from(new Set(deps)), hasGit, pythonVersion: pyMatch?.[1] };
}

/**
 * Inspect repository file list and manifest contents to detect language, framework,
 * dependencies/requirements, package manager, suggested port, and build/start commands.
 */
export function detectStackFromManifests(input: RepoManifestInputs): DetectedRepoStack {
  const fileNames = new Set(input.fileNames);
  const lowerFiles = new Set(input.fileNames.map((f) => f.toLowerCase()));
  const hasDockerfile = lowerFiles.has("dockerfile");

  let detectedFramework = "DOCKERFILE";
  let detectedLabel = "Custom Container";
  let language = "Docker";
  let runtimeVersion: string | undefined;
  let packageManager: string | undefined;
  let manifestFile: string | undefined;
  let dependencies: string[] = [];
  let hasGitDependencies = false;
  let defaultPort = 80;
  let suggestedBuildCommand: string | undefined;
  let suggestedStartCommand: string | undefined;

  if (hasDockerfile && input.dockerfile) {
    const exposeMatch = input.dockerfile.match(/^\s*EXPOSE\s+(\d+)/im);
    if (exposeMatch) {
      const parsedPort = parseInt(exposeMatch[1], 10);
      if (parsedPort > 0 && parsedPort <= 65535) {
        defaultPort = parsedPort;
      }
    }
  }

  if (
    fileNames.has("wp-config.php") ||
    fileNames.has("wp-config-sample.php") ||
    fileNames.has("wp-content") ||
    fileNames.has("wp-includes")
  ) {
    detectedFramework = "WORDPRESS";
    detectedLabel = "WordPress (PHP 8.3)";
    language = "PHP";
    runtimeVersion = "8.3";
    defaultPort = 80;
  } else if (
    fileNames.has("artisan") ||
    fileNames.has("composer.json") ||
    fileNames.has("index.php") ||
    fileNames.has("public/index.php")
  ) {
    detectedFramework = "PHP";
    detectedLabel = "PHP 8.3";
    language = "PHP";
    runtimeVersion = "8.3";
    defaultPort = 80;
    if (fileNames.has("composer.json")) {
      packageManager = "composer";
      manifestFile = "composer.json";
    }
    if (input.composerJson) {
      try {
        const comp = JSON.parse(input.composerJson);
        const req = comp.require || {};
        if (typeof req.php === "string") {
          runtimeVersion = req.php;
        }
        dependencies = Object.keys(req)
          .filter((k) => k !== "php" && !k.startsWith("ext-"))
          .slice(0, 15);
        if (req["laravel/framework"] || fileNames.has("artisan")) {
          detectedFramework = "LARAVEL";
          detectedLabel = "Laravel (PHP 8.3)";
        } else if (req["symfony/framework-bundle"]) {
          detectedLabel = "Symfony (PHP 8.3)";
        } else if (req["codeigniter4/framework"]) {
          detectedLabel = "CodeIgniter 4 (PHP 8.3)";
        } else if (req["slim/slim"]) {
          detectedLabel = "Slim (PHP 8.3)";
        }
      } catch {
        if (input.composerJson.includes("laravel/framework")) {
          detectedFramework = "LARAVEL";
          detectedLabel = "Laravel (PHP 8.3)";
        }
      }
    } else if (fileNames.has("artisan")) {
      detectedFramework = "LARAVEL";
      detectedLabel = "Laravel (PHP 8.3)";
    }
  } else if (fileNames.has("package.json")) {
    detectedFramework = "NODEJS";
    detectedLabel = "Node.js";
    language = "JavaScript / TypeScript";
    manifestFile = "package.json";
    defaultPort = 3000;

    if (fileNames.has("pnpm-lock.yaml")) packageManager = "pnpm";
    else if (fileNames.has("yarn.lock")) packageManager = "yarn";
    else if (fileNames.has("bun.lockb") || fileNames.has("bun.lock")) packageManager = "bun";
    else packageManager = "npm";

    if (input.packageJson) {
      try {
        const pkg = JSON.parse(input.packageJson);
        const depsObj = pkg.dependencies || {};
        const devDepsObj = pkg.devDependencies || {};
        const allDeps = { ...depsObj, ...devDepsObj };
        dependencies = Object.keys(depsObj).slice(0, 15);
        if (dependencies.length === 0) {
          dependencies = Object.keys(devDepsObj).slice(0, 15);
        }
        if (typeof pkg.engines?.node === "string") {
          runtimeVersion = pkg.engines.node;
        }
        if (typeof pkg.scripts?.build === "string") {
          suggestedBuildCommand = `${packageManager === "npm" ? "npm run" : packageManager} build`;
        }
        if (typeof pkg.scripts?.start === "string") {
          suggestedStartCommand = `${packageManager === "npm" ? "npm" : packageManager} start`;
          const portMatch = pkg.scripts.start.match(/(?:-p|--port)\s+(\d+)/);
          if (portMatch) {
            defaultPort = parseInt(portMatch[1], 10) || defaultPort;
          }
        }

        if (allDeps.next) {
          detectedFramework = "NEXTJS";
          detectedLabel = "Next.js";
          defaultPort = 3000;
        } else if (allDeps["@nestjs/core"]) {
          detectedFramework = "NESTJS";
          detectedLabel = "NestJS";
          defaultPort = 3000;
        } else if (allDeps.nuxt) {
          detectedFramework = "NODEJS";
          detectedLabel = "Nuxt (Node.js)";
          defaultPort = 3000;
        } else if (allDeps.astro) {
          detectedFramework = "ASTRO";
          detectedLabel = "Astro";
          defaultPort = 4321;
        } else if (allDeps["@sveltejs/kit"]) {
          detectedFramework = "SVELTE";
          detectedLabel = "SvelteKit";
          defaultPort = 3000;
        } else if (allDeps["@remix-run/react"] || allDeps["@react-router/dev"]) {
          detectedFramework = "REMIX";
          detectedLabel = "Remix";
          defaultPort = 3000;
        } else if (allDeps.vite && !allDeps.express && !allDeps.fastify && !allDeps.hono && !pkg.scripts?.start) {
          detectedFramework = "VITE";
          detectedLabel = "Vite SPA (Nginx)";
          defaultPort = 80;
        } else if (allDeps.express) {
          detectedLabel = "Express (Node.js)";
        } else if (allDeps.fastify) {
          detectedLabel = "Fastify (Node.js)";
        } else if (allDeps.hono) {
          detectedLabel = "Hono (Node.js)";
        } else if (allDeps.koa) {
          detectedLabel = "Koa (Node.js)";
        }
      } catch {}
    }
  } else if (fileNames.has("go.mod") || fileNames.has("main.go")) {
    detectedFramework = "GOLANG";
    detectedLabel = "Go (Golang)";
    language = "Go";
    packageManager = "go modules";
    manifestFile = fileNames.has("go.mod") ? "go.mod" : "main.go";
    defaultPort = 8080;

    if (input.goMod) {
      const goVer = input.goMod.match(/^go\s+([\d.]+)/m);
      if (goVer) runtimeVersion = goVer[1];
      const modDeps: string[] = [];
      for (const line of input.goMod.split(/\r?\n/)) {
        const m = line.trim().match(/^([a-zA-Z0-9._-]+\/[a-zA-Z0-9._/-]+)\s+v[\d.]+/);
        if (m && !line.includes("// indirect")) {
          modDeps.push(m[1]);
        }
      }
      dependencies = Array.from(new Set(modDeps)).slice(0, 15);
      const lowerGoMod = input.goMod.toLowerCase();
      if (lowerGoMod.includes("gin-gonic/gin")) detectedLabel = "Go (Gin)";
      else if (lowerGoMod.includes("gofiber/fiber")) detectedLabel = "Go (Fiber)";
      else if (lowerGoMod.includes("labstack/echo")) detectedLabel = "Go (Echo)";
      else if (lowerGoMod.includes("go-chi/chi")) detectedLabel = "Go (Chi)";
      else if (lowerGoMod.includes("gorilla/mux")) detectedLabel = "Go (Gorilla Mux)";
    }

    if (fileNames.has("cmd") && !fileNames.has("main.go")) {
      suggestedBuildCommand = "CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/...";
    } else {
      suggestedBuildCommand = "CGO_ENABLED=0 GOOS=linux go build -o /app/server .";
    }
    suggestedStartCommand = "./server";
  } else if (fileNames.has("Cargo.toml")) {
    detectedFramework = "RUST";
    detectedLabel = "Rust";
    language = "Rust";
    packageManager = "cargo";
    manifestFile = "Cargo.toml";
    defaultPort = 8080;
    suggestedBuildCommand = "cargo build --release";
    suggestedStartCommand = "./server";

    if (input.cargoToml) {
      const edMatch = input.cargoToml.match(/edition\s*=\s*["'](\d+)["']/);
      if (edMatch) runtimeVersion = `Edition ${edMatch[1]}`;
      const depSec = extractTomlSection(input.cargoToml, "[dependencies]");
      if (depSec) {
        const rustDeps: string[] = [];
        for (const line of depSec.split(/\r?\n/)) {
          const m = line.match(/^\s*([a-zA-Z0-9_-]+)\s*=/);
          if (m) rustDeps.push(m[1]);
        }
        dependencies = rustDeps.slice(0, 15);
      }
      const lowerCargo = input.cargoToml.toLowerCase();
      if (lowerCargo.includes("axum")) detectedLabel = "Rust (Axum)";
      else if (lowerCargo.includes("actix-web")) detectedLabel = "Rust (Actix Web)";
      else if (lowerCargo.includes("rocket")) detectedLabel = "Rust (Rocket)";
    }
  } else if (fileNames.has("Gemfile") || fileNames.has("config.ru")) {
    detectedFramework = "RUBY";
    detectedLabel = "Ruby";
    language = "Ruby";
    packageManager = "bundler";
    manifestFile = fileNames.has("Gemfile") ? "Gemfile" : "config.ru";
    defaultPort = 3000;

    if (input.gemfile) {
      const rubyMatch = input.gemfile.match(/ruby\s+["']([^"']+)["']/);
      if (rubyMatch) runtimeVersion = rubyMatch[1];
      const gems: string[] = [];
      for (const line of input.gemfile.split(/\r?\n/)) {
        const m = line.match(/^\s*gem\s+["']([^"']+)["']/);
        if (m) gems.push(m[1]);
      }
      dependencies = Array.from(new Set(gems)).slice(0, 15);
      const lowerGem = input.gemfile.toLowerCase();
      if (lowerGem.includes("rails")) {
        detectedFramework = "RAILS";
        detectedLabel = "Ruby on Rails";
        suggestedStartCommand = "bundle exec rails server -b 0.0.0.0 -p 3000";
      } else if (lowerGem.includes("sinatra")) {
        detectedLabel = "Ruby (Sinatra)";
      }
    }
  } else if (
    fileNames.has("pom.xml") ||
    fileNames.has("build.gradle") ||
    fileNames.has("build.gradle.kts")
  ) {
    detectedFramework = "JAVA";
    detectedLabel = "Java";
    language = "Java";
    defaultPort = 8080;

    if (fileNames.has("pom.xml")) {
      packageManager = "maven";
      manifestFile = "pom.xml";
      suggestedBuildCommand = "mvn clean package -DskipTests";
      if (input.pomXml) {
        const javaVer = input.pomXml.match(/<java\.version>([^<]+)<\/java\.version>/);
        if (javaVer) runtimeVersion = `Java ${javaVer[1]}`;
        const artifacts = Array.from(input.pomXml.matchAll(/<artifactId>([^<]+)<\/artifactId>/g))
          .map((m) => m[1])
          .filter((a) => !a.includes("maven-"));
        dependencies = Array.from(new Set(artifacts)).slice(0, 15);
        if (input.pomXml.includes("spring-boot")) {
          detectedFramework = "SPRINGBOOT";
          detectedLabel = "Spring Boot (Maven)";
        }
      }
    } else {
      packageManager = "gradle";
      manifestFile = fileNames.has("build.gradle.kts") ? "build.gradle.kts" : "build.gradle";
      suggestedBuildCommand = "./gradlew build -x test";
      if (input.buildGradle && input.buildGradle.includes("org.springframework.boot")) {
        detectedFramework = "SPRINGBOOT";
        detectedLabel = "Spring Boot (Gradle)";
      }
    }
  } else if (
    fileNames.has("manage.py") ||
    fileNames.has("requirements.txt") ||
    fileNames.has("pyproject.toml") ||
    fileNames.has("Pipfile") ||
    fileNames.has("main.py") ||
    fileNames.has("app.py") ||
    fileNames.has("server.py") ||
    fileNames.has("run.py") ||
    fileNames.has("bot.py")
  ) {
    detectedFramework = "PYTHON";
    detectedLabel = "Python";
    language = "Python";
    runtimeVersion = "3.11";
    defaultPort = 8000;

    if (fileNames.has("requirements.txt")) {
      packageManager = "pip";
      manifestFile = "requirements.txt";
    } else if (fileNames.has("pyproject.toml")) {
      packageManager = "pip / poetry";
      manifestFile = "pyproject.toml";
    } else if (fileNames.has("Pipfile")) {
      packageManager = "pipenv";
      manifestFile = "Pipfile";
    }

    const collectedDeps: string[] = [];
    if (input.requirementsTxt) {
      const parsed = parseRequirementsTxt(input.requirementsTxt);
      collectedDeps.push(...parsed.deps);
      if (parsed.hasGit) hasGitDependencies = true;
    }
    if (input.pyprojectToml) {
      const parsed = parsePyprojectToml(input.pyprojectToml);
      collectedDeps.push(...parsed.deps);
      if (parsed.hasGit) hasGitDependencies = true;
      if (parsed.pythonVersion) runtimeVersion = parsed.pythonVersion;
    }
    if (input.pipfile) {
      const parsed = parsePipfile(input.pipfile);
      collectedDeps.push(...parsed.deps);
      if (parsed.hasGit) hasGitDependencies = true;
      if (parsed.pythonVersion) runtimeVersion = parsed.pythonVersion;
    }

    dependencies = Array.from(new Set(collectedDeps)).slice(0, 15);
    const lowerDeps = new Set(dependencies.map((d) => d.toLowerCase()));

    const entryMod = fileNames.has("main.py")
      ? "main:app"
      : fileNames.has("app.py")
      ? "app:app"
      : fileNames.has("server.py")
      ? "server:app"
      : "main:app";

    if (fileNames.has("manage.py") || lowerDeps.has("django")) {
      detectedFramework = "DJANGO";
      detectedLabel = "Django (Python)";
      suggestedBuildCommand = "python manage.py collectstatic --noinput";
      suggestedStartCommand = "gunicorn wsgi:application --bind 0.0.0.0:8000";
    } else if (lowerDeps.has("fastapi")) {
      detectedFramework = "FASTAPI";
      detectedLabel = "FastAPI (Python)";
      suggestedStartCommand = `uvicorn ${entryMod} --host 0.0.0.0 --port 8000`;
    } else if (lowerDeps.has("flask")) {
      detectedFramework = "PYTHON";
      detectedLabel = "Flask (Python)";
      suggestedStartCommand = fileNames.has("app.py")
        ? "gunicorn app:app --bind 0.0.0.0:8000"
        : "gunicorn main:app --bind 0.0.0.0:8000";
    } else if (lowerDeps.has("streamlit")) {
      detectedFramework = "PYTHON";
      detectedLabel = "Streamlit (Python)";
      defaultPort = 8501;
      const pyFile = fileNames.has("app.py") ? "app.py" : "main.py";
      suggestedStartCommand = `streamlit run ${pyFile} --server.port 8501 --server.address 0.0.0.0`;
    } else if (lowerDeps.has("gradio")) {
      detectedFramework = "PYTHON";
      detectedLabel = "Gradio (Python)";
      defaultPort = 7860;
      const pyFile = fileNames.has("app.py") ? "app.py" : "main.py";
      suggestedStartCommand = `python ${pyFile}`;
    } else if (lowerDeps.has("uvicorn")) {
      detectedFramework = "FASTAPI";
      detectedLabel = "Python ASGI (Uvicorn)";
      suggestedStartCommand = `uvicorn ${entryMod} --host 0.0.0.0 --port 8000`;
    }
  } else if (fileNames.has("index.html")) {
    detectedFramework = "STATIC";
    detectedLabel = "Static HTML / Nginx";
    language = "HTML / CSS / JS";
    defaultPort = 80;
  }

  const recommendedBuildMode = hasDockerfile ? "DOCKERFILE" : "AUTO";

  return {
    hasDockerfile,
    buildMode: recommendedBuildMode,
    buildType: hasDockerfile ? "DOCKERFILE" : detectedFramework,
    detectedFramework,
    detectedLabel: hasDockerfile ? `Dockerfile (${detectedLabel})` : detectedLabel,
    language,
    runtimeVersion,
    packageManager,
    manifestFile,
    dependencies,
    hasGitDependencies,
    defaultPort,
    suggestedBuildCommand,
    suggestedStartCommand,
    detectedFiles: input.fileNames.slice(0, 20),
  };
}
