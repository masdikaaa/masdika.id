import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export function mcpError(message: string, status = 400, code = "INVALID_REQUEST") {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
    },
    { status }
  );
}

function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export function extractMcpApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  const bearerMatch = authHeader?.match(/^Bearer\s+(masdika_[A-Za-z0-9]+)$/i);
  if (bearerMatch) return bearerMatch[1];

  const headerKey = req.headers.get("x-api-key")?.trim();
  if (headerKey && /^masdika_[A-Za-z0-9]+$/.test(headerKey)) {
    return headerKey;
  }
  return null;
}

/**
 * Authenticates an MCP API request using `Authorization: Bearer masdika_...` or `x-api-key`.
 */
export async function authenticateMcpRequest(req: NextRequest) {
  const token = extractMcpApiKey(req);
  const ip = getClientIp(req);

  if (!token) {
    const allowed = await checkRateLimit("MCP_BAD_AUTH", ip, 30, 60);
    if (!allowed) {
      return { error: mcpError("Too many failed authentication attempts. Please try again later.", 429, "RATE_LIMITED") };
    }
    return {
      error: mcpError(
        "Missing or invalid API Key. Please provide Authorization: Bearer masdika_... or x-api-key header.",
        401,
        "UNAUTHORIZED"
      ),
    };
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: token },
    include: { user: true },
  });

  if (!apiKey) {
    const allowed = await checkRateLimit("MCP_BAD_AUTH", ip, 30, 60);
    if (!allowed) {
      return { error: mcpError("Too many failed authentication attempts. Please try again later.", 429, "RATE_LIMITED") };
    }
    return { error: mcpError("Invalid API Key.", 401, "UNAUTHORIZED") };
  }

  if (apiKey.status !== "ACTIVE") {
    return { error: mcpError("This API Key has been suspended or revoked.", 403, "KEY_INACTIVE") };
  }

  if (apiKey.service !== "MCP" && apiKey.service !== "ALL") {
    return {
      error: mcpError(
        "This API Key does not have MCP permissions. Please generate an MCP key from the dashboard.",
        403,
        "KEY_SERVICE_MISMATCH"
      ),
    };
  }

  if (apiKey.user.isSuspended) {
    return { error: mcpError("Your Masdika Cloud account is currently suspended.", 403, "ACCOUNT_SUSPENDED") };
  }

  // Rate limit authenticated requests (e.g. 180 req / min per user)
  const allowed = await checkRateLimit("MCP_API_CALL", apiKey.userId.toString(), 180, 60);
  if (!allowed) {
    return { error: mcpError("Rate limit exceeded (180 requests/min). Please try again shortly.", 429, "RATE_LIMITED") };
  }

  // Track key usage asynchronously
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date(), usageCount: { increment: 1 } },
    })
    .catch(() => {});

  return { user: apiKey.user, apiKey };
}
