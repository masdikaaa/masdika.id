import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { decryptDeterministic } from '@/lib/encryption';
import { unstable_cache } from 'next/cache';

const getCachedPostData = unstable_cache(
  async (slug: string) => {
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
      where: { key: { in: ['profileImage', 'githubUrl', 'social_github', 'bio', 'social_facebook', 'social_twitter', 'social_linkedin', 'social_instagram'] } }
    });
    
    const profileImageSetting = settings.find(s => s.key === 'profileImage');
    const githubUrlSetting = settings.find(s => s.key === 'social_github' || s.key === 'githubUrl');
    const bioSetting = settings.find(s => s.key === 'bio');
    
    const socialFacebook = settings.find(s => s.key === 'social_facebook')?.value;
    const socialTwitter = settings.find(s => s.key === 'social_twitter')?.value;
    const socialLinkedin = settings.find(s => s.key === 'social_linkedin')?.value;
    const socialInstagram = settings.find(s => s.key === 'social_instagram')?.value;
    
    const adminUser = await prisma.user.findFirst();

    // Decrypt sensitive data before sending to frontend
    if (post.author && post.author.name) post.author.name = decryptDeterministic(post.author.name);
    if (adminUser && adminUser.name) adminUser.name = decryptDeterministic(adminUser.name);

    if (post.comments) {
      for (const comment of post.comments) {
        if (comment.name) comment.name = decryptDeterministic(comment.name);
        if (comment.content) comment.content = decryptDeterministic(comment.content);
        if (comment.email) {
          const email = decryptDeterministic(comment.email);
          (comment as any).gravatar = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
          comment.email = ''; // Remove sensitive data
        }
        if (comment.replies) {
          for (const reply of comment.replies) {
            if (reply.name) reply.name = decryptDeterministic(reply.name);
            if (reply.content) reply.content = decryptDeterministic(reply.content);
            if (reply.email) {
              const email = decryptDeterministic(reply.email);
              (reply as any).gravatar = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
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
        adminName: adminUser?.name || 'Admin',
        socialFacebook: socialFacebook || null,
        socialTwitter: socialTwitter || null,
        socialLinkedin: socialLinkedin || null,
        socialInstagram: socialInstagram || null,
        reactionsCount: post._count.reactions,
      }
    };
  },
  ['blog-post-detail'],
  { revalidate: 60 } // Cache for 60 seconds to prevent DB overload during traffic spikes
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const cachedData = await getCachedPostData(slug);
    
    if (!cachedData) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // Reaction check is dynamic per user, but very fast/indexed
    const userReaction = await prisma.blogReaction.findUnique({
      where: {
        blogPostId_ipHash: {
          blogPostId: cachedData.post.id,
          ipHash
        }
      }
    });
    
    const postWithExtraData = {
      ...cachedData.post,
      ...cachedData.extra,
      hasReacted: !!userReaction
    };
    
    return NextResponse.json(postWithExtraData);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
