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
    case "text":
    case "txt":
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

  const getLanguageIcon = () => {
    const iconUrl = getLanguageIconUrl(language);
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
          language={
            language.toLowerCase() === 'sh' ? 'bash' : 
            (language.toLowerCase() === 'yml' ? 'yaml' : 
            (language.toLowerCase() === 'text' || language.toLowerCase() === 'txt' ? 'text' : language.toLowerCase()))
          }
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={false}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            backgroundColor: '#0c1017',
            color: '#e2e8f0',
            fontSize: '13.5px',
            lineHeight: '1.65',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            overflowWrap: 'normal',
          }}
          codeTagProps={{
            className: "font-mono text-slate-200",
            style: { 
              fontFamily: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              whiteSpace: 'pre', 
              wordBreak: 'normal', 
              overflowWrap: 'normal',
              color: '#e2e8f0'
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
