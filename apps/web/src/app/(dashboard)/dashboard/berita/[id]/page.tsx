import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import BeritaDetailClient from "./BeritaDetailClient";

function linkifyHtml(html: string) {
  const regex = /(<[^>]+>)|(\bhttps?:\/\/[a-zA-Z0-9\-\.\/\?\:\@\&\=\+\~\_\%\#]+)/gi;
  let inAnchor = false;
  
  return html.replace(regex, (match, tag, url) => {
    if (tag) {
      if (/^<a\b/i.test(tag)) inAnchor = true;
      else if (/^<\/a>/i.test(tag)) inAnchor = false;
      return tag;
    }
    if (url) {
      if (inAnchor) return url;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-400/30 hover:decoration-cyan-300/50 transition-all font-medium">${url}</a>`;
    }
    return match;
  });
}
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const berita = await prisma.announcement.findUnique({
    where: { id: parseInt(id) },
    select: { title: true }
  });
  
  if (!berita) return { title: 'Announcement Not Found' };
  
  return {
    title: berita.title,
    description: `Read announcement: ${berita.title}`,
  };
}
export default async function BeritaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const berita = await prisma.announcement.findUnique({
    where: { id: parseInt(id) }
  });

  if (!berita) {
    notFound();
  }

  // Check if content is structured HTML (like from the admin panel)
  const isStructured = berita.content.includes("<!-- state:");

  // Wrap tables with a responsive scroll container and linkify plain URLs
  const contentWithResponsiveTables = linkifyHtml(berita.content)
    .replace(/<table/gi, '<div class="w-full overflow-x-auto custom-scrollbar pb-2"><table')
    .replace(/<\/table>/gi, '</table></div>');

  return <BeritaDetailClient berita={berita} contentHtml={contentWithResponsiveTables} isStructured={isStructured} />;
}
