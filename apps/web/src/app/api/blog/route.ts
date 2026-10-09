import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: verify API key and increment usage
async function verifyApiKey(req: NextRequest): Promise<{ valid: boolean; keyId?: number }> {
  const authHeader = req.headers.get("authorization");
  let apiKey = authHeader?.split(" ")[1];

  if (!apiKey) {
    apiKey = req.nextUrl.searchParams.get("apikey") || undefined;
  }

  if (!apiKey) return { valid: false };

  const keyRecord = await prisma.apiKey.findUnique({ where: { key: apiKey } });
  if (!keyRecord) return { valid: false };

  // Increment usage count
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { usageCount: { increment: 1 }, lastUsed: new Date() }
  });

  return { valid: true, keyId: keyRecord.id };
}

// GET /api/public/v1/blog — list published posts
// Query params: ?page=1&limit=10&category=slug&tag=name&search=keyword
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyApiKey(req);
    if (!auth.valid) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid API key via Authorization header or ?apikey= query param." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const slug = searchParams.get("slug");

    // If slug provided, return single post
    if (slug) {
      const post = await prisma.blogPost.findUnique({
        where: { slug, published: true },
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: { select: { name: true } }
        }
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      return NextResponse.json({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        image: post.image,
        readTime: post.readTime,
        category: post.category ? { id: post.category.id, name: post.category.name, slug: post.category.slug } : null,
        tags: post.tags.map(pt => pt.tag).map(t => ({ id: t.id, name: t.name, slug: t.slug })),
        author: post.author?.name || "Admin",
        publishedAt: post.createdAt,
        updatedAt: post.updatedAt
      });
    }

    // Build list query
    const where: any = { published: true };
    if (category) where.category = { slug: category };
    if (tag) where.tags = { some: { tag: { slug: tag } } };
    if (search) where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
      { content: { contains: search } }
    ];

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
          author: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      })
    ]);

    return NextResponse.json({
      data: posts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        image: post.image,
        readTime: post.readTime,
        category: post.category,
        tags: post.tags.map(pt => pt.tag),
        author: post.author?.name || "Admin",
        publishedAt: post.createdAt,
        updatedAt: post.updatedAt
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("[Blog API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
