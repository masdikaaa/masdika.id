import { NextResponse } from "next/server";

export async function GET() {
  // Use bracket notation and dynamic key so Next.js static bundler doesn't inline it at build time.
  // This forces it to read the value from the VPS's actual .env file at runtime.
  const envKey = 'NEXT_PUBLIC_TURNSTILE_SITE_KEY';
  const siteKey = process.env[envKey] || "";
  
  return NextResponse.json({ siteKey });
}
