"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  ArrowRight, 
  Search, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Server, 
  Layers, 
  Terminal, 
  ShieldCheck, 
  Zap,
  Tag as TagIcon
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface BlogPostItem {
  id: string | number;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  createdAt: string | Date;
  readTime: number;
  category: {
    id: string | number;
    name: string;
    slug: string | null;
  } | null;
  tags?: {
    id: string | number;
    name: string;
    slug?: string | null;
  }[];
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export function BlogContent({ initialPosts = [] }: { initialPosts?: BlogPostItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const tagFilter = searchParams.get("tag");

  const [posts, setPosts] = useState<BlogPostItem[]>(initialPosts);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch client-side if initialPosts is empty
  useEffect(() => {
    if (initialPosts.length > 0) {
      setPosts(initialPosts);
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setPosts(data);
        }
        if (isMounted) setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading blog posts:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialPosts]);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when category or tag filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, tagFilter]);

  // Derive categories and tags with counts
  const { uniqueCategories, categoryCounts } = useMemo(() => {
    const catCounts: Record<string, number> = {};
    posts.forEach((post) => {
      const catName = post.category?.name;
      if (catName) {
        catCounts[catName] = (catCounts[catName] || 0) + 1;
      }
    });
    return {
      uniqueCategories: Object.keys(catCounts).sort(),
      categoryCounts: catCounts
    };
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      let matches = true;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(query);
        const matchExcerpt = post.excerpt ? post.excerpt.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchExcerpt) matches = false;
      }

      if (categoryFilter) {
        if (post.category?.name?.toLowerCase() !== categoryFilter.toLowerCase() &&
            post.category?.slug?.toLowerCase() !== categoryFilter.toLowerCase()) {
          matches = false;
        }
      }

      if (tagFilter) {
        const hasTag = post.tags?.some(
          (t) => t.name?.toLowerCase() === tagFilter.toLowerCase() ||
                 t.slug?.toLowerCase() === tagFilter.toLowerCase()
        );
        if (!hasTag) matches = false;
      }

      return matches;
    });
  }, [posts, searchQuery, categoryFilter, tagFilter]);

  // Pagination calculations: 7 posts per page on page 1 (1 featured + 6 grid), 6 posts on subsequent pages
  const postsPerPage = currentPage === 1 && !searchQuery && !categoryFilter && !tagFilter ? 7 : 6;
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;

  const currentPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(startIndex, startIndex + postsPerPage);
  }, [filteredPosts, currentPage, postsPerPage]);

  const hasFeatured = currentPage === 1 && currentPosts.length > 0 && !searchQuery && !categoryFilter && !tagFilter;
  const heroPost = hasFeatured ? currentPosts[0] : null;
  const gridPosts = hasFeatured ? currentPosts.slice(1) : currentPosts;

  const handleCategorySelect = (categoryName?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!categoryName) {
      params.delete("category");
    } else {
      params.set("category", categoryName.toLowerCase());
    }
    router.push(`/blog?${params.toString()}`, { scroll: false });
  };

  const handleTagSelect = (tagName?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!tagName) {
      params.delete("tag");
    } else {
      params.set("tag", tagName.toLowerCase());
    }
    router.push(`/blog?${params.toString()}`, { scroll: false });
  };

  const handleTopicClick = (trackSlug: string, trackTitle: string) => {
    // Check if category exists or set query
    const matchedCategory = uniqueCategories.find(
      (cat) => cat.toLowerCase().includes(trackSlug) || trackTitle.toLowerCase().includes(cat.toLowerCase())
    );
    if (matchedCategory) {
      handleCategorySelect(matchedCategory);
    } else {
      setSearchInput(trackTitle.split(" ")[0]);
    }
    const target = document.getElementById("articles-feed");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("tag");
    router.push(`/blog?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO SECTION (Identik dengan Vacancies & design.md) ── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  KNOWLEDGE HUB &amp; TECH ARTICLES
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page & design.md) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Insights, Guides <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  &amp; Tech Articles.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page & design.md) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deep-dives into cloud infrastructure, Kubernetes orchestration, CI/CD automation, and modern software engineering with hands-on notes.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page & design.md) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#articles-feed"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Articles
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#topics"
                  leftIcon={<BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Browse Topics
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (blog.png) with 4 Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[300px] sm:w-[440px] sm:h-[360px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left (Knowledge Base) */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#080e1e]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <BookOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Knowledge Base
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 truncate max-w-[115px] sm:max-w-none">
                      Curated Tech Guides
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right (DevOps & Cloud) */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#080e1e]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Server className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Topic Focus
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 truncate max-w-[115px] sm:max-w-none">
                      Cloud &amp; DevOps
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left (Production Proven) */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#080e1e]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Layers className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Practical Code
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 truncate max-w-[115px] sm:max-w-none">
                      Production Proven
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right (Weekly Deep-Dives) */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#080e1e]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Weekly Posts
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 truncate max-w-[115px] sm:max-w-none">
                      Fresh Deep-Dives
                    </div>
                  </div>
                </div>

                {/* Karakter blog.png utuh, proporsional & konsisten dengan halaman vacancies */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/blog.webp"
                    alt="Masdika – Tech Blog & Articles"
                    width={1536}
                    height={1024}
                    priority={true}
                    unoptimized={true}
                    className="w-full h-full object-contain object-bottom"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 1. ARTICLES FEED SECTION ───────────────────────────────── */}
        <section id="articles-feed" className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12 sm:mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Latest Publications
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Featured &amp; Recent Articles
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Explore in-depth architectural breakdowns, practical tutorials, and infrastructure notes designed to elevate your engineering craftsmanship.
            </p>
          </motion.div>

          {/* Controls: Search Bar & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-10 pb-6 border-b border-[var(--border-primary)]">
            {/* Search Input with standard tokens */}
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles, keywords..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categories & Active Tag */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCategorySelect(undefined)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border",
                  !categoryFilter
                    ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-sm"
                    : "border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40"
                )}
              >
                All Posts
              </button>

              {uniqueCategories.map((category) => {
                const isActive = categoryFilter?.toLowerCase() === category.toLowerCase();
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border",
                      isActive
                        ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-sm"
                        : "border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40"
                    )}
                  >
                    <span>{category}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-mono",
                        isActive
                          ? "bg-slate-950/20 text-slate-950"
                          : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                      )}
                    >
                      {categoryCounts[category]}
                    </span>
                  </button>
                );
              })}

              {tagFilter && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                  <TagIcon className="w-3.5 h-3.5" />
                  <span>#{tagFilter}</span>
                  <button
                    type="button"
                    onClick={() => handleTagSelect(undefined)}
                    className="hover:text-cyan-950 dark:hover:text-white transition-colors ml-0.5"
                    aria-label="Remove tag filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
              <p className="text-sm text-[var(--text-secondary)]">Loading articles...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPosts.length === 0 && (
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-12 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Search className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Matching Articles</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                We couldn&apos;t find any articles matching your search query or selected filters. Try broadening your keywords.
              </p>
              <Button variant="secondary" size="md" onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            </div>
          )}

          {/* Articles List */}
          {!loading && filteredPosts.length > 0 && (
            <>
              {/* Featured / Hero Article */}
              {heroPost && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="mb-12"
                >
                  <div className="rounded-2xl lg:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-300 overflow-hidden group shadow-sm hover:shadow-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                      
                      {/* Left: Article Details */}
                      <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between order-2 lg:order-1">
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <Badge variant="brand" size="sm">
                              Latest Article
                            </Badge>
                            {heroPost.category?.name && (
                              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                                {heroPost.category.name}
                              </span>
                            )}
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(heroPost.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {heroPost.readTime} min read
                            </span>
                          </div>

                          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-tight mb-4">
                            <Link href={`/blog/${heroPost.slug}`}>
                              {heroPost.title}
                            </Link>
                          </h2>

                          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-8">
                            {heroPost.excerpt || "Click below to read more about this topic in depth."}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[var(--border-primary)]">
                          <div className="flex flex-wrap gap-1.5">
                            {heroPost.tags?.slice(0, 3).map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleTagSelect(tag.name)}
                                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors"
                              >
                                #{tag.name}
                              </button>
                            ))}
                          </div>

                          <Button
                            variant="primary"
                            size="md"
                            href={`/blog/${heroPost.slug}`}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                          >
                            Read Article
                          </Button>
                        </div>
                      </div>

                      {/* Right: Cover Image */}
                      <Link
                        href={`/blog/${heroPost.slug}`}
                        className="lg:col-span-5 relative min-h-[240px] sm:min-h-[300px] lg:min-h-full overflow-hidden bg-slate-900 block order-1 lg:order-2 cursor-pointer"
                      >
                        {heroPost.image ? (
                          <Image
                            src={heroPost.image}
                            alt={heroPost.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 42vw"
                            unoptimized={true}
                            priority={true}
                            className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-95 group-hover:brightness-100"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                            <BookOpen className="w-12 h-12 opacity-30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden" />
                      </Link>

                    </div>
                  </div>
                </motion.div>
              )}

              {/* Standard Articles Grid */}
              {gridPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {gridPosts.map((post, idx) => (
                    <motion.div
                      key={post.slug}
                      variants={item}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                      className="h-full"
                    >
                      <article className="rounded-xl lg:rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-300 overflow-hidden group flex flex-col h-full hover:shadow-xl hover:-translate-y-1">
                        
                        {/* Thumbnail Cover */}
                        <Link
                          href={`/blog/${post.slug}`}
                          className="aspect-[16/10] relative overflow-hidden bg-slate-900 block cursor-pointer"
                        >
                          {post.image ? (
                            <Image
                              src={post.image}
                              alt={post.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              unoptimized={true}
                              className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-95 group-hover:brightness-100"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                              <BookOpen className="w-8 h-8 opacity-30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                          
                          {/* Category Badge Floating on Image */}
                          {post.category?.name && (
                            <div className="absolute top-3.5 left-3.5 z-10">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/95 dark:bg-[#050B14]/90 text-cyan-700 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-500/30 backdrop-blur-md shadow-md">
                                {post.category.name}
                              </span>
                            </div>
                          )}
                        </Link>

                        {/* Article Card Body */}
                        <div className="p-6 flex flex-col flex-1">
                          {/* Meta: Date & Read Time */}
                          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-medium mb-3">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(post.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {post.readTime} min
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug mb-3">
                            <Link href={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h3>

                          {/* Excerpt */}
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-6 flex-1">
                            {post.excerpt || "Click to explore the complete engineering write-up and implementation."}
                          </p>

                          {/* Footer Action */}
                          <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between mt-auto">
                            <Link
                              href={`/blog/${post.slug}`}
                              className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all"
                            >
                              <span>Read Article</span>
                              <ArrowRight className="w-4 h-4 transition-transform" />
                            </Link>

                            {post.tags && post.tags.length > 0 && (
                              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                #{post.tags[0].name}
                              </span>
                            )}
                          </div>
                        </div>

                      </article>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-16 pt-8 border-t border-[var(--border-primary)]">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-10 h-10 rounded-xl text-sm font-bold transition-all border",
                            isActive
                              ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-sm"
                              : "border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── 2. CORE TOPIC TRACKS (Identik dengan Section 2 Vacancies) ─ */}
        <section id="topics" className="py-16 lg:py-24 relative z-10 border-t border-[var(--border-primary)]">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "100px" }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Curated Knowledge Tracks
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Core Specialties We Cover
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Explore in-depth architectural patterns, production playbooks, and hands-on tutorials across our primary domains.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Server,
                title: "Cloud Infrastructure",
                desc: "AWS, GCP & Azure VPC architectures, Terraform IaC blueprints, and multi-region network design.",
                categorySlug: "cloud"
              },
              {
                icon: Layers,
                title: "Kubernetes & K3s",
                desc: "Production container orchestration, Ingress controllers, Helm charts, and bare-metal nodes.",
                categorySlug: "kubernetes"
              },
              {
                icon: Terminal,
                title: "DevOps & CI/CD",
                desc: "Automated test-and-deploy pipelines, GitHub Actions workflows, Docker optimization, and GitOps.",
                categorySlug: "devops"
              },
              {
                icon: ShieldCheck,
                title: "Linux & Security",
                desc: "Server hardening, WireGuard tunnels, database high-availability, and zero-trust edge networks.",
                categorySlug: "security"
              }
            ].map((track, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                className="h-full"
              >
                <div 
                  onClick={() => handleTopicClick(track.categorySlug, track.title)}
                  className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-6 sm:p-8 flex flex-col items-center text-center h-full group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                    <track.icon className="w-7 h-7" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {track.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 3. COMMUNITY & NEWSLETTER CTA (Identik dengan Section 3 Vacancies) ─ */}
        <section className="pt-8 pb-12">
          <div className="rounded-3xl bg-gradient-to-b from-cyan-500/5 to-transparent dark:from-cyan-500/10 dark:to-transparent border border-cyan-500/20 p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              DEVELOPER COMMUNITY
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Stay Ahead with Engineering Deep-Dives
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Have questions about an article or need help architecting your cloud stack? Reach out directly or check our managed engineering services.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Get in Touch
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/services"
              >
                Explore Services
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
