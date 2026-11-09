"use client";

import { useState } from "react";
import { Copy, Check, Code } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function resolveCodeBlockMeta(langOrTitle: string, code: string): { language: string; title: string } {
  const trimmed = (langOrTitle || '').trim();
  const lower = trimmed.toLowerCase();

  // 1. Detect if code is an ASCII diagram / architectural flow chart
  const hasArrows = code.includes('-->') || code.includes('+---') || /\n\s*v\s*\n/.test(code) || /\|\s*\n\s*v/.test(code);
  const isAsciiDiagram = hasArrows && (code.includes('|') || code.includes('+') || code.includes('>'));

  if (isAsciiDiagram && (!trimmed || lower === 'bash' || lower === 'sh' || lower === 'shell' || lower === 'text')) {
    return {
      language: 'text',
      title: trimmed && lower !== 'bash' && lower !== 'sh' && lower !== 'shell' ? trimmed : 'Architecture Diagram'
    };
  }

  // 2. Explicit language / title mapping
  if (lower) {
    if (lower.includes('php') || lower.includes('laravel')) return { language: 'php', title: trimmed || 'PHP' };
    if (lower === 'jsx' || lower.includes('reactjs')) return { language: 'jsx', title: trimmed || 'React JSX' };
    if (lower === 'tsx' || lower.includes('reactts')) return { language: 'tsx', title: trimmed || 'React TSX' };
    if (lower === 'ts' || lower.includes('typescript')) return { language: 'typescript', title: trimmed || 'TypeScript' };
    if (lower === 'js' || lower.includes('javascript') || lower === 'node') return { language: 'javascript', title: trimmed || 'JavaScript' };
    if (lower === 'py' || lower.includes('python')) return { language: 'python', title: trimmed || 'Python' };
    if (lower === 'go' || lower.includes('golang')) return { language: 'go', title: trimmed || 'Go' };
    if (lower === 'rs' || lower.includes('rust')) return { language: 'rust', title: trimmed || 'Rust' };
    if (lower.includes('yaml') || lower.includes('yml')) return { language: 'yaml', title: trimmed || 'YAML' };
    if (lower.includes('docker')) return { language: 'dockerfile', title: trimmed || 'Dockerfile' };
    if (lower.includes('sql') || lower.includes('mysql') || lower.includes('pgsql') || lower.includes('postgres')) return { language: 'sql', title: trimmed || 'SQL' };
    if (lower.includes('html')) return { language: 'html', title: trimmed || 'HTML' };
    if (lower.includes('css')) return { language: 'css', title: trimmed || 'CSS' };
    if (lower.includes('json')) return { language: 'json', title: trimmed || 'JSON' };
    if (lower.includes('k8s') || lower.includes('kube') || lower.includes('kubernetes')) return { language: 'yaml', title: trimmed || 'Kubernetes' };
    if (lower.includes('sh') || lower.includes('bash') || lower.includes('shell') || lower.includes('zsh')) return { language: 'bash', title: trimmed || 'Bash' };
    if (lower.includes('text') || lower.includes('txt') || lower.includes('plain')) return { language: 'text', title: trimmed || 'Plain Text' };
    return { language: lower, title: trimmed };
  }

  // 3. Fallback when no language is specified
  const hasBashCommand = /^\s*(npm|pnpm|yarn|git|docker|kubectl|curl|sudo|apt|cd|mkdir|echo|cat|export|helm)\b/m.test(code);
  if (hasBashCommand) {
    return { language: 'bash', title: 'Terminal' };
  }

  return { language: 'text', title: 'Code' };
}

const normalizeLanguage = (lang: string) => {
  const l = (lang || '').toLowerCase();
  switch (l) {
    case 'sh':
    case 'shell':
    case 'zsh':
      return 'bash';
    case 'yml':
      return 'yaml';
    case 'js':
    case 'node':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'py':
      return 'python';
    case 'golang':
      return 'go';
    case 'rs':
      return 'rust';
    case 'text':
    case 'txt':
    case 'plain':
    case 'plaintext':
    case 'diagram':
      return 'text';
    default:
      return l || 'text';
  }
};

const getLanguageIconUrl = (lang: string) => {
  const l = (lang || '').toLowerCase();
  switch (l) {
    case "bash":
    case "sh":
    case "shell":
    case "zsh":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_shell.svg";
    case "linux":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg";
    case "kubernetes":
    case "kube":
    case "k8s":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_kubernetes.svg";
    case "yaml":
    case "yml":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_yaml.svg";
    case "json":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_json.svg";
    case "js":
    case "javascript":
    case "node":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_js.svg";
    case "ts":
    case "typescript":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_typescript.svg";
    case "react":
    case "jsx":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_reactjs.svg";
    case "tsx":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_reactts.svg";
    case "nextjs":
    case "next":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_light_next.svg";
    case "css":
    case "scss":
    case "sass":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_css.svg";
    case "html":
    case "xml":
    case "svg":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_html.svg";
    case "python":
    case "py":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_python.svg";
    case "php":
    case "laravel":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/php/php-original.svg";
    case "ruby":
    case "rb":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ruby/ruby-original.svg";
    case "go":
    case "golang":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/go/go-original.svg";
    case "rust":
    case "rs":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/rust/rust-original.svg";
    case "java":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg";
    case "c":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg";
    case "cpp":
    case "c++":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg";
    case "sql":
    case "mysql":
    case "pgsql":
    case "postgres":
    case "postgresql":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_sql.svg";
    case "docker":
    case "dockerfile":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_docker.svg";
    case "terraform":
    case "tf":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_terraform.svg";
    case "jenkins":
    case "jenkinsfile":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jenkins/jenkins-original.svg";
    case "nginx":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nginx/nginx-original.svg";
    case "markdown":
    case "md":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_markdown.svg";
    case "text":
    case "txt":
    case "plain":
    case "plaintext":
    case "diagram":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_text.svg";
    default:
      return null;
  }
};

export function CodeBlock({
  code,
  language = "bash",
  title,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normLang = normalizeLanguage(language);

  const getLanguageIcon = () => {
    const iconUrl = getLanguageIconUrl(language) || getLanguageIconUrl(normLang);
    if (iconUrl) {
      return (
        <img
          referrerPolicy="no-referrer"
          src={iconUrl}
          alt={language}
          className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
          loading="lazy"
          decoding="async"
        />
      );
    }
    return <Code className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 shrink-0" />;
  };

  const displayTitle = title || language;

  return (
    <div className="rounded-xl overflow-hidden shadow-2xl my-8 bg-[#0c1017] border border-slate-700/60 dark:border-white/10 transition-colors">
      {/* Tab Style Header - Dedicated high-contrast dark terminal header */}
      <div className="flex items-end justify-between px-3 sm:px-4 pt-2.5 sm:pt-3 bg-[#080c14] border-b border-slate-800/80">
        <div className="flex items-center min-w-0 flex-1 mr-4">
          {/* macOS traffic light buttons */}
          <div className="flex gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 mr-4 sm:mr-6 shrink-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f]" />
          </div>
          
          {/* The Tab */}
          <div className="flex items-center gap-2 bg-[#0c1017] px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-lg border-x border-t border-slate-800/90 shadow-[0_-2px_10px_rgba(0,0,0,0.3)] min-w-0">
            <div className="shrink-0">{getLanguageIcon()}</div>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide font-mono truncate">
              {displayTitle}
            </span>
          </div>
        </div>

        <button
          onClick={copyToClipboard}
          className="text-zinc-400 hover:text-white transition-colors pb-2.5 sm:pb-3 px-2 flex items-center justify-center shrink-0"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-cyan-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="bg-[#0c1017] overflow-x-auto hide-scrollbar">
        <SyntaxHighlighter
          language={normLang}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={false}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            backgroundColor: '#0c1017',
            fontSize: '13.5px',
            lineHeight: '1.65',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            overflowWrap: 'normal',
          }}
          codeTagProps={{
            className: "font-mono",
            style: { 
              fontFamily: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              whiteSpace: 'pre', 
              wordBreak: 'normal', 
              overflowWrap: 'normal',
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
