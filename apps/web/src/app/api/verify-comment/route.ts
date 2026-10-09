import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { encryptDeterministic, decryptDeterministic } from '@/lib/encryption';
import { sendCommentReplyEmail } from '@/lib/email';

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
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Invalid or missing verification token.', { status: 400 });
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return invalidTokenResponse();
  }

  const [payloadBase64, signature] = parts;

  const secret = process.env.SESSION_SECRET || 'default_secret';
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || secret === 'default_secret')) {
    throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is missing in production.');
  }

  // Verify signature using timing-safe comparison
  const expectedSignature = crypto.createHmac('sha256', secret)
                                  .update(payloadBase64)
                                  .digest('hex');

  if (signature.length !== expectedSignature.length) {
    return invalidTokenResponse();
  }

  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return invalidTokenResponse();
    }
  } catch {
    return invalidTokenResponse();
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return invalidTokenResponse("The verification link has expired.");
    }

    // Replay attack prevention: generate a unique hash for this token and check if already used
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const usedTokenKey = `USED_COMMENT_TOKEN_${tokenHash.substring(0, 16)}`;
    
    const alreadyUsed = await prisma.setting.findUnique({ where: { key: usedTokenKey } });
    if (alreadyUsed) {
      return invalidTokenResponse("This verification link has already been used.");
    }

    // Check if post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: payload.blogPostId }
    });

    if (!post) {
      return invalidTokenResponse("The associated blog post no longer exists.");
    }

    // Mark token as used BEFORE creating the comment to prevent race conditions
    await prisma.setting.create({
      data: { key: usedTokenKey, value: new Date().toISOString() }
    });

    // Since token is stateless and valid, insert the verified comment
    const comment = await prisma.comment.create({
      data: {
        name: encryptDeterministic(payload.name),
        email: encryptDeterministic(payload.email.toLowerCase().trim()),
        content: encryptDeterministic(payload.content),
        blogPostId: payload.blogPostId,
        parentId: payload.parentId || null,
        ipAddress: payload.ipAddress,
        isVerified: true
      }
    });

    // Notify Parent Commenter if it's a reply
    if (payload.parentId) {
      try {
        const parentComment = await prisma.comment.findUnique({
          where: { id: payload.parentId }
        });
        if (parentComment && parentComment.email && parentComment.name) {
          const toEmail = decryptDeterministic(parentComment.email);
          const toName = decryptDeterministic(parentComment.name);
          // Don't send email if they are replying to themselves
          if (toEmail !== payload.email.toLowerCase().trim()) {
            await sendCommentReplyEmail(
              toEmail,
              toName,
              payload.name,
              post.title,
              post.slug,
              payload.content
            );
          }
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
    `, { headers: { 'Content-Type': 'text/html' } });

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
  `, { headers: { 'Content-Type': 'text/html' }, status: 400 });
}

