/**
 * Centralized OpenGraph image helpers with cache-busting versioning so
 * link preview bots (Telegram, WhatsApp, Discord, X) and CDNs never cache stale icons.
 */
export const OG_IMAGE_VERSION =
  process.env.NEXT_PUBLIC_BUILD_ID || String(Date.now());

export const OG_IMAGE_PATH = `/images/brand/og-image.webp?v=${OG_IMAGE_VERSION}`;

export function getFreshOgImagePath(): string {
  return `/images/brand/og-image.webp?v=${Date.now()}`;
}
