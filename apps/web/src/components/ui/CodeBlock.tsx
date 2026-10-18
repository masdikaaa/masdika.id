"use client";

import { useState } from "react";
import { Copy, Check, Code } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

const getLanguageIconUrl = (lang: string) => {
  const l = lang.toLowerCase();
  switch (l) {
    case "bash":
    case "sh":
    case "shell":
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
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_css.svg";
    case "html":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_html.svg";
    case "python":
    case "py":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_python.svg";
    case "php":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/php/php-original.svg";
    case "ruby":
    case "rb":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ruby/ruby-original.svg";
    case "go":
    case "golang":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/go/go-original.svg";
    case "docker":
    case "dockerfile":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_docker.svg";
    case "terraform":
    case "tf":
      return "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_terraform.svg";
    case "jenkins":
    case "jenkinsfile":
      return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jenkins/jenkins-original.svg";
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

  const getLanguageIcon = () => {
    const iconUrl = getLanguageIconUrl(language);
    if (iconUrl) {
      return <img referrerPolicy="no-referrer" src={iconUrl} alt={language} className="w-5 h-5 object-contain" loading="lazy" decoding="async" />;
    }
    return <Code className="w-5 h-5 text-zinc-400" />;
  };

  // Syntax highlighting is now handled by react-syntax-highlighter

  return (
    <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border-primary)] shadow-2xl my-8">
      {/* Tab Style Header like the screenshot */}
      <div className="flex items-end justify-between px-4 pt-3 bg-[var(--surface-secondary)] border-b border-[var(--border-primary)]">
        <div className="flex items-center min-w-0 flex-1 mr-4">
          {/* macOS buttons */}
          <div className="flex gap-2 pb-3 mr-6 shrink-0">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          
          {/* The Tab */}
          <div className="flex items-center gap-2 bg-[var(--surface)] px-4 py-2.5 rounded-t-lg border-x border-t border-[var(--border-primary)] shadow-[0_-2px_10px_rgba(0,0,0,0.2)] min-w-0">
            <div className="shrink-0">{getLanguageIcon()}</div>
            <span className="text-sm font-semibold text-white tracking-wide truncate">
              {title || language}
            </span>
          </div>
        </div>

        <button
          onClick={copyToClipboard}
          className="text-zinc-500 hover:text-white transition-colors pb-3 px-2"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-cyan-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Code Content */}
      <div className="bg-[var(--surface)] overflow-x-auto hide-scrollbar">
        <SyntaxHighlighter
          language={language.toLowerCase() === 'sh' ? 'bash' : (language.toLowerCase() === 'yml' ? 'yaml' : language.toLowerCase())}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={false}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            background: 'transparent',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            overflowWrap: 'normal',
          }}
          codeTagProps={{
            className: "font-mono",
            style: { fontFamily: 'inherit', whiteSpace: 'pre', wordBreak: 'normal', overflowWrap: 'normal' }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
