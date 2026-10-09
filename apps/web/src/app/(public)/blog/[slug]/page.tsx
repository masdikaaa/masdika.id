"use client";

import { useRef, useState, useEffect, use } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Calendar, Clock, ChevronLeft, User, Heart, Share2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ImageZoom } from "@/components/ui/ImageZoom";

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

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const resolvedParams = use(params);
  const [post, setPost] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<{ id: string, text: string, level: number, displayNumber?: string }[]>([]);

  // Drag to scroll logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Reaction State
  const [reactionCount, setReactionCount] = useState(0);
  const [hasReacted, setHasReacted] = useState(false);
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
      const res = await fetch(`/api/posts/${resolvedParams.slug}/comments`, {
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
      const postRes = await fetch(`/api/posts/${resolvedParams.slug}`);
      const postData = await postRes.json();
      setPost(postData);

      setTimeout(() => setCommentSuccess(false), 5000);
    } catch (err: any) {
      setCommentError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${resolvedParams.slug}`).then(res => res.json()),
      fetch('/api/posts').then(res => res.json())
    ])
      .then(([postData, allPosts]) => {
        if (!postData.error) {
          setPost(postData);
          setReactionCount(postData.reactionsCount || 0);
          setHasReacted(postData.hasReacted || false);
          // Generate TOC
          const headings = [];
          const regex = /^(#{2,3})\s+(.*)$/gm;
          let match;
          let h2Count = 0;
          let h3Count = 0;
          while ((match = regex.exec(postData.content)) !== null) {
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
          setToc(headings);
        }

        if (Array.isArray(allPosts)) {
          const filtered = allPosts.filter((p: any) => p.slug !== resolvedParams.slug).slice(0, 4);
          setRecentPosts(filtered);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [resolvedParams.slug]);

  // Real-time polling for comments and reactions
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/posts/${resolvedParams.slug}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setPost((prev: any) => {
              if (prev && JSON.stringify(prev.comments) !== JSON.stringify(data.comments)) {
                return { ...prev, comments: data.comments };
              }
              return prev;
            });
            setReactionCount(prev => data.reactionsCount !== undefined ? data.reactionsCount : prev);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [resolvedParams.slug]);

  const handleReact = async () => {
    if (hasReacted || isReacting) return;
    setIsReacting(true);
    try {
      const res = await fetch(`/api/posts/${resolvedParams.slug}/react`, { method: "POST" });
      if (res.ok) {
        setHasReacted(true);
        setReactionCount(prev => prev + 1);
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

  if (loading) {
    return (
      <div className="pt-28 md:pt-32 pb-12 lg:pb-16 flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

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
          <details className={cn("group backdrop-blur-xl border border-l-4 p-5 sm:p-6 rounded-2xl rounded-tr-[2rem] rounded-bl-[2rem] mb-12 shadow-lg w-full max-w-full min-w-0 transition-all duration-300", isDark ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 border-l-cyan-500/50" : "bg-white border-black/5 border-l-cyan-500")} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
            <div className={cn("mt-5 pt-4 border-t", isDark ? "border-white/5" : "border-black/5")}>
              <ul className="space-y-3">
                {toc.map((heading, idx) => (
                  <li key={idx} className={heading.level === 3 ? "ml-4" : ""}>
                    <a href={`#${heading.id}`} className={cn("transition-colors flex items-start gap-2 break-words min-w-0 w-full", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-600 hover:text-cyan-600")}>
                      <span className={cn("font-mono text-sm shrink-0 pt-0.5", isDark ? "text-zinc-600" : "text-slate-400")}>
                        {heading.displayNumber}.
                      </span>
                      <span className="break-all line-clamp-2 min-w-0">{heading.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}

        <article className="w-full max-w-full min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          <MarkdownPreview content={post.content} isDark={isDark} />
        </article>

        {/* Article Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {post.tags.map((pt: any) => (
              <span key={pt.tag.id} className={cn("font-medium text-[15px] transition-colors cursor-pointer", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700")}>
                #{pt.tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Interaction Bar: Reaction & Share */}
        <div className="mt-12 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4">
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="rainbow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop stopColor="#ec4899" offset="0%" />
                <stop stopColor="#a855f7" offset="50%" />
                <stop stopColor="#06b6d4" offset="100%" />
              </linearGradient>
            </defs>
          </svg>

          <button
            onClick={handleReact}
            disabled={hasReacted || isReacting}
            className={cn("group flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-full font-bold transition-colors transform-gpu shadow-sm w-full sm:w-auto overflow-hidden relative", 
              hasReacted 
                ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/20 text-white' : 'bg-cyan-50 border border-cyan-200 text-slate-900') 
                : (isDark ? 'bg-cyan-950/30 backdrop-blur-md text-zinc-300 border border-cyan-500/20 hover:border-cyan-500/50' : 'bg-white text-slate-600 border border-black/10 hover:border-cyan-500/50')
            )}
          >
            {hasReacted && <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-r from-cyan-500/10 via-cyan-500/10 to-cyan-500/10" : "bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100")}></div>}
            <Heart
              className={`w-5 h-5 shrink-0 relative z-10 transition-transform group-hover:scale-110`}
              style={{ stroke: 'url(#rainbow-grad)', fill: hasReacted ? 'url(#rainbow-grad)' : 'transparent' }}
            />
            <span className={cn("truncate relative z-10 bg-clip-text text-transparent transition-all", isDark ? "bg-gradient-to-r from-cyan-400 via-cyan-400 to-cyan-400 group-hover:from-cyan-300 group-hover:via-cyan-300 group-hover:to-cyan-300" : "bg-gradient-to-r from-cyan-600 to-cyan-600 group-hover:from-cyan-500 group-hover:to-cyan-500")}>{reactionCount} Reactions</span>
          </button>
          
          <button
            onClick={handleShare}
            className={cn("group flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-full font-bold border transition-colors transform-gpu shadow-sm w-full sm:w-auto relative overflow-hidden", isDark ? "bg-cyan-950/30 backdrop-blur-md text-zinc-300 border-cyan-500/20 hover:border-cyan-500/50" : "bg-white text-slate-600 border-black/10 hover:border-cyan-500/50")}
          >
            <Share2
              className="w-5 h-5 shrink-0 relative z-10 transition-transform group-hover:scale-110"
              style={{ stroke: 'url(#rainbow-grad)' }}
            />
            <span className={cn("truncate relative z-10 bg-clip-text text-transparent transition-all", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-400 group-hover:from-cyan-300 group-hover:to-cyan-300" : "bg-gradient-to-r from-cyan-600 to-cyan-600 group-hover:from-cyan-500 group-hover:to-cyan-500")}>Share</span>
          </button>
        </div>

        {/* Author Bio Box */}
        <div className={cn("mt-16 backdrop-blur-xl rounded-2xl rounded-tr-[3rem] rounded-bl-[3rem] p-6 sm:p-10 border border-l-4 flex flex-col-reverse md:flex-row items-center md:items-start gap-6 md:gap-8 relative shadow-xl w-full", isDark ? "bg-gradient-to-br from-[#0b1120]/95 to-[#070b14]/95 border-white/5 border-l-cyan-500/30" : "bg-white border-black/5 border-l-cyan-500")}>
          <div className="flex-1 flex flex-col justify-center w-full">
            <h3 className={cn("text-xl font-bold mb-3 drop-shadow-sm", isDark ? "bg-gradient-to-br from-cyan-400 to-cyan-200 bg-clip-text text-transparent" : "text-slate-900")}>{post.author?.name || post.adminName || "Admin"}</h3>
            <p className={cn("text-[15px] mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              {post.authorBio || "Let's start living like no one can help us in any event, so that when we are helped in certain times, it becomes a plus in itself. ☃️"}
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mt-2">
              <span className="text-sm text-zinc-500 font-medium whitespace-nowrap">Follow me on</span>

              <div className="flex flex-wrap items-center gap-2">
                <a href={post.socialFacebook && post.socialFacebook !== '#' ? post.socialFacebook : '#'} target={post.socialFacebook && post.socialFacebook !== '#' ? "_blank" : "_self"} rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all shrink-0 shadow-sm", isDark ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50" : "bg-white border-black/10 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200")}>
                  <Facebook className="w-4 h-4" />
                </a>

                <a href={post.socialTwitter && post.socialTwitter !== '#' ? post.socialTwitter : '#'} target={post.socialTwitter && post.socialTwitter !== '#' ? "_blank" : "_self"} rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all shrink-0 shadow-sm", isDark ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50" : "bg-white border-black/10 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200")}>
                  <Twitter className="w-4 h-4" />
                </a>

                <a href={post.socialLinkedin && post.socialLinkedin !== '#' ? post.socialLinkedin : '#'} target={post.socialLinkedin && post.socialLinkedin !== '#' ? "_blank" : "_self"} rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all shrink-0 shadow-sm", isDark ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50" : "bg-white border-black/10 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200")}>
                  <Linkedin className="w-4 h-4" />
                </a>

                <a href={post.socialInstagram && post.socialInstagram !== '#' ? post.socialInstagram : '#'} target={post.socialInstagram && post.socialInstagram !== '#' ? "_blank" : "_self"} rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all shrink-0 shadow-sm", isDark ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50" : "bg-white border-black/10 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200")}>
                  <Instagram className="w-4 h-4" />
                </a>

                <a href={post.githubUrl && post.githubUrl !== '#' ? post.githubUrl : '#'} target={post.githubUrl && post.githubUrl !== '#' ? "_blank" : "_self"} rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all shrink-0 shadow-sm", isDark ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50" : "bg-white border-black/10 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200")}>
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full overflow-hidden border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500 to-cyan-600">
            {post.adminImage ? (
              <img referrerPolicy="no-referrer" src={post.adminImage} alt="Author" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm text-3xl font-bold">
                {(post.author?.name || post.adminName || "A")[0]}
              </div>
            )}
          </div>
        </div>



        {/* Recent Posts Section */}
        <div className={cn("mt-20 pt-16 border-t relative", isDark ? "border-cyan-900/30" : "border-black/5")} ref={recentPostsRef}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <h3 className={cn("text-2xl sm:text-3xl font-extrabold mb-10", isDark ? "text-white" : "text-slate-900")}>
            Recent Posts
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentPosts.length === 0 ? (
              <div className={cn("col-span-1 md:col-span-2 flex flex-col items-center justify-center py-16 px-4 text-center border rounded-3xl relative overflow-hidden group", isDark ? "bg-gradient-to-b from-[#0a1f33]/30 to-transparent border-white/5" : "bg-white border-black/5 shadow-sm")}>
                <div className={cn("w-16 h-16 mb-4 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500", isDark ? "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100")}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h4 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No recent posts</h4>
                <p className={cn("text-sm max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Check back soon for more exciting articles and updates from us!
                </p>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </div>
            ) : (
              recentPosts.map((recent) => (
                <Link key={recent.id} href={`/blog/${recent.slug}`} className={cn("group flex flex-col backdrop-blur-md border rounded-3xl overflow-hidden transition-colors transform-gpu duration-300 shadow-xl hover:-translate-y-2 relative", isDark ? "bg-gradient-to-br from-[#0a1f33]/60 to-[#011627]/90 border-white/5 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-900/20" : "bg-white border-black/5 hover:border-cyan-500/40 hover:shadow-2xl")}>
                  {/* Image Section with Fade */}
                  <div className={cn("w-full h-56 sm:h-64 relative overflow-hidden", isDark ? "bg-gradient-to-br from-[#0a1f33] to-[#011627]" : "bg-slate-100")}>
                    {recent.image ? (
                      <img referrerPolicy="no-referrer" src={recent.image} alt={recent.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" draggable={false} loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cyan-500/30 group-hover:text-cyan-500/50 transition-colors text-6xl font-black">{recent.title[0]}</div>
                    )}
                    {/* Overlay Gradient on Image */}
                    <div className={cn("absolute inset-0 pointer-events-none z-10 opacity-90", isDark ? "bg-gradient-to-b from-transparent via-transparent to-[#011627]" : "bg-gradient-to-b from-transparent via-transparent to-white")}></div>

                    {/* Category Badge */}
                    <div className={cn("absolute top-5 left-5 px-3.5 py-1.5 backdrop-blur-md rounded-xl border text-[11px] font-bold tracking-widest uppercase z-20 shadow-lg", isDark ? "bg-black/40 border-white/10 text-white" : "bg-white/90 border-black/10 text-slate-900")}>
                      {recent.category?.name || "Uncategorized"}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="px-6 pb-8 sm:px-8 sm:pb-8 flex flex-col flex-1 relative z-20 -mt-10">
                    {/* Meta Info */}
                    <div className={cn("flex items-center gap-4 text-[13px] font-semibold mb-4 w-max px-4 py-1.5 rounded-full border backdrop-blur-sm", isDark ? "text-cyan-400/80 bg-[#0a1f33]/60 border-cyan-500/10" : "text-cyan-700 bg-white border-black/10 shadow-sm")}>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(recent.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className={cn("w-1 h-1 rounded-full", isDark ? "bg-cyan-500/30" : "bg-black/20")}></span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {recent.readTime || 5} min</span>
                    </div>

                    <h4 className={cn("font-extrabold text-xl md:text-2xl mb-3 transition-colors line-clamp-2 leading-snug", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>
                      {recent.title}
                    </h4>

                    <p className={cn("text-[15px] line-clamp-2 leading-relaxed mb-8", isDark ? "text-zinc-400" : "text-slate-600")}>
                      {recent.excerpt}
                    </p>

                    {/* Spacer to push button to bottom */}
                    <div className="mt-auto"></div>

                    {/* Button */}
                    <div className={cn("inline-flex items-center gap-2 text-sm font-bold transition-colors", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700")}>
                      Read Article
                      <span className={cn("w-6 h-6 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-all", isDark ? "bg-cyan-500/10 group-hover:bg-cyan-500/20" : "bg-cyan-50 group-hover:bg-cyan-100")}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className={cn("mt-20 pt-16 border-t relative", isDark ? "border-cyan-900/30" : "border-black/5")}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <h3 className={cn("text-2xl sm:text-3xl font-extrabold mb-10", isDark ? "text-white" : "text-slate-900")}>Comments ({post.comments?.length || 0})</h3>

          <div className="space-y-6">
            {post.comments?.map((comment: any) => (
              <div key={comment.id} className={cn("flex flex-col mb-4 border p-5 sm:p-6 rounded-2xl transition-all shadow-sm", isDark ? "bg-gradient-to-br from-[#0a1f33]/40 to-transparent border-white/5 hover:border-white/10" : "bg-white border-black/5 hover:border-black/10")}>
                <div className="flex gap-4 sm:gap-5">
                  {/* Avatar */}
                  <div className={cn("w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 relative overflow-hidden", isDark ? "bg-gradient-to-br from-[#0a1f33] to-[#011627] border-cyan-500/30 text-cyan-400" : "bg-slate-100 border-black/10 text-cyan-600")}>
                    <span className="relative z-0">{comment.name[0].toUpperCase()}</span>
                    {comment.gravatar && (
                      <img referrerPolicy="no-referrer" 
                        src={`https://www.gravatar.com/avatar/${comment.gravatar}?d=404&s=80`}
                        alt={comment.name}
                        className="absolute inset-0 w-full h-full object-cover z-10"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 flex flex-col">
                    {/* Name and Date */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>{comment.name}</span>
                      <span className={cn("text-[13px]", isDark ? "text-zinc-500" : "text-slate-500")}>{new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {/* Text */}
                    <p className={cn("text-[15px] leading-relaxed whitespace-pre-wrap mb-2", isDark ? "text-zinc-300" : "text-slate-700")}>
                      {renderCommentText(comment.content)}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 mb-2 mt-2">
                      <button
                        onClick={() => {
                          setReplyTo({ id: comment.id, name: comment.name });
                          setCommentContent(`@${comment.name.replace(/\s+/g, '')} `);
                          document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={cn("text-[12px] sm:text-[13px] font-semibold transition-colors flex items-center gap-1.5", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    </div>

                    {/* View Replies Toggle */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-1 mb-2">
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className={cn("flex items-center gap-3 text-[13px] font-semibold transition-colors group", isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700")}
                        >
                          <span className={cn("w-5 h-[1px] transition-colors", isDark ? "bg-zinc-600 group-hover:bg-zinc-400" : "bg-slate-300 group-hover:bg-slate-500")}></span>
                          {expandedReplies[comment.id] ? "Hide replies" : `View all ${comment.replies.length} replies`}
                        </button>
                      </div>
                    )}

                    {/* Replies List */}
                    {comment.replies && comment.replies.length > 0 && expandedReplies[comment.id] && (
                      <div className={cn("mt-4 pl-4 sm:pl-6 border-l flex flex-col gap-5", isDark ? "border-cyan-900/30" : "border-black/10")}>
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id} className="flex gap-3 sm:gap-4 group relative">
                            {/* Reply Avatar */}
                            <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden relative", isDark ? "bg-gradient-to-br from-[#0a1f33] to-[#011627] border-cyan-500/30 text-cyan-400" : "bg-slate-100 border-black/10 text-cyan-600")}>
                              {reply.isAdmin && post.adminImage ? (
                                <img referrerPolicy="no-referrer" src={post.adminImage} alt="Admin" className="absolute inset-0 w-full h-full object-cover z-10" loading="lazy" decoding="async" />
                              ) : (
                                <>
                                  <span className="relative z-0">{reply.isAdmin ? "A" : reply.name[0].toUpperCase()}</span>
                                  {reply.gravatar && (
                                    <img referrerPolicy="no-referrer" 
                                      src={`https://www.gravatar.com/avatar/${reply.gravatar}?d=404&s=80`}
                                      alt={reply.name}
                                      className="absolute inset-0 w-full h-full object-cover z-10"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  )}
                                </>
                              )}
                            </div>

                            {/* Reply Content */}
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn("font-bold text-[15px]", isDark ? "text-white" : "text-slate-900")}>{reply.name}</span>
                                {reply.isAdmin && <span className={cn("text-[11px] px-1.5 py-0.5 rounded border font-semibold tracking-wide uppercase", isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>Admin</span>}
                                <span className={cn("text-[13px]", isDark ? "text-zinc-500" : "text-slate-500")}>{new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              <p className={cn("text-[14px] leading-relaxed whitespace-pre-wrap mb-1", isDark ? "text-zinc-300" : "text-slate-700")}>
                                {renderCommentText(reply.content)}
                              </p>
                              {/* Action Buttons for Reply */}
                              <div className="flex items-center gap-4 mb-2 mt-1">
                                <button
                                  onClick={() => {
                                    setReplyTo({ id: comment.id, name: reply.name });
                                    setCommentContent(`@${reply.name.replace(/\s+/g, '')} `);
                                    document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className={cn("text-[12px] sm:text-[13px] font-semibold transition-colors flex items-center gap-1.5 opacity-0 group-hover:opacity-100", isDark ? "text-zinc-500 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!post.comments || post.comments.length === 0) && (
              <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center backdrop-blur-xl border border-l-4 rounded-2xl relative overflow-hidden group shadow-lg", isDark ? "bg-gradient-to-br from-[#0b1120]/95 to-[#070b14]/95 border-white/5 border-l-cyan-500/30" : "bg-white border-black/5 border-l-cyan-500")}>
                <div className={cn("w-16 h-16 mb-4 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500", isDark ? "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100")}>
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h4 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No comments yet</h4>
                <p className={cn("text-sm max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Be the first to share your thoughts, ask a question, or provide feedback on this article!
                </p>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </div>
            )}
          </div>

          <div id="comment-form" className={cn("mt-16 backdrop-blur-xl border border-l-4 p-8 sm:p-12 rounded-[2rem] rounded-tr-[4rem] rounded-bl-[4rem] relative overflow-hidden shadow-2xl group", isDark ? "bg-gradient-to-br from-[#0b1120]/95 to-[#070b14]/95 border-white/5 border-l-cyan-500/30" : "bg-white border-black/5 border-l-cyan-500")}>
            {/* Ambient glowing orbs */}
            <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none transform translate-x-1/2 -translate-y-1/2", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")}></div>
            <div className={cn("absolute bottom-0 left-0 w-48 h-48 rounded-full blur-[60px] pointer-events-none transform -translate-x-1/2 translate-y-1/2", isDark ? "bg-blue-500/10" : "bg-cyan-500/5")}></div>

            <div className="flex flex-col gap-1 mb-10 relative z-10">
              <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-[0.2em] uppercase border w-max mb-3 shadow-sm", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Feedback</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <h4 className={cn("text-3xl md:text-4xl font-black drop-shadow-sm tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {replyTo ? `Replying to ${replyTo.name}` : "Leave a Comment"}
                </h4>
                {replyTo && (
                  <button
                    onClick={() => setReplyTo(null)}
                    className={cn("text-xs font-bold transition-colors px-4 py-2 rounded-full border shrink-0", isDark ? "text-zinc-400 hover:text-red-400 border-white/10 hover:border-red-500/30 bg-black/20 hover:bg-red-500/10" : "text-slate-500 hover:text-red-600 border-black/10 hover:border-red-200 bg-slate-50 hover:bg-red-50")}
                  >
                    Cancel Reply
                  </button>
                )}
              </div>
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
                <button
                  type="submit"
                  disabled={submittingComment}
                  className={cn("inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group", !isDark && "shadow-md")}
                >
                  {submittingComment ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      Post Comment
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
