"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Tag as TagIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { PremiumLoader } from "@/components/ui/PremiumLoader";
import { SectionOrnaments } from "@/components/ui/PremiumBackground";
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
      categoryCounts: catCounts,
    };
  }, [posts]);

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
        if (
          post.category?.name?.toLowerCase() !== categoryFilter.toLowerCase() &&
          post.category?.slug?.toLowerCase() !== categoryFilter.toLowerCase()
        ) {
          matches = false;
        }
      }

      if (tagFilter) {
        const hasTag = post.tags?.some(
          (t) =>
            t.name?.toLowerCase() === tagFilter.toLowerCase() ||
            t.slug?.toLowerCase() === tagFilter.toLowerCase()
        );
        if (!hasTag) matches = false;
      }

      return matches;
    });
  }, [posts, searchQuery, categoryFilter, tagFilter]);

  const postsPerPage = currentPage === 1 && !searchQuery && !categoryFilter && !tagFilter ? 7 : 6;
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;

  const currentPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(startIndex, startIndex + postsPerPage);
  }, [filteredPosts, currentPage, postsPerPage]);

  const hasFeatured =
    currentPage === 1 && currentPosts.length > 0 && !searchQuery && !categoryFilter && !tagFilter;
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
    const matchedCategory = uniqueCategories.find(
      (cat) =>
        cat.toLowerCase().includes(trackSlug) ||
        trackTitle.toLowerCase().includes(cat.toLowerCase())
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
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 lg:pb-28 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO SECTION ────────────────────────────────────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  KNOWLEDGE HUB &amp; TECH ARTICLES
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Insights, Guides <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  &amp; Tech Articles.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deep-dives into cloud infrastructure, Kubernetes orchestration, CI/CD automation, and modern software engineering with hands-on notes.
              </p>

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
            </div>

            {/* Right – Hero Avatar */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/blog.webp"
                imageAlt="Masdika – Tech Blog & Articles"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: BookOpen, label: "Knowledge Base", value: "Curated Tech Guides" },
                  { icon: Server, label: "Topic Focus", value: "Cloud & DevOps" },
                  { icon: Layers, label: "Practical Code", value: "Production Proven" },
                  { icon: Zap, label: "Weekly Posts", value: "Fresh Deep-Dives" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 1. ARTICLES FEED SECTION ───────────────────────────────── */}
        <section id="articles-feed" className="py-16 lg:py-24 relative z-10">
          <SectionOrnaments variant="sides" />
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 relative z-10">
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Latest Publications
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Featured &amp; Recent Articles
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Explore in-depth architectural breakdowns, practical tutorials, and infrastructure notes designed to elevate your engineering craftsmanship.
            </p>
          </div>

          {/* Controls: Search Bar & Category Filter Pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-10 p-3 sm:p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] relative z-10">
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles, keywords..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCategorySelect(undefined)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 cursor-pointer",
                  !categoryFilter
                    ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-2xs"
                    : "border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40"
                )}
              >
                <span>All Posts</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold",
                    !categoryFilter
                      ? "bg-slate-950/15 text-slate-950"
                      : "bg-[var(--surface)] text-[var(--text-muted)]"
                  )}
                >
                  {posts.length}
                </span>
              </button>

              {uniqueCategories.map((category) => {
                const isActive = categoryFilter?.toLowerCase() === category.toLowerCase();
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer",
                      isActive
                        ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-2xs"
                        : "border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40"
                    )}
                  >
                    <span>{category}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold",
                        isActive
                          ? "bg-slate-950/15 text-slate-950"
                          : "bg-[var(--surface)] text-[var(--text-muted)]"
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

          {loading && <PremiumLoader inline />}

          {!loading && filteredPosts.length === 0 && (
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-12 text-center max-w-lg mx-auto shadow-sm relative z-10">
              <div className="w-12 h-12 rounded-xl mx-auto mb-4 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Search className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Matching Articles</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                We couldn&apos;t find any articles matching your search query or selected filters. Try broadening your keywords.
              </p>
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            </div>
          )}

          {!loading && filteredPosts.length > 0 && (
            <div className="relative z-10 space-y-8">
              {/* Featured / Hero Article */}
              {heroPost && (
                <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(6,182,212,0.08)] transition-all duration-300 overflow-hidden group p-4 sm:p-6 lg:p-7">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

                    {/* Left: Article Details */}
                    <div className="lg:col-span-6 flex flex-col justify-between order-2 lg:order-1 h-full">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Featured Post
                          </span>
                          {heroPost.category?.name && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                              {heroPost.category.name}
                            </span>
                          )}
                          <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5 ml-auto">
                            <Calendar className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                            {new Date(heroPost.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                            {heroPost.readTime}m
                          </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-snug mb-3.5">
                          <Link href={`/blog/${heroPost.slug}`}>
                            {heroPost.title}
                          </Link>
                        </h2>

                        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-6">
                          {heroPost.excerpt || "Click below to read more about this topic in depth."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-[var(--border-primary)] mt-auto">
                        <div className="flex flex-wrap gap-1.5">
                          {heroPost.tags?.slice(0, 3).map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleTagSelect(tag.name)}
                              className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/30 transition-colors cursor-pointer"
                            >
                              #{tag.name}
                            </button>
                          ))}
                        </div>

                        <Link
                          href={`/blog/${heroPost.slug}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-2xs shrink-0"
                        >
                          <span>Read Article</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Right: Uncropped 16:9 Cover Image Frame */}
                    <Link
                      href={`/blog/${heroPost.slug}`}
                      className="lg:col-span-6 relative aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden border border-[var(--border-primary)] bg-[var(--surface-secondary)] block order-1 lg:order-2 cursor-pointer"
                    >
                      {heroPost.image ? (
                        <Image
                          src={heroPost.image}
                          alt={heroPost.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          preload={true}
                          className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                          <BookOpen className="w-12 h-12 opacity-30" />
                        </div>
                      )}
                    </Link>

                  </div>
                </div>
              )}

              {/* Articles Grid (Adaptive so 1 or 2 posts never leave an empty 2/3 void) */}
              {gridPosts.length > 0 && (
                <div
                  className={cn(
                    "grid gap-6 items-stretch",
                    gridPosts.length === 1
                      ? "grid-cols-1 lg:grid-cols-12"
                      : gridPosts.length === 2
                        ? "grid-cols-1 md:grid-cols-2"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  )}
                >
                  {gridPosts.map((post) => (
                    <div
                      key={post.slug}
                      className={cn("h-full", gridPosts.length === 1 && "lg:col-span-7")}
                    >
                      <article className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-all duration-300 overflow-hidden group flex flex-col h-full hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] hover:-translate-y-0.5">

                        {/* Uncropped 16:9 Thumbnail Cover */}
                        <Link
                          href={`/blog/${post.slug}`}
                          className="aspect-video relative overflow-hidden bg-[var(--surface-secondary)] border-b border-[var(--border-primary)] block cursor-pointer"
                        >
                          {post.image ? (
                            <Image
                              src={post.image}
                              alt={post.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                              <BookOpen className="w-8 h-8 opacity-30" />
                            </div>
                          )}

                          {post.category?.name && (
                            <div className="absolute top-3 left-3 z-10">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-black/75 text-cyan-400 border border-cyan-500/30 backdrop-blur-md">
                                {post.category.name}
                              </span>
                            </div>
                          )}
                        </Link>

                        {/* Article Card Body */}
                        <div className="p-5 sm:p-6 flex flex-col flex-1">
                          <div className="flex items-center justify-between gap-3 text-xs font-mono text-[var(--text-muted)] mb-3">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                              {new Date(post.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                              {post.readTime} min read
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug mb-2.5">
                            <Link href={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h3>

                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-5 flex-1">
                            {post.excerpt || "Click to explore the complete engineering write-up and implementation."}
                          </p>

                          <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between gap-2 mt-auto">
                            {post.tags && post.tags.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleTagSelect(post.tags![0].name)}
                                className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-cyan-400 transition-colors cursor-pointer"
                              >
                                #{post.tags[0].name}
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                Tech Guide
                              </span>
                            )}

                            <Link
                              href={`/blog/${post.slug}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950 group-hover:border-cyan-400 transition-all"
                            >
                              <span>Read Article</span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </div>
                        </div>

                      </article>
                    </div>
                  ))}

                  {/* Companion Card when only 1 post is in the secondary row so there is no empty void */}
                  {gridPosts.length === 1 && (
                    <div className="lg:col-span-5 h-full">
                      <div className="h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-7 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-5">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Engineering Notes
                            </span>
                          </div>

                          <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mb-3 leading-snug">
                            Explore Structured Learning Series &amp; Labs
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                            Looking for step-by-step video walkthroughs and multi-part deployment guides? Check out our curated Learning Series covering VPS provisioning, OpenVPN routing, and Kubernetes clusters.
                          </p>

                          <div className="space-y-2.5 pt-4 border-t border-[var(--border-primary)] mb-6">
                            {[
                              "Production Routing & Tunneling Blueprints",
                              "Bare-Metal & Cloud VPS Hardening Guides",
                              "Kubernetes (K3s) High-Availability Setup",
                            ].map((point) => (
                              <div key={point} className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--border-primary)]">
                          <Link
                            href="/series"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex-1"
                          >
                            <span>Explore Learning Series</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href="#topics"
                            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-cyan-500/40 transition-all"
                          >
                            Browse Topics
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-8 border-t border-[var(--border-primary)]">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-9 h-9 rounded-xl text-xs font-mono font-bold transition-all border",
                            isActive
                              ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-2xs"
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
                    className="p-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── 2. CORE TOPIC TRACKS (REFINED) ─────────────────────────── */}
        <section id="topics" className="py-16 lg:py-24 relative z-10 border-t border-[var(--border-primary)]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Curated Knowledge Tracks
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Core Specialties We Cover
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Explore in-depth architectural patterns, production playbooks, and hands-on tutorials across our primary domains.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Server,
                tag: "Multi-Cloud",
                title: "Cloud Infrastructure",
                desc: "AWS, GCP & Azure VPC architectures, Terraform IaC blueprints, and multi-region network design.",
                categorySlug: "cloud",
              },
              {
                icon: Layers,
                tag: "Orchestration",
                title: "Kubernetes & K3s",
                desc: "Production container orchestration, Ingress controllers, Helm charts, and bare-metal nodes.",
                categorySlug: "kubernetes",
              },
              {
                icon: Terminal,
                tag: "Automation",
                title: "DevOps & CI/CD",
                desc: "Automated test-and-deploy pipelines, GitHub Actions workflows, Docker optimization, and GitOps.",
                categorySlug: "devops",
              },
              {
                icon: ShieldCheck,
                tag: "Zero-Trust",
                title: "Linux & Security",
                desc: "Server hardening, WireGuard tunnels, database high-availability, and zero-trust edge networks.",
                categorySlug: "security",
              },
            ].map((track, idx) => (
              <div key={idx} className="h-full">
                <div
                  onClick={() => handleTopicClick(track.categorySlug, track.title)}
                  className="group rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 hover:-translate-y-1 p-5 sm:p-6 flex flex-col justify-between h-full cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shrink-0">
                        <track.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                        {track.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {track.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                      {track.desc}
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-[var(--border-primary)] flex items-center justify-between text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <span>Filter Articles</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. COMMUNITY & NEWSLETTER CTA ──────────────────────────── */}
        <section className="pt-8 pb-0">
          <div className="rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />
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
