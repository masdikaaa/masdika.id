"use client";

import { useState } from "react";
import { Server, Globe, Database, Lock, Cloud, Code, Cpu, Network, Shield, Terminal, Box, Layers } from "lucide-react";

/**
 * Maps common tech name keywords → skillicons.dev icon ID
 * Format: https://skillicons.dev/icons?i=ICON_ID&theme=dark
 */
const SKILL_ICON_MAP: Record<string, string> = {
  // Frontend
  "react":          "react",
  "next":           "nextjs",
  "nextjs":         "nextjs",
  "next.js":        "nextjs",
  "vue":            "vue",
  "vuejs":          "vue",
  "vue.js":         "vue",
  "nuxt":           "nuxtjs",
  "nuxtjs":         "nuxtjs",
  "angular":        "angular",
  "svelte":         "svelte",
  "astro":          "astro",
  "remix":          "remix",
  "gatsby":         "gatsby",
  "html":           "html",
  "css":            "css",
  "sass":           "sass",
  "tailwind":       "tailwind",
  "tailwindcss":    "tailwind",
  "tailwind css":   "tailwind",
  "bootstrap":      "bootstrap",
  "materialui":     "materialui",
  "material ui":    "materialui",
  "vite":           "vite",
  "webpack":        "webpack",
  "redux":          "redux",
  "jquery":         "jquery",
  "threejs":        "threejs",
  "three.js":       "threejs",
  "htmx":           "htmx",
  "alpinejs":       "alpinejs",
  "alpine.js":      "alpinejs",
  "windicss":       "windicss",
  "p5js":           "p5js",
  "js":             "js",
  "typescript":     "ts",
  "ts":             "ts",
  "python":         "py",
  "py":             "py",
  "php":            "php",
  "java":           "java",
  "kotlin":         "kotlin",
  "swift":          "swift",
  "rust":           "rust",
  "go":             "go",
  "golang":         "go",
  "ruby":           "ruby",
  "c#":             "cs",
  "csharp":         "cs",
  "c++":            "cpp",
  "cpp":            "cpp",
  "c":              "c",
  "dart":           "dart",
  "scala":          "scala",
  "elixir":         "elixir",
  "haskell":        "haskell",
  "lua":            "lua",
  "perl":           "perl",
  "r":              "r",
  "bash":           "bash",
  "shell":          "bash",
  "powershell":     "powershell",

  // Backend / Frameworks
  "nodejs":         "nodejs",
  "node.js":        "nodejs",
  "node":           "nodejs",
  "express":        "express",
  "expressjs":      "express",
  "express.js":     "express",
  "nestjs":         "nestjs",
  "nest.js":        "nestjs",
  "django":         "django",
  "flask":          "flask",
  "fastapi":        "fastapi",
  "laravel":        "laravel",
  "symfony":        "symfony",
  "rails":          "rails",
  "spring":         "spring",
  "deno":           "deno",
  "bun":            "bun",
  "elysia":         "elysia",
  "adonis":         "adonis",

  // Database
  "mysql":          "mysql",
  "mariadb":        "mysql",
  "postgresql":     "postgres",
  "postgres":       "postgres",
  "mongodb":        "mongodb",
  "mongo":          "mongodb",
  "redis":          "redis",
  "sqlite":         "sqlite",
  "cassandra":      "cassandra",
  "dynamodb":       "dynamodb",
  "elasticsearch":  "elasticsearch",
  "supabase":       "supabase",
  "planetscale":    "planetscale",
  "firebase":       "firebase",

  // ORM / Query
  "prisma":         "prisma",
  "prisma orm":     "prisma",
  "sequelize":      "sequelize",
  "hibernate":      "hibernate",

  // DevOps / Cloud
  "docker":         "docker",
  "kubernetes":     "kubernetes",
  "k8s":            "kubernetes",
  "eks":            "kubernetes",
  "aws":            "aws",
  "amazon web services": "aws",
  "azure":          "azure",
  "gcp":            "gcp",
  "google cloud":   "gcp",
  "cloudflare":     "cloudflare",
  "nginx":          "nginx",
  "apache":         "html",
  "linux":          "linux",
  "ubuntu":         "ubuntu",
  "debian":         "debian",
  "arch":           "arch",
  "kali":           "kali",
  "bash/linux":     "bash",
  "terraform":      "terraform",
  "ansible":        "ansible",
  "jenkins":        "jenkins",
  "githubactions":  "githubactions",
  "github actions": "githubactions",
  "vercel":         "vercel",
  "netlify":        "netlify",
  "heroku":         "heroku",
  "openshift":      "openshift",
  "openstack":      "openstack",
  "prometheus":     "prometheus",
  "grafana":        "grafana",
  "kafka":          "kafka",
  "rabbitmq":       "rabbitmq",

  // Tools
  "git":            "git",
  "github":         "github",
  "gitlab":         "gitlab",
  "bitbucket":      "bitbucket",
  "vscode":         "vscode",
  "vim":            "vim",
  "neovim":         "neovim",
  "postman":        "postman",
  "figma":          "figma",
  "babel":          "babel",
  "jest":           "jest",
  "cypress":        "cypress",
  "selenium":       "selenium",
  "graphql":        "graphql",
  "apollo":         "apollo",
  "npm":            "npm",
  "yarn":           "yarn",
  "pnpm":           "pnpm",
  "discord":        "discord",
  "notion":         "notion",
  "obsidian":       "obsidian",
  "replit":         "replit",
  "sentry":         "sentry",
  "pytorch":        "pytorch",
  "tensorflow":     "tensorflow",
  "opencv":         "opencv",
  "wasm":           "wasm",
  "webassembly":    "wasm",
  "solidity":       "solidity",
  "electron":       "electron",
  "tauri":          "tauri",
  "flutter":        "flutter",
  "unity":          "unity",
  "unreal":         "unreal",
  "blender":        "blender",
  "raspberrypi":    "raspberrypi",
  "raspberry pi":   "raspberrypi",
  "arduino":        "arduino",
  "latex":          "latex",
  "markdown":       "md",
};

/** Fallback lucide icon when no skillicons match */
function FallbackIcon({ tech }: { tech: string }) {
  const t = tech.toLowerCase();
  if (t.includes("kube") || t.includes("eks") || t.includes("server"))
    return <Server className="w-6 h-6 text-cyan-400" />;
  if (t.includes("aws") || t.includes("cloud") || t.includes("gcp") || t.includes("azure"))
    return <Cloud className="w-6 h-6 text-cyan-400" />;
  if (t.includes("data") || t.includes("sql") || t.includes("mongo") || t.includes("db"))
    return <Database className="w-6 h-6 text-cyan-400" />;
  if (t.includes("network") || t.includes("mesh") || t.includes("ssl") || t.includes("tls"))
    return <Lock className="w-6 h-6 text-cyan-400" />;
  if (t.includes("react") || t.includes("next") || t.includes("node") || t.includes("js"))
    return <Code className="w-6 h-6 text-cyan-400" />;
  if (t.includes("linux") || t.includes("terminal") || t.includes("bash") || t.includes("shell"))
    return <Terminal className="w-6 h-6 text-zinc-300" />;
  if (t.includes("api") || t.includes("rest") || t.includes("graphql"))
    return <Layers className="w-6 h-6 text-cyan-400" />;
  if (t.includes("cpu") || t.includes("microservice"))
    return <Cpu className="w-6 h-6 text-cyan-400" />;
  return <Globe className="w-6 h-6 text-zinc-400" />;
}

/** Resolve a tech name string to a skillicons icon ID, or null if not found */
function resolveSkillIcon(tech: string): string | null {
  const normalized = tech.toLowerCase().trim();
  // Exact match first
  if (SKILL_ICON_MAP[normalized]) return SKILL_ICON_MAP[normalized];
  // Partial keyword match
  for (const [key, id] of Object.entries(SKILL_ICON_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return id;
  }
  return null;
}

interface TechIconProps {
  tech: string;
  size?: number;
}

export function TechIcon({ tech, size = 28 }: TechIconProps) {
  const [imgError, setImgError] = useState(false);
  const iconId = resolveSkillIcon(tech);

  if (iconId && !imgError) {
    return (
      <img referrerPolicy="no-referrer" 
        src={`https://skillicons.dev/icons?i=${iconId}&theme=dark`}
        alt={tech}
        width={size}
        height={size}
        className="object-contain shrink-0"
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  return <FallbackIcon tech={tech} />;
}
