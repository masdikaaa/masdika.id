"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, CalendarDays, Briefcase, Video, Inbox, ArrowRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Opportunity } from "@prisma/client";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface OpportunityGridProps {
  opportunities: Opportunity[];
  emptyType?: 'EVENT' | 'JOBS' | 'ALL';
}

const ITEMS_PER_PAGE = 6;

export function OpportunityGrid({ opportunities, emptyType = 'ALL' }: OpportunityGridProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOpportunities = useMemo(() => {
    if (!searchQuery.trim()) return opportunities;
    const q = searchQuery.toLowerCase();
    return opportunities.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q)
    );
  }, [opportunities, searchQuery]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredOpportunities.length / ITEMS_PER_PAGE);

  const paginatedOpportunities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOpportunities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOpportunities, currentPage]);

  if (opportunities.length === 0) {
    const EmptyIcon = emptyType === 'JOBS' ? Briefcase : emptyType === 'EVENT' ? CalendarDays : Inbox;
    const emptyTitle = emptyType === 'JOBS' ? "No vacancies found" : emptyType === 'EVENT' ? "No events scheduled" : "No items found";
    const emptyDesc = emptyType === 'JOBS' 
      ? "There are currently no active job vacancies. Please check back soon or submit a role."
      : "There are currently no sessions published in this category.";

    return (
      <div className="text-center py-20 px-6 sm:px-10 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)]">
        <EmptyIcon className="w-12 h-12 mx-auto mb-4 text-cyan-600/60 dark:text-cyan-400/60" />
        <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{emptyTitle}</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">{emptyDesc}</p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT':   return <Calendar className="w-4 h-4" />;
      case 'WEBINAR': return <Video className="w-4 h-4" />;
      case 'JOBS':   return <Briefcase className="w-4 h-4" />;
      default:        return <Calendar className="w-4 h-4" />;
    }
  };

  const getHref = (item: Opportunity) => {
    if (item.type === 'JOBS')  return `/vacancies/${item.slug || item.id}`;
    if (item.type === 'EVENT')  return `/events/${item.slug || item.id}`;
    return `/opportunities/${item.slug || item.id}`;
  };

  const searchPlaceholder = emptyType === 'JOBS'
    ? "Search jobs, roles, or tech stack..."
    : "Search events, webinars, or workshops...";

  return (
    <div className="mb-24">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Search className="h-5 w-5 text-[var(--text-muted)] group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors" />
          </div>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm sm:text-base"
          />
        </div>
      </div>

            {filteredOpportunities.length === 0 && searchQuery.trim() !== "" ? (
              <div className="text-center py-16 px-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)]">
                <Search className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No results found</h3>
                <p className="max-w-sm mx-auto text-sm text-[var(--text-secondary)]">We couldn&apos;t find anything matching &quot;{searchQuery}&quot;. Try searching with different keywords.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedOpportunities.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: (idx % 6) * 0.08, ease: "easeOut" }}
                      className="h-full"
                    >
                      {/* Entire card is a link with clean design system styling */}
                      <Link 
                        href={getHref(item)} 
                        className="group relative rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col h-full"
                      >
                        {/* Image header */}
                        <div className="relative z-10 h-48 w-full shrink-0 overflow-hidden bg-[var(--surface-secondary)] border-b border-[var(--border-primary)]">
                          {item.image ? (
                            <img 
                              referrerPolicy="no-referrer" 
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy" 
                              decoding="async" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-16 h-16 rounded-xl flex items-center justify-center border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                                {(() => {
                                  const Icon = item.type === 'JOBS' ? Briefcase : item.type === 'WEBINAR' ? Video : Calendar;
                                  return <Icon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />;
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Badges */}
                          <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-[#121316]/90 text-cyan-700 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-500/30 backdrop-blur-md shadow-sm">
                              {getTypeIcon(item.type)}
                              {item.type}
                            </span>
                            
                            {item.isNew && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                                NEW
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 p-6 flex flex-col flex-grow">
                          <h3 className="text-base sm:text-lg font-bold mb-2 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3">
                              {item.description}
                            </p>
                          )}

                          <div className="flex-grow" />

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-primary)]">
                            <div className="text-xs text-[var(--text-muted)] font-medium">
                              {new Date(item.createdAt).toLocaleDateString('en-GB')}
                            </div>

                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 group-hover:underline">
                              Read Details
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Premium Numeric Pagination */}
                {totalPages > 1 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[var(--border-primary)]"
                  >
                    {/* Counter / Info */}
                    <div className="text-sm font-medium text-[var(--text-secondary)]">
                      Showing{" "}
                      <span className="font-bold text-[var(--text-primary)]">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-[var(--text-primary)]">
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredOpportunities.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-[var(--text-primary)]">
                        {filteredOpportunities.length}
                      </span>{" "}
                      {emptyType === 'JOBS' ? 'vacancies' : emptyType === 'EVENT' ? 'events' : 'items'}
                    </div>

                    {/* Page buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => {
                          setCurrentPage(p => Math.max(1, p - 1));
                          document.getElementById('vacancies-grid')?.scrollIntoView({ behavior: 'smooth' });
                          document.getElementById('events-grid')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        disabled={currentPage === 1}
                        className="p-2 sm:p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:border-cyan-500/40 transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isActive = currentPage === pageNum;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setCurrentPage(pageNum);
                                document.getElementById('vacancies-grid')?.scrollIntoView({ behavior: 'smooth' });
                                document.getElementById('events-grid')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className={cn(
                                "w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center border",
                                isActive
                                  ? "bg-cyan-400 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-400/20 scale-105"
                                  : "bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => {
                          setCurrentPage(p => Math.min(totalPages, p + 1));
                          document.getElementById('vacancies-grid')?.scrollIntoView({ behavior: 'smooth' });
                          document.getElementById('events-grid')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        disabled={currentPage === totalPages}
                        className="p-2 sm:p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:border-cyan-500/40 transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
        </>
      )}
    </div>
  );
}
