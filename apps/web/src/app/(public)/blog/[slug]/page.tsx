import { notFound } from "next/navigation";
import { headers } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { getCachedData } from "@/lib/cache";
import { BlogPostClient } from "./BlogPostClient";

export const dynamic = "force-dynamic";

const fetchPostData = async (slug: string) => {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      category: true,
      tags: {
        include: { tag: true }
      },
      author: true,
      comments: {
        where: {
          parentId: null,
          OR: [
            { isVerified: true },
            { isAdmin: true }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
          replies: {
            where: {
              OR: [
                { isVerified: true },
                { isAdmin: true }
              ]
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      },
      _count: {
        select: { reactions: true }
      }
    }
  });

  if (!post || !post.published) return null;

  // Fetch admin profile image, github url and bio from settings
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'profileImage',
          'githubUrl',
          'social_github',
          'bio',
          'social_facebook',
          'social_twitter',
          'social_linkedin',
          'social_instagram'
        ]
      }
    }
  });

  const profileImageSetting = settings.find(s => s.key === 'profileImage');
  const githubUrlSetting = settings.find(s => s.key === 'social_github' || s.key === 'githubUrl');
  const bioSetting = settings.find(s => s.key === 'bio');

  const socialFacebook = settings.find(s => s.key === 'social_facebook')?.value;
  const socialTwitter = settings.find(s => s.key === 'social_twitter')?.value;
  const socialLinkedin = settings.find(s => s.key === 'social_linkedin')?.value;
  const socialInstagram = settings.find(s => s.key === 'social_instagram')?.value;

  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { id: 'asc' },
  });

  // Decrypt sensitive data before sending to frontend
  if (post.author && post.author.name) {
    try {
      post.author.name = decryptDeterministic(post.author.name);
    } catch {}
  }

  let adminName = 'Admin';
  if (adminUser && adminUser.name) {
    try {
      adminName = decryptDeterministic(adminUser.name);
    } catch {
      adminName = adminUser.name;
    }
  }

  if (post.comments) {
    for (const comment of post.comments) {
      if (comment.name) {
        try { comment.name = decryptDeterministic(comment.name); } catch {}
      }
      if (comment.content) {
        try { comment.content = decryptDeterministic(comment.content); } catch {}
      }
      if (comment.email) {
        try {
          const email = decryptDeterministic(comment.email);
          (comment as any).gravatar = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
        } catch {}
        comment.email = ''; // Remove sensitive data
      }
      if (comment.replies) {
        for (const reply of comment.replies) {
          if (reply.name) {
            try { reply.name = decryptDeterministic(reply.name); } catch {}
          }
          if (reply.content) {
            try { reply.content = decryptDeterministic(reply.content); } catch {}
          }
          if (reply.email) {
            try {
              const email = decryptDeterministic(reply.email);
              (reply as any).gravatar = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
            } catch {}
            reply.email = ''; // Remove sensitive data
          }
        }
      }
    }
  }

  return {
    post,
    extra: {
      adminImage: profileImageSetting?.value || null,
      githubUrl: githubUrlSetting?.value || '#',
      authorBio: bioSetting?.value || null,
      adminName,
      socialFacebook: socialFacebook || null,
      socialTwitter: socialTwitter || null,
      socialLinkedin: socialLinkedin || null,
      socialInstagram: socialInstagram || null,
      reactionsCount: post._count.reactions,
    }
  };
};

const getRecentPosts = async (currentSlug: string) => {
  return getCachedData(`recent-posts:${currentSlug}`, 300, async () => {
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        slug: { not: currentSlug }
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        image: true,
        readTime: true,
        createdAt: true,
        category: {
          select: {
            name: true,
            slug: true,
          }
        }
      }
    });

    return JSON.parse(JSON.stringify(posts));
  });
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cachedData = await getCachedData<{ post: any; extra: any } | null>(
    `posts:${slug}`,
    300,
    () => fetchPostData(slug)
  );

  if (!cachedData || !cachedData.post) {
    notFound();
  }

  let hasReacted = false;
  try {
    const headerList = await headers();
    const cfIp = headerList.get('cf-connecting-ip');
    const forwarded = headerList.get('x-forwarded-for');
    const realIp = headerList.get('x-real-ip');
    const ip = cfIp || (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || 'unknown';

    if (ip && ip !== 'unknown') {
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
      const userReaction = await prisma.blogReaction.findUnique({
        where: {
          blogPostId_ipHash: {
            blogPostId: cachedData.post.id,
            ipHash
          }
        }
      });
      hasReacted = !!userReaction;
    }
  } catch (err) {
    console.error('Error determining user reaction in BlogPostPage:', err);
  }

  const initialPost = JSON.parse(
    JSON.stringify({
      ...cachedData.post,
      ...cachedData.extra,
      hasReacted
    })
  );

  const recentPosts = await getRecentPosts(slug);

  return (
    <BlogPostClient
      initialPost={initialPost}
      initialRecentPosts={recentPosts || []}
      slug={slug}
    />
  );
}
