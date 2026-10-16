"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { useTheme } from "@/components/ThemeProvider";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } }
} as const;

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

function BlogContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const tagFilter = searchParams.get('tag');

  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debounce

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, tagFilter]);
  
  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPosts(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter posts based on search query, category, and tag
  const filteredPosts = posts.filter(post => {
    let match = true;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch = post.title.toLowerCase().includes(q) || 
                          (post.excerpt && post.excerpt.toLowerCase().includes(q));
      if (!matchSearch) match = false;
    }

    if (categoryFilter) {
      if (post.category?.name?.toLowerCase() !== categoryFilter.toLowerCase()) {
        match = false;
      }
    }

    if (tagFilter) {
      const hasTag = post.tags?.some((t: any) => t.name?.toLowerCase() === tagFilter.toLowerCase());
      if (!hasTag) {
        match = false;
      }
    }

    return match;
  });

  const postsPerPage = 7;
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;
  
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);

  const heroPost = (currentPage === 1 && currentPosts.length > 0) ? currentPosts[0] : null;
  const gridPosts = (currentPage === 1) ? currentPosts.slice(1) : currentPosts;

  // Derived Categories and Tags
  const categoryCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  posts.forEach(post => {
    // Categories
    const catName = post.category?.name;
    if (catName) {
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    }
    // Tags
    if (Array.isArray(post.tags)) {
      post.tags.forEach((t: any) => {
        if (t.name) {
          tagCounts[t.name] = (tagCounts[t.name] || 0) + 1;
        }
      });
    }
  });

  const uniqueCategories = Object.keys(categoryCounts).sort();

  return (
    <div className="pt-24 md:pt-32 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8 pt-10"
      >
        <div className="max-w-2xl">
          <div className={cn("inline-flex items-center justify-center px-4 py-2 mb-6 rounded-full border shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "border-cyan-500/20 bg-cyan-500/10" : "border-cyan-200 bg-cyan-50")}>
            <span className={cn("font-black tracking-[0.2em] text-xs uppercase", isDark ? "text-cyan-400" : "text-cyan-600")}>Tech Blog</span>
          </div>
          <h1 className={cn("text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
            Insights & <br className="hidden sm:block" />
            <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Tutorials.</span>
          </h1>
          <p className={cn("text-lg md:text-xl max-w-2xl leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
            Thoughts, tutorials, and deep-dives on Cloud Infrastructure, DevOps, and modern Web Development.
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-auto mt-6 md:mt-0 group">
          <div className={cn("absolute inset-0 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")}></div>
          <div className="relative">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-10 pointer-events-none", isDark ? "text-zinc-500 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600")} />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(
                "w-full md:w-72 pl-12 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-1 transition-all duration-300 shadow-inner",
                isDark 
                  ? "bg-white/[0.03] border-white/10 focus:border-cyan-500/50 focus:bg-cyan-500/[0.02] text-white placeholder-zinc-500 focus:ring-cyan-500/50" 
                  : "bg-white border-black/10 focus:border-cyan-500 focus:bg-white text-slate-900 placeholder-slate-400 focus:ring-cyan-500"
              )}
            />
          </div>
        </div>
      </motion.div>

      {/* Horizontal Categories Row */}
      {!loading && uniqueCategories.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="flex flex-wrap items-center gap-2 mb-12"
        >
          <span className={cn("text-sm font-medium mr-2 hidden sm:block", isDark ? "text-zinc-400" : "text-slate-500")}>Categories:</span>
          <MagneticButton intensity={10}>
            <button 
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('category');
                router.push(`/blog?${params.toString()}`);
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-bold transition-all border",
                !categoryFilter 
                  ? "bg-cyan-500 text-[#011627] shadow-lg shadow-cyan-500/20 border-cyan-500" 
                  : isDark 
                    ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border-white/5" 
                    : "bg-white text-slate-600 hover:text-cyan-600 hover:bg-slate-50 border-black/10 shadow-sm"
              )}
            >
              All Posts
            </button>
          </MagneticButton>
          {uniqueCategories.map(cat => (
            <MagneticButton key={cat} intensity={10}>
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('category', cat.toLowerCase());
                  router.push(`/blog?${params.toString()}`);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 border",
                  categoryFilter?.toLowerCase() === cat.toLowerCase()
                    ? "bg-cyan-500 text-[#011627] shadow-lg shadow-cyan-500/20 border-cyan-500" 
                    : isDark 
                      ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border-white/5" 
                      : "bg-white text-slate-600 hover:text-cyan-600 hover:bg-slate-50 border-black/10 shadow-sm"
                )}
              >
                {cat}
                <span className={cn(
                  "text-[10px] px-1.5 rounded-full",
                  categoryFilter?.toLowerCase() === cat.toLowerCase() 
                    ? "bg-[#011627]/20 text-[#011627]" 
                    : isDark 
                      ? "bg-white/10 text-zinc-300" 
                      : "bg-black/5 text-slate-500"
                )}>
                  {categoryCounts[cat]}
                </span>
              </button>
            </MagneticButton>
          ))}

          {tagFilter && (
            <div className={cn("flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm ml-auto", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <span>Tag: #{tagFilter}</span>
              <button onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('tag');
                router.push(`/blog?${params.toString()}`);
              }} className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-cyan-800")}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className={cn("text-center py-16 px-6 sm:px-8 rounded-3xl border backdrop-blur-sm shadow-xl", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5" : "bg-cyan-50 border-cyan-200")}>
          <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border relative", isDark ? "bg-gradient-to-br from-cyan-500/10 via-cyan-500/10 to-cyan-500/10 border-cyan-500/20" : "bg-cyan-100 border-cyan-300")}>
            <svg width="0" height="0" className="absolute">
              <linearGradient id="icon-gradient-blog-1" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" offset="0%" />
                <stop stopColor="#3b82f6" offset="50%" />
                <stop stopColor="#8b5cf6" offset="100%" />
              </linearGradient>
            </svg>
            <BookOpen className="w-10 h-10" style={{ stroke: isDark ? "url(#icon-gradient-blog-1)" : "#0284c7" }} />
          </div>
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No blog posts yet</h3>
          <p className={isDark ? "text-white/50 max-w-sm mx-auto" : "text-slate-500 max-w-sm mx-auto"}>Blog posts will appear here once they are published.</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className={cn("text-center py-16 px-6 sm:px-8 rounded-3xl border backdrop-blur-sm shadow-xl", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5" : "bg-cyan-50 border-cyan-200")}>
          <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border relative", isDark ? "bg-gradient-to-br from-cyan-500/10 via-cyan-500/10 to-cyan-500/10 border-cyan-500/20" : "bg-cyan-100 border-cyan-300")}>
            <svg width="0" height="0" className="absolute">
              <linearGradient id="icon-gradient-blog-2" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" offset="0%" />
                <stop stopColor="#3b82f6" offset="50%" />
                <stop stopColor="#8b5cf6" offset="100%" />
              </linearGradient>
            </svg>
            <Search className="w-10 h-10" style={{ stroke: isDark ? "url(#icon-gradient-blog-2)" : "#0284c7" }} />
          </div>
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No matches found</h3>
          <p className={isDark ? "text-white/50 max-w-sm mx-auto" : "text-slate-500 max-w-sm mx-auto"}>We couldn't find any articles matching your search or filters.</p>
        </div>
      ) : (
        <>
          {/* Hero Article */}
          {heroPost && (
            <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mb-12">
              <div className={cn(
                "border rounded-[32px] overflow-hidden group hover:border-cyan-500/50 transition-all duration-500 flex flex-col md:flex-row relative shadow-2xl",
                isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-black/40" : "bg-white border-black/5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
              )}>
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500", isDark ? "bg-cyan-500/5" : "bg-cyan-500/5")}></div>
                <div className="p-6 sm:p-8 md:p-10 lg:p-12 md:w-1/2 flex flex-col justify-center relative z-10 order-2 md:order-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 lg:mb-6">
                    <span className={cn("px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider", isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                      Latest Article
                    </span>
                    <span className={cn("text-xs font-bold flex items-center gap-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                      <Calendar className="w-3.5 h-3.5" /> 
                      {new Date(heroPost.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={cn("text-xs font-bold flex items-center gap-1.5 hidden sm:flex", isDark ? "text-zinc-500" : "text-slate-500")}>
                      <Clock className="w-3.5 h-3.5" /> {heroPost.readTime} min
                    </span>
                  </div>
                  
                  <h2 className={cn("text-xl sm:text-2xl lg:text-3xl font-extrabold mb-3 sm:mb-5 transition-colors duration-300 leading-snug lg:leading-tight line-clamp-4", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>
                    <Link href={`/blog/${heroPost.slug}`}>{heroPost.title}</Link>
                  </h2>
                  
                  <p className={cn("mb-6 lg:mb-8 text-sm md:text-base line-clamp-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {heroPost.excerpt || "Click to read more about this topic."}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
                    {heroPost.category?.name && (
                      <span className={cn("px-3 py-1 rounded-full border text-xs font-bold", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                        {heroPost.category.name}
                      </span>
                    )}
                    {heroPost.tags?.slice(0, 2).map((tag: any) => (
                       <span key={tag.id} className={cn("px-3 py-1 rounded-full border text-[10px] sm:text-xs font-bold", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-slate-50 text-slate-500 border-black/10")}>
                         #{tag.name}
                       </span>
                    ))}
                  </div>

                  <Link href={`/blog/${heroPost.slug}`} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all w-full sm:w-fit group/btn">
                    Read Article <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <Link href={`/blog/${heroPost.slug}`} className="md:w-1/2 h-64 sm:h-72 md:h-auto relative overflow-hidden bg-black/20 order-1 md:order-2 block cursor-pointer">
                  {heroPost.image ? (
                    <Image referrerPolicy="no-referrer" 
                      src={heroPost.image} 
                      alt={heroPost.title} 
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized={true}
                      className="object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90 group-hover:brightness-100"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 font-mono">No Image Available</div>
                  )}
                  {/* Subtle gradient overlay to blend image with card background */}
                  <div className={cn("absolute inset-0 hidden md:block", isDark ? "bg-gradient-to-r from-[#0d1629] via-[#0d1629]/40 to-transparent" : "bg-gradient-to-r from-white via-white/40 to-transparent")}></div>
                  <div className={cn("absolute inset-0 md:hidden block", isDark ? "bg-gradient-to-t from-[#0d1629] via-transparent to-transparent" : "bg-gradient-to-t from-white via-transparent to-transparent")}></div>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Grid Articles */}
          {gridPosts.length > 0 && (
            <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridPosts.map((post, idx) => (
                <FadeIn key={post.slug} delay={idx * 0.1} direction="up" className="h-full">
                  <TiltCard 
                    intensity={5}
                    className={cn(
                      "border rounded-3xl group transition-all duration-500 overflow-hidden flex flex-col h-full relative shadow-xl",
                      isDark 
                        ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 hover:bg-[#111f38] shadow-black/40" 
                        : "bg-white border-black/5 hover:border-cyan-500/40 hover:shadow-xl"
                    )}
                  >
                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", isDark ? "bg-gradient-to-b from-cyan-500/5 to-transparent" : "bg-gradient-to-b from-cyan-500/5 to-transparent")}></div>
                    <Link href={`/blog/${post.slug}`} className="w-full h-56 relative overflow-hidden bg-black/20 block cursor-pointer z-10">
                      {post.image ? (
                        <Image referrerPolicy="no-referrer" 
                          src={post.image} 
                          alt={post.title} 
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized={true}
                          className="object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90 group-hover:brightness-100"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 font-mono text-sm">No Image</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f33] via-transparent to-transparent opacity-60"></div>
                      <div className="absolute top-4 left-4 z-20">
                        <span className={cn("px-3 py-1.5 rounded-lg backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider shadow-lg", isDark ? "bg-[#0a1f33]/80 text-cyan-400 border-cyan-500/30" : "bg-white/90 text-cyan-600 border-cyan-100")}>
                          {post.category?.name || "Uncategorized"}
                        </span>
                      </div>
                    </Link>
                    
                    <div className="p-6 md:p-8 flex flex-col flex-grow relative z-10">
                      <div className={cn("flex items-center gap-4 text-xs font-bold mb-4", isDark ? "text-zinc-500" : "text-slate-500")}>
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readTime} min</span>
                      </div>
                      <h2 className={cn("text-xl font-extrabold mb-3 transition-colors duration-300 line-clamp-2 leading-snug", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h2>
                      <p className={cn("mb-6 line-clamp-3 text-sm leading-relaxed flex-grow", isDark ? "text-zinc-400" : "text-slate-600")}>
                        {post.excerpt || "Click to read more about this topic."}
                      </p>
                      <Link href={`/blog/${post.slug}`} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all mt-auto w-fit group/link shadow-md">
                        Read Article <ArrowRight className="w-5 h-5 transition-transform group-hover/link:translate-x-1" />
                      </Link>
                    </div>
                  </TiltCard>
                </FadeIn>
              ))}
            </motion.div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
              className="flex justify-center items-center gap-2 mt-16"
            >
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn("p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors border", isDark ? "bg-white/5 hover:bg-cyan-500/10 border-white/5" : "bg-white hover:bg-slate-50 border-black/10 shadow-sm")}
              >
                <ChevronLeft className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </button>
              
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={cn(
                      "w-11 h-11 rounded-xl font-bold transition-all border",
                      currentPage === idx + 1 
                        ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 border-transparent" 
                        : isDark 
                          ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-cyan-500/10 border-white/5" 
                          : "bg-white text-slate-600 hover:text-cyan-600 hover:bg-slate-50 border-black/10 shadow-sm"
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn("p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors border", isDark ? "bg-white/5 hover:bg-cyan-500/10 border-white/5" : "bg-white hover:bg-slate-50 border-black/10 shadow-sm")}
              >
                <ChevronRight className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<div className="pt-28 md:pt-32 pb-12 lg:pb-16 text-center text-white h-screen flex justify-center items-center"><div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div></div>}>
      <BlogContent />
    </Suspense>
  );
}
