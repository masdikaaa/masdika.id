"use client";

import { useRef, useState, useEffect } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Calendar, Clock, ChevronLeft, Heart, Share2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ImageZoom } from "@/components/ui/ImageZoom";
import { Button } from "@/components/ui/Button";

import { renderMarkdown } from "@/lib/markdown";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const Github = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);
const Facebook = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path></svg>;
const Twitter = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>;
const Linkedin = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>;
const Instagram = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.98a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>;

function MarkdownPreview({ content, isDark }: { content: string, isDark: boolean }) {
  const parts = content.split(/```/);

  return (
    <div className={cn("w-full max-w-none font-sans break-words prose", isDark ? "prose-invert text-zinc-300" : "text-slate-700")}>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const match = part.match(/^([^\n]*)\n([\s\S]*)$/);
          const langOrTitle = match ? match[1].trim() : '';
          const code = match ? match[2] : part;

          let language = 'bash';
          let title = langOrTitle;

          if (langOrTitle) {
            const lower = langOrTitle.toLowerCase();
            if (lower.includes('php') || lower.includes('laravel')) language = 'php';
            else if (lower.includes('js') || lower.includes('jsx')) language = 'javascript';
            else if (lower.includes('ts') || lower.includes('tsx')) language = 'typescript';
            else if (lower.includes('yaml') || lower.includes('yml')) language = 'yaml';
            else if (lower.includes('html')) language = 'html';
            else if (lower.includes('css')) language = 'css';
            else if (lower.includes('json')) language = 'json';
            else if (lower.includes('sh') || lower.includes('bash')) language = 'bash';
            else language = lower;
          }

          return (
            <div key={index} className="not-prose my-8">
              <CodeBlock code={code.trim()} language={language} title={title || language} />
            </div>
          );
        } else {
          return <div key={index} dangerouslySetInnerHTML={{ __html: renderMarkdown(part) }} />;
        }
      })}
    </div>
  );
}

interface BlogPostClientProps {
  initialPost: any;
  initialRecentPosts: any[];
  slug: string;
}

export function BlogPostClient({ initialPost, initialRecentPosts, slug }: BlogPostClientProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [post, setPost] = useState<any>(initialPost);
  const [recentPosts] = useState<any[]>(initialRecentPosts);

  // Compute TOC immediately from initial content so it never flickers
  const [toc] = useState<{ id: string, text: string, level: number, displayNumber?: string }[]>(() => {
    if (!initialPost?.content) return [];
    const headings = [];
    const regex = /^(#{2,3})\s+(.*)$/gm;
    let match;
    let h2Count = 0;
    let h3Count = 0;
    while ((match = regex.exec(initialPost.content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();

      const displayText = text
        .replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]*>?/gm, '')
        .replace(/[*`_~]/g, '')
        .trim();

      const idText = text
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]*>?/gm, '')
        .replace(/[*`_~]/g, '')
        .trim();

      const id = idText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let displayNumber = "";
      if (level === 2) {
        h2Count++;
        h3Count = 0;
        displayNumber = `${h2Count}`;
      } else if (level === 3) {
        h3Count++;
        displayNumber = `${h2Count}.${h3Count}`;
      } else {
        displayNumber = "*";
      }
      headings.push({ id, text: displayText, level, displayNumber });
    }
    return headings;
  });

  // Drag to scroll logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Reaction State
  const [reactionCount, setReactionCount] = useState(initialPost?.reactionsCount || 0);
  const [hasReacted, setHasReacted] = useState(initialPost?.hasReacted || false);
  const [isReacting, setIsReacting] = useState(false);

  // Comment Form State
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [commentError, setCommentError] = useState("");

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const renderCommentText = (content: string, isEditing: boolean = false) => {
    if (!content) return null;
    const parts = content.split(/(@[a-zA-Z0-9_.-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return <span key={index} className={cn(isDark ? "text-cyan-400" : "text-cyan-600", !isEditing && 'font-semibold')}>{part}</span>;
      }
      return part;
    });
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName || !commentEmail || !commentContent) return;

    const trimmedName = commentName.trim();
    if (trimmedName && trimmedName[0] !== trimmedName[0].toUpperCase()) {
      setCommentError("Name must start with a capital letter.");
      return;
    }

    setSubmittingComment(true);
    setCommentError("");

    try {
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: commentName, email: commentEmail, content: commentContent, parentId: replyTo?.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit comment");

      setCommentSuccess(true);
      setCommentName("");
      setCommentEmail("");
      setCommentContent("");
      setReplyTo(null);

      // Refresh post data to show new comment
      const postRes = await fetch(`/api/posts/${slug}`);
      const postData = await postRes.json();
      setPost(postData);

      setTimeout(() => setCommentSuccess(false), 5000);
    } catch (err: any) {
      setCommentError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Real-time polling for comments and reactions
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/posts/${slug}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setPost((prev: any) => {
              if (prev && JSON.stringify(prev.comments) !== JSON.stringify(data.comments)) {
                return { ...prev, comments: data.comments };
              }
              return prev;
            });
            setReactionCount((prev: number) => data.reactionsCount !== undefined ? data.reactionsCount : prev);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  const handleReact = async () => {
    if (hasReacted || isReacting) return;
    setIsReacting(true);
    try {
      const res = await fetch(`/api/posts/${slug}/react`, { method: "POST" });
      if (res.ok) {
        setHasReacted(true);
        setReactionCount((prev: number) => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReacting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const recentPostsRef = useRef(null);

  if (!post) {
    return (
      <div className="pt-28 md:pt-32 pb-12 lg:pb-16 text-center min-h-screen">
        <h1 className={cn("text-3xl font-bold mb-4", isDark ? "bg-gradient-to-br from-cyan-400 to-cyan-200 bg-clip-text text-transparent" : "text-slate-900")}>Post not found</h1>
        <Link href="/blog" className={cn("hover:underline", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-500")}>Return to Blog</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-w-0">
      <div className="pt-28 md:pt-32 pb-12 lg:pb-16 max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
        <header className="mb-12 relative">
          <div className="relative z-10">
            <Link href="/blog" className={cn("inline-flex items-center text-sm font-medium mb-8 transition-colors gap-2 group", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", isDark ? "bg-white/5 border border-white/10 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30" : "bg-white border border-black/10 group-hover:bg-cyan-50 group-hover:border-cyan-200")}>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              Back to Articles
            </Link>

            <div className={cn("flex flex-wrap items-center gap-4 text-sm font-medium mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              <span className={cn("px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm", isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border border-cyan-200")}>
                {post.category?.name || "Uncategorized"}
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-zinc-500" /> {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Clock className="w-4 h-4 text-zinc-500" /> {post.readTime} min read
              </span>
            </div>

            <h1 className={cn("text-3xl sm:text-4xl md:text-5xl font-black mb-8 leading-[1.3] break-words", isDark ? "text-white" : "text-slate-900")} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {post.title}
            </h1>

            <div className={cn("inline-flex items-center gap-4 p-2 pr-6 rounded-full border backdrop-blur-md", isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-black/10 shadow-sm")}>
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl uppercase overflow-hidden shrink-0 border", isDark ? "border-white/10 bg-cyan-950/50" : "border-black/5 bg-slate-100")}>
                {post.adminImage ? (
                  <img referrerPolicy="no-referrer" src={post.adminImage} alt="Author" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>{(post.author?.name || post.adminName || "A")[0]}</span>
                )}
              </div>
              <div>
                <div className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>{post.author?.name || post.adminName || "Admin"}</div>
                <div className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Author</div>
              </div>
            </div>
          </div>
        </header>

        {post.image && (
          <ImageZoom src={post.image} alt={post.title} />
        )}

        {/* Table of Contents */}
        {toc.length > 0 && (
          <details className={cn("group backdrop-blur-xl border border-l-4 p-5 sm:p-6 rounded-2xl rounded-tr-[2rem] rounded-bl-[2rem] mb-12 shadow-xl w-full max-w-full min-w-0 transition-all duration-300", isDark ? "bg-[var(--surface)] border-[var(--border-primary)] border-l-cyan-400 shadow-black/40" : "bg-white border-black/5 border-l-cyan-500")} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <summary className="text-lg font-bold flex items-center cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none outline-none">
              <div className={cn("flex items-center gap-2 flex-1", isDark ? "text-white" : "text-slate-900")}>
                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                <span>Table of Contents</span>
              </div>
              <span className={cn("w-8 h-8 rounded-full flex items-center justify-center group-open:rotate-180 transition-all duration-300", isDark ? "bg-cyan-950/30 hover:bg-cyan-950/40 text-zinc-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className={cn("mt-5 pt-4 border-t", isDark ? "border-slate-700/80" : "border-black/5")}>
              <ul className="space-y-3">
                {toc.map((heading, idx) => (
                  <li key={idx} className={heading.level === 3 ? "ml-4" : ""}>
                    <a href={`#${heading.id}`} className={cn("transition-colors flex items-start gap-2 break-words min-w-0 w-full", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-600 hover:text-cyan-600")}>
                      <span className={cn("font-mono text-sm shrink-0 pt-0.5", isDark ? "text-zinc-600" : "text-slate-400")}>{heading.displayNumber}</span>
                      <span className="leading-snug">{heading.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}

        {/* Content */}
        <article className="max-w-none mb-16 overflow-hidden">
          <MarkdownPreview content={post.content} isDark={isDark} />
        </article>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-12">
            {post.tags.map((item: any) => {
              const tag = item.tag || item;
              return (
                <span
                  key={tag.id || tag.name}
                  className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg border", isDark ? "bg-white/[0.03] text-zinc-400 border-white/5" : "bg-slate-100 text-slate-600 border-black/5")}
                >
                  #{tag.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Share & Reactions Bar */}
        <div className={cn("py-6 border-y flex items-center justify-between mb-16", isDark ? "border-white/10" : "border-black/5")}>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReact}
              disabled={hasReacted || isReacting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-semibold",
                hasReacted
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : isDark
                    ? "bg-white/5 border-white/10 text-zinc-400 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5"
                    : "bg-white border-black/10 text-slate-600 hover:border-red-500/30 hover:text-red-500 hover:bg-red-50 shadow-sm"
              )}
            >
              <Heart className={cn("w-4 h-4 transition-transform", hasReacted ? "fill-red-500 scale-110" : "")} />
              <span>{reactionCount}</span>
            </button>
            <a
              href="#comments-section"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-semibold",
                isDark
                  ? "bg-white/5 border-white/10 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30"
                  : "bg-white border-black/10 text-slate-600 hover:text-cyan-600 hover:border-cyan-500/30 shadow-sm"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments?.length || 0}</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className={cn(
                "p-2.5 rounded-full border transition-colors",
                isDark
                  ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                  : "bg-white border-black/10 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
              )}
              title="Share Article"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Author Bio Box */}
        <div className={cn("p-8 rounded-3xl border flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left mb-16", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-slate-50 border-black/5")}>
          <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full overflow-hidden border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500 to-cyan-600">
            {post.adminImage ? (
              <img referrerPolicy="no-referrer" src={post.adminImage} alt="Author" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm text-3xl font-bold">
                {(post.author?.name || post.adminName || "A")[0]}
              </div>
            )}
          </div>
          <div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
              Written by {post.author?.name || post.adminName || "Masdika.ID"}
            </h3>
            <p className={cn("text-sm leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-600")}>
              {post.authorBio || "Cloud Engineer & System Administrator passionate about high availability infrastructure, Kubernetes, automation, and modern web technologies."}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              {post.githubUrl && (
                <a href={post.githubUrl} target="_blank" rel="noopener noreferrer" className={cn("transition-colors p-2 rounded-full", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5")}>
                  <Github className="w-4 h-4" />
                </a>
              )}
              {post.socialTwitter && (
                <a href={post.socialTwitter} target="_blank" rel="noopener noreferrer" className={cn("transition-colors p-2 rounded-full", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5")}>
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {post.socialLinkedin && (
                <a href={post.socialLinkedin} target="_blank" rel="noopener noreferrer" className={cn("transition-colors p-2 rounded-full", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5")}>
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {post.socialInstagram && (
                <a href={post.socialInstagram} target="_blank" rel="noopener noreferrer" className={cn("transition-colors p-2 rounded-full", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5")}>
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {post.socialFacebook && (
                <a href={post.socialFacebook} target="_blank" rel="noopener noreferrer" className={cn("transition-colors p-2 rounded-full", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5")}>
                  <Facebook className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Recent Articles Slider / Drag Scroll */}
        {recentPosts && recentPosts.length > 0 && (
          <div className="mb-20" ref={recentPostsRef}>
            <div className="flex items-center justify-between mb-8">
              <h2 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Recent Articles
              </h2>
              <Link href="/blog" className={cn("text-sm font-semibold transition-colors flex items-center gap-1 group", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700")}>
                View all articles
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <div
              ref={scrollRef}
              onMouseDown={(e) => {
                setIsDragging(true);
                setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
                setScrollLeft(scrollRef.current?.scrollLeft || 0);
              }}
              onMouseLeave={() => setIsDragging(false)}
              onMouseUp={() => setIsDragging(false)}
              onMouseMove={(e) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
                const walk = (x - startX) * 1.5;
                if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk;
              }}
              className={cn(
                "flex gap-6 overflow-x-auto pb-4 select-none scrollbar-none snap-x snap-mandatory cursor-grab active:cursor-grabbing",
                isDragging ? "pointer-events-none" : ""
              )}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {recentPosts.map((recent: any) => (
                <Link
                  key={recent.id}
                  href={`/blog/${recent.slug}`}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start group pointer-events-auto"
                >
                  <div className={cn("w-full h-56 sm:h-64 relative overflow-hidden rounded-2xl border mb-4", isDark ? "bg-gradient-to-br from-[#121212] to-[#0a0a0a] border-white/10" : "bg-slate-100 border-black/5")}>
                    {recent.image ? (
                      <img referrerPolicy="no-referrer" src={recent.image} alt={recent.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" draggable={false} loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cyan-500/30 group-hover:text-cyan-500/50 transition-colors text-6xl font-black">{recent.title[0]}</div>
                    )}
                    <div className={cn("absolute inset-0 pointer-events-none z-10 opacity-90", isDark ? "bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" : "bg-gradient-to-b from-transparent via-transparent to-white")}></div>
                    <div className="absolute top-3 left-3 z-20">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-md border", isDark ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/30" : "bg-white/80 text-cyan-700 border-cyan-200")}>
                        {recent.category?.name || "DevOps"}
                      </span>
                    </div>
                  </div>
                  <h4 className={cn("font-bold text-base line-clamp-2 mb-1.5 transition-colors leading-snug", isDark ? "text-zinc-200 group-hover:text-cyan-400" : "text-slate-800 group-hover:text-cyan-600")}>
                    {recent.title}
                  </h4>
                  <p className={cn("text-xs line-clamp-2 leading-relaxed mb-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {recent.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(recent.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recent.readTime || 5} min read</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div id="comments-section" className="pt-8 border-t border-[var(--border-primary)] scroll-mt-24">
          <div className="flex items-center justify-between mb-8">
            <h3 className={cn("text-2xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              Comments <span className={cn("text-sm font-semibold px-2.5 py-0.5 rounded-full border", isDark ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>{post.comments?.length || 0}</span>
            </h3>
          </div>

          {/* Comment List */}
          <div className="space-y-6 mb-12">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment: any) => (
                <div key={comment.id} className={cn("p-6 rounded-2xl border transition-all duration-200", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-black/5 shadow-xs")}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden relative", isDark ? "bg-gradient-to-br from-[#121212] to-[#0a0a0a] border-cyan-500/30 text-cyan-400" : "bg-slate-100 border-black/10 text-cyan-600")}>
                        {comment.isAdmin && post.adminImage ? (
                          <img referrerPolicy="no-referrer" src={post.adminImage} alt="Admin" className="absolute inset-0 w-full h-full object-cover z-10" loading="lazy" decoding="async" />
                        ) : (
                          <>
                            <span className="relative z-0">{comment.isAdmin ? "A" : comment.name[0].toUpperCase()}</span>
                            {comment.gravatar && (
                              <img referrerPolicy="no-referrer" src={`https://www.gravatar.com/avatar/${comment.gravatar}?d=blank&s=80`} alt="Avatar" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} loading="lazy" decoding="async" />
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{comment.name}</span>
                          {comment.isAdmin && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Admin</span>
                          )}
                        </div>
                        <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                          {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyTo({ id: comment.id, name: comment.name })}
                      className={cn("text-xs font-bold transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border", isDark ? "border-white/10 hover:border-cyan-500/40 text-zinc-400 hover:text-cyan-400 bg-white/[0.02]" : "border-black/5 hover:border-cyan-500/40 text-slate-500 hover:text-cyan-600 bg-slate-50")}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Reply
                    </button>
                  </div>

                  <p className={cn("text-sm leading-relaxed mb-4 pl-13 font-normal whitespace-pre-wrap break-words", isDark ? "text-zinc-300" : "text-slate-700")}>
                    {renderCommentText(comment.content)}
                  </p>

                  {/* Replies Section */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 border-t border-[var(--border-primary)] pt-3 pl-4 sm:pl-8">
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className={cn("text-xs font-bold mb-3 flex items-center gap-1.5 transition-colors", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700")}
                      >
                        <span className="text-[10px]">{expandedReplies[comment.id] ? "▼" : "▶"}</span>
                        <span>{comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}</span>
                      </button>

                      {expandedReplies[comment.id] && (
                        <div className="space-y-4 pt-1">
                          {comment.replies.map((reply: any) => (
                            <div key={reply.id} className={cn("p-4 rounded-xl border relative", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-black/5")}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden relative", isDark ? "bg-gradient-to-br from-[#121212] to-[#0a0a0a] border-cyan-500/30 text-cyan-400" : "bg-slate-100 border-black/10 text-cyan-600")}>
                                    {reply.isAdmin && post.adminImage ? (
                                      <img referrerPolicy="no-referrer" src={post.adminImage} alt="Admin" className="absolute inset-0 w-full h-full object-cover z-10" loading="lazy" decoding="async" />
                                    ) : (
                                      <>
                                        <span className="relative z-0">{reply.isAdmin ? "A" : reply.name[0].toUpperCase()}</span>
                                        {reply.gravatar && (
                                          <img referrerPolicy="no-referrer" src={`https://www.gravatar.com/avatar/${reply.gravatar}?d=blank&s=80`} alt="Avatar" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} loading="lazy" decoding="async" />
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={cn("font-bold text-xs", isDark ? "text-white" : "text-slate-900")}>{reply.name}</span>
                                      {reply.isAdmin && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Admin</span>
                                      )}
                                    </div>
                                    <span className={cn("text-[10px] font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                                      {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setReplyTo({ id: comment.id, name: reply.name })}
                                  className={cn("text-[11px] font-bold transition-colors flex items-center gap-1 px-2 py-1 rounded border", isDark ? "border-white/10 hover:border-cyan-500/40 text-zinc-400 hover:text-cyan-400 bg-white/[0.02]" : "border-black/5 hover:border-cyan-500/40 text-slate-500 hover:text-cyan-600 bg-white")}
                                >
                                  Reply
                                </button>
                              </div>
                              <p className={cn("text-xs leading-relaxed pl-10 font-normal whitespace-pre-wrap break-words", isDark ? "text-zinc-300" : "text-slate-700")}>
                                {renderCommentText(reply.content)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className={cn("p-8 rounded-2xl border text-center font-medium", isDark ? "bg-[var(--surface)] border-[var(--border-primary)] text-zinc-500" : "bg-white border-black/5 text-slate-400 shadow-xs")}>
                No comments yet. Be the first to share your thoughts!
              </div>
            )}
          </div>

          {/* Comment Form */}
          <div className={cn("p-6 sm:p-8 rounded-3xl border relative overflow-hidden", isDark ? "bg-[var(--surface)] border-[var(--border-primary)] shadow-2xl" : "bg-slate-50 border-black/5 shadow-sm")}>
            <div className="flex items-center justify-between mb-6">
              <h4 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                {replyTo ? `Reply to ${replyTo.name}` : "Leave a Comment"}
              </h4>
              {replyTo && (
                <button
                  onClick={() => setReplyTo(null)}
                  className={cn("text-xs font-semibold hover:underline", isDark ? "text-zinc-400" : "text-slate-500")}
                >
                  Cancel Reply
                </button>
              )}
            </div>

            {commentSuccess && (
              <div className={cn("mb-8 p-5 border rounded-2xl shadow-inner font-medium flex items-start gap-3", isDark ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <svg className={cn("w-6 h-6 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Please check your email inbox to verify your comment. Your comment will be visible after verification!</span>
              </div>
            )}
            {commentError && (
              <div className={cn("mb-8 p-5 border rounded-2xl shadow-inner font-medium flex items-start gap-3", isDark ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-700")}>
                <svg className={cn("w-6 h-6 shrink-0", isDark ? "text-red-400" : "text-red-600")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{commentError}</span>
              </div>
            )}

            <form onSubmit={handleCommentSubmit} className="relative z-10 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className={cn("text-xs font-bold uppercase tracking-wider ml-1", isDark ? "text-zinc-400" : "text-slate-500")}>Name <span className="text-cyan-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="John Doe"
                    className={cn("w-full px-5 py-3.5 rounded-xl border focus:outline-none focus:ring-2 transition-all", isDark ? "bg-white/[0.03] border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" : "bg-white border-black/10 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 shadow-inner")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={cn("text-xs font-bold uppercase tracking-wider ml-1", isDark ? "text-zinc-400" : "text-slate-500")}>Email <span className="text-cyan-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={commentEmail}
                    onChange={(e) => setCommentEmail(e.target.value)}
                    placeholder="john@example.com"
                    className={cn("w-full px-5 py-3.5 rounded-xl border focus:outline-none focus:ring-2 transition-all", isDark ? "bg-white/[0.03] border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" : "bg-white border-black/10 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 shadow-inner")}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={cn("text-xs font-bold uppercase tracking-wider ml-1", isDark ? "text-zinc-400" : "text-slate-500")}>Comment <span className="text-cyan-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Share your thoughts here..."
                  className={cn("w-full px-5 py-3.5 rounded-xl border focus:outline-none focus:ring-2 transition-all resize-y", isDark ? "bg-white/[0.03] border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" : "bg-white border-black/10 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 shadow-inner")}
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submittingComment}
                  disabled={submittingComment}
                  rightIcon={
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  }
                >
                  Post Comment
                </Button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
