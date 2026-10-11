import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

function formatBytes(bytes: number) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Files identified by full name first (e.g. Jenkinsfile has no extension)
function getFilenameLabel(originalName: string): string | null {
  const labels: Record<string, string> = {
    // CI/CD & Build
    "jenkinsfile":          "Jenkinsfile (CI/CD Pipeline)",
    "makefile":             "Makefile (Build Script)",
    "dockerfile":           "Dockerfile (Container Config)",
    "vagrantfile":          "Vagrantfile (VM Config)",
    "procfile":             "Procfile (Process Config)",
    "rakefile":             "Rakefile (Ruby Build)",
    "gruntfile.js":         "Gruntfile (Task Runner)",
    "gulpfile.js":          "Gulpfile (Task Runner)",
    // Git
    ".gitignore":           "Git Ignore File",
    ".gitattributes":       "Git Attributes File",
    // Editor / linting
    ".editorconfig":        "EditorConfig File",
    ".eslintrc":            "ESLint Config",
    ".eslintignore":        "ESLint Ignore File",
    ".prettierrc":          "Prettier Config",
    ".prettierignore":      "Prettier Ignore File",
    ".babelrc":             "Babel Config",
    // Node / JS tooling
    ".nvmrc":               "Node Version File",
    ".npmrc":               "NPM Config",
    ".yarnrc":              "Yarn Config",
    "package.json":         "NPM Package Config",
    "package-lock.json":    "NPM Lockfile",
    "yarn.lock":            "Yarn Lockfile",
    "pnpm-lock.yaml":       "PNPM Lockfile",
    "webpack.config.js":    "Webpack Config",
    "webpack.config.ts":    "Webpack Config",
    "vite.config.ts":       "Vite Config",
    "vite.config.js":       "Vite Config",
    "next.config.ts":       "Next.js Config",
    "next.config.js":       "Next.js Config",
    "tailwind.config.ts":   "Tailwind CSS Config",
    "tailwind.config.js":   "Tailwind CSS Config",
    "tsconfig.json":        "TypeScript Config",
    "jsconfig.json":        "JavaScript Config",
    "babel.config.js":      "Babel Config",
    "jest.config.js":       "Jest Test Config",
    "jest.config.ts":       "Jest Test Config",
    "vitest.config.ts":     "Vitest Config",
    // Python
    "requirements.txt":     "Python Requirements",
    "pipfile":              "Pipfile (Python Dependencies)",
    "pipfile.lock":         "Pipfile Lockfile",
    "pyproject.toml":       "Python Project Config",
    "setup.py":             "Python Setup Script",
    "setup.cfg":            "Python Setup Config",
    "tox.ini":              "Tox Test Config",
    // PHP
    "composer.json":        "PHP Composer Config",
    "composer.lock":        "PHP Composer Lockfile",
    // Rust
    "cargo.toml":           "Rust Cargo Config",
    "cargo.lock":           "Rust Cargo Lockfile",
    // Go
    "go.mod":               "Go Module File",
    "go.sum":               "Go Checksum File",
    // Ruby
    "gemfile":              "Gemfile (Ruby Dependencies)",
    "gemfile.lock":         "Gemfile Lockfile",
    // Java / JVM
    "pom.xml":              "Maven Build File",
    "build.gradle":         "Gradle Build File",
    "build.gradle.kts":     "Gradle Build File (Kotlin)",
    "settings.gradle":      "Gradle Settings",
    "settings.gradle.kts":  "Gradle Settings (Kotlin)",
    // CMake
    "cmakelists.txt":       "CMake Build File",
    // Terraform / IaC
    "main.tf":              "Terraform Main Config",
    "variables.tf":         "Terraform Variables",
    "outputs.tf":           "Terraform Outputs",
    // Docker Compose
    "docker-compose.yml":   "Docker Compose Config",
    "docker-compose.yaml":  "Docker Compose Config",
    // Kubernetes
    "kustomization.yaml":   "Kustomize Config",
    "kustomization.yml":    "Kustomize Config",
    // Ansible
    "ansible.cfg":          "Ansible Config",
    "inventory":            "Ansible Inventory",
    "playbook.yml":         "Ansible Playbook",
    // Misc
    ".htaccess":            "Apache Config (.htaccess)",
    "nginx.conf":           "Nginx Config",
    "robots.txt":           "Robots.txt File",
    "readme.md":            "README Document",
    "changelog.md":         "Changelog Document",
    "license":              "License File",
    "license.md":           "License File",
    "license.txt":          "License File",
    "contributing.md":      "Contributing Guide",
  };
  return labels[originalName.toLowerCase()] ?? null;
}

// Identify by extension
function getTypeLabel(mimeType: string, originalName: string): string {
  const ext = originalName.toLowerCase().slice(originalName.lastIndexOf("."));

  // Image
  const imageLabels: Record<string, string> = {
    ".jpg": "JPEG Image", ".jpeg": "JPEG Image", ".png": "PNG Image",
    ".gif": "GIF Image", ".webp": "WebP Image", ".svg": "SVG Vector Image",
    ".avif": "AVIF Image", ".bmp": "Bitmap Image", ".tiff": "TIFF Image",
    ".ico": "Icon Image",
  };
  if (imageLabels[ext]) return imageLabels[ext];
  if (mimeType.startsWith("image/")) return "Image";

  // Video
  const videoLabels: Record<string, string> = {
    ".mp4": "MP4 Video", ".webm": "WebM Video", ".mov": "QuickTime Video",
    ".avi": "AVI Video", ".mkv": "MKV Video", ".ogv": "OGG Video",
    ".m4v": "M4V Video", ".flv": "Flash Video", ".wmv": "WMV Video",
  };
  if (videoLabels[ext]) return videoLabels[ext];
  if (mimeType.startsWith("video/")) return "Video";

  // Audio
  const audioLabels: Record<string, string> = {
    ".mp3": "MP3 Audio", ".ogg": "OGG Audio", ".wav": "WAV Audio",
    ".flac": "FLAC Audio", ".aac": "AAC Audio", ".m4a": "M4A Audio",
    ".opus": "Opus Audio", ".wma": "WMA Audio",
  };
  if (audioLabels[ext]) return audioLabels[ext];
  if (mimeType.startsWith("audio/")) return "Audio";

  // Documents
  if (ext === ".pdf" || mimeType === "application/pdf") return "PDF Document";

  // Office
  const officeLabels: Record<string, string> = {
    ".doc": "Word Document", ".docx": "Word Document", ".odt": "OpenDocument Text",
    ".xls": "Excel Spreadsheet", ".xlsx": "Excel Spreadsheet", ".ods": "OpenDocument Spreadsheet",
    ".ppt": "PowerPoint Presentation", ".pptx": "PowerPoint Presentation", ".odp": "OpenDocument Presentation",
    ".rtf": "Rich Text Document",
  };
  if (officeLabels[ext]) return officeLabels[ext];

  // Text / Code
  const textLabels: Record<string, string> = {
    ".txt": "Plain Text File", ".md": "Markdown File", ".csv": "CSV Spreadsheet",
    ".json": "JSON File", ".xml": "XML File", ".yaml": "YAML File", ".yml": "YAML File",
    ".toml": "TOML Config File", ".ini": "Config File", ".env": "Environment File",
    // Web
    ".html": "HTML File", ".htm": "HTML File", ".css": "CSS Stylesheet",
    ".js": "JavaScript File", ".jsx": "React JSX File",
    ".ts": "TypeScript File", ".tsx": "TypeScript React File",
    ".vue": "Vue Component", ".svelte": "Svelte Component",
    // Backend / scripting
    ".py": "Python Script", ".rb": "Ruby Script", ".php": "PHP Script",
    ".go": "Go Source File", ".rs": "Rust Source File", ".java": "Java Source File",
    ".kt": "Kotlin Source File", ".swift": "Swift Source File",
    ".c": "C Source File", ".cpp": "C++ Source File", ".h": "C Header File",
    ".cs": "C# Source File", ".vb": "Visual Basic File",
    ".sh": "Shell Script", ".bash": "Bash Script", ".zsh": "Zsh Script",
    ".ps1": "PowerShell Script", ".bat": "Batch Script", ".cmd": "Command Script",
    // Data / config
    ".sql": "SQL File", ".graphql": "GraphQL Schema", ".proto": "Protobuf File",
    ".tf": "Terraform File", ".hcl": "HCL Config File",
    // Other dev
    ".log": "Log File", ".diff": "Diff/Patch File", ".lock": "Lockfile",
    ".wasm": "WebAssembly File",
  };
  if (textLabels[ext]) return textLabels[ext];
  if (mimeType.startsWith("text/")) return "Text File";

  // Archives
  const archiveLabels: Record<string, string> = {
    ".zip": "ZIP Archive", ".tar": "TAR Archive", ".gz": "GZip Archive",
    ".rar": "RAR Archive", ".7z": "7-Zip Archive",
  };
  if (archiveLabels[ext]) return archiveLabels[ext];

  // Fallback — derive from MIME subtype
  if (mimeType.includes("/")) {
    const sub = mimeType.split("/")[1].replace(/[^a-zA-Z0-9]/g, " ").toUpperCase();
    return `${sub} File`;
  }

  return "File";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) {
    return { title: "File Not Found" };
  }

  try {
    const media = await prisma.secureMedia.findUnique({
      where: { token },
      select: { originalName: true, mimeType: true, size: true, expiresAt: true, isPublic: true },
    });

    if (!media || (media.expiresAt && media.expiresAt < new Date())) {
      return {
        title: "Link Expired",
        description: "This secure file link has expired or is no longer available.",
        robots: { index: false, follow: false },
      };
    }

    if (!media.isPublic) {
      return {
        title: "Private File - Masdika Secure Media",
        description: "This secure file is private and restricted.",
        robots: { index: false, follow: false },
      };
    }

    const typeLabel = getFilenameLabel(media.originalName) ?? getTypeLabel(media.mimeType, media.originalName);
    const size = formatBytes(media.size);
    const expiry = media.expiresAt
      ? `Expires ${new Date(media.expiresAt!).toLocaleDateString()}`
      : "Permanent link";

    const title = media.originalName;
    const description = `${typeLabel} - ${size} - ${expiry} - Shared securely via Masdika Secure Media. Click to preview or download.`;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.masdika.id";

    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        url: `${siteUrl}/media/${token}`,
        siteName: "Masdika Secure Media",
        type: "website",
        images: [{ url: "/og-image.webp", width: 1200, height: 630, alt: media.originalName }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og-image.webp"],
      },
    };
  } catch {
    return { title: "Secure File" };
  }
}

export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
