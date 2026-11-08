import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { encryptDeterministic, decryptDeterministic } from '@/lib/encryption';
import { sendCommentReplyEmail } from '@/lib/email';
import { verifyDomainToken } from '@/lib/session';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';

const HTML_SECURITY_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
};

/** Escape HTML special characters to prevent XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit('VERIFY_COMMENT', ip, 20, 60))) {
    return invalidTokenResponse('Too many verification attempts. Please wait a minute.');
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token || token.length > 8192) {
    return new NextResponse('Invalid or missing verification token.', { status: 400 });
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return invalidTokenResponse();
  }

  const [payloadBase64, signature] = parts;

  // Verify domain-separated HMAC signature using timing-safe comparison
  if (!verifyDomainToken('comment-verify', payloadBase64, signature)) {
    return invalidTokenResponse();
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    if (
      !payload ||
      typeof payload.name !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.content !== 'string' ||
      !Number.isInteger(payload.blogPostId)
    ) {
      return invalidTokenResponse();
    }

    // Check expiration
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return invalidTokenResponse("The verification link has expired.");
    }

    // Replay attack prevention: generate a unique hash for this token and atomically claim it
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const usedTokenKey = `USED_COMMENT_TOKEN_${tokenHash.substring(0, 32)}`;
    
    const alreadyUsed = await prisma.setting.findUnique({ where: { key: usedTokenKey } });
    if (alreadyUsed) {
      return invalidTokenResponse("This verification link has already been used.");
    }

    // Check if published post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: payload.blogPostId }
    });

    if (!post || !post.published) {
      return invalidTokenResponse("The associated blog post no longer exists.");
    }

    let validParentComment: { id: number; email: string | null; name: string | null } | null = null;
    if (payload.parentId) {
      validParentComment = await prisma.comment.findFirst({
        where: { id: Number(payload.parentId), blogPostId: post.id, isVerified: true },
        select: { id: true, email: true, name: true },
      });
      if (!validParentComment) {
        return invalidTokenResponse("The parent comment no longer exists.");
      }
    }

    // Mark token as used BEFORE creating the comment to prevent race conditions
    try {
      await prisma.setting.create({
        data: { key: usedTokenKey, value: new Date().toISOString() }
      });
    } catch (claimErr: any) {
      if (claimErr?.code === 'P2002') {
        return invalidTokenResponse("This verification link has already been used.");
      }
      throw claimErr;
    }

    // Since token is stateless and valid, insert the verified comment
    await prisma.comment.create({
      data: {
        name: encryptDeterministic(payload.name),
        email: encryptDeterministic(payload.email.toLowerCase().trim()),
        content: encryptDeterministic(payload.content),
        blogPostId: payload.blogPostId,
        parentId: validParentComment ? validParentComment.id : null,
        ipAddress: payload.ipAddress,
        isVerified: true
      }
    });

    // Notify Parent Commenter if it's a reply
    if (validParentComment && validParentComment.email && validParentComment.name) {
      try {
        const toEmail = decryptDeterministic(validParentComment.email);
        const toName = decryptDeterministic(validParentComment.name);
        // Don't send email if they are replying to themselves
        if (toEmail && toEmail !== payload.email.toLowerCase().trim()) {
          await sendCommentReplyEmail(
            toEmail,
            toName,
            payload.name,
            post.title,
            post.slug,
            payload.content
          );
        }
      } catch (err) {
        console.error("Error sending reply notification:", err);
      }
    }


    // Send Admin Notification Email
    const { sendAdminNotificationEmail } = await import('@/lib/email');
    sendAdminNotificationEmail(
      `New Verified Comment on "${post.title}"`,
      `Name: ${payload.name}\nEmail: ${payload.email}\n\nComment:\n${payload.content}`,
      `/admin/comments`
    ).catch(err => console.error('Failed to send admin notification email:', err));

    // Redirect to the blog post — escape slug to prevent XSS
    const safeSlug = escapeHtml(post.slug);
    const postUrl = `/blog/${safeSlug}`;
    
    return new NextResponse(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=${postUrl}" />
        </head>
        <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #011627; color: white;">
          <div style="text-align: center; background: #0a1f33; padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <h1 style="color: #10b981; margin-top: 0;">Comment Verified!</h1>
            <p>Thank you. Your comment has been successfully verified and published.</p>
            <p style="font-size: 14px; color: #9ca3af; margin-top: 20px;">Redirecting you back to the article...</p>
            <a href="${postUrl}" style="display: inline-block; margin-top: 10px; color: #06b6d4; text-decoration: none;">Click here if not redirected</a>
          </div>
        </body>
      </html>
    `, { headers: HTML_SECURITY_HEADERS });

  } catch (error) {
    console.error('Error verifying comment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function invalidTokenResponse(message = "The verification link is invalid, expired, or has already been used.") {
  const safeMessage = escapeHtml(message);
  return new NextResponse(`
    <html>
      <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #011627; color: white;">
        <div style="text-align: center; background: #0a1f33; padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
          <h1 style="color: #ef4444; margin-top: 0;">Invalid Token</h1>
          <p>${safeMessage}</p>
          <a href="/" style="display: inline-block; margin-top: 20px; color: #06b6d4; text-decoration: none;">Return Home</a>
        </div>
      </body>
    </html>
  `, { headers: HTML_SECURITY_HEADERS, status: 400 });
}

