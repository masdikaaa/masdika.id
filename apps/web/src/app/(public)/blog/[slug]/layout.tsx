import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const post = await prisma.blogPost.findUnique({ 
      where: { slug } 
    });
    
    if (!post) return { title: "Not Found" };
    
    const cleanDescription = post.excerpt.replace(/\r?\n|\r/g, ' ').trim();

    return {
      title: post.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim(),
      description: cleanDescription,
      openGraph: {
        title: post.title,
        description: cleanDescription,
        images: post.image ? [{ url: post.image }] : [],
      },
      twitter: {
        title: post.title,
        description: cleanDescription,
        images: post.image ? [post.image] : [],
      }
    };
  } catch (error) {
    return { title: "Blog" };
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
