import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest, mcpError } from "@/lib/mcp-auth";
import { MASDIKA_MCP_TOOLS, executeMcpTool } from "@/lib/mcp-tools";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/mcp
 * Metadata & Tool Discovery Endpoint for Model Context Protocol.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: "masdika-mcp",
    title: "Masdika Cloud MCP Server",
    description: "Official Model Context Protocol server for Masdika Cloud infrastructure management (VPS, Databases, Apps, Top-Up, Invoices, File CDN).",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    vendor: "Masdika Cloud (https://www.masdika.id)",
    toolsCount: MASDIKA_MCP_TOOLS.length,
    tools: MASDIKA_MCP_TOOLS,
  });
}

/**
 * POST /api/v1/mcp
 * JSON-RPC 2.0 & REST Execution Endpoint for MCP Tools.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateMcpRequest(req);
    if (auth.error) {
      return auth.error;
    }
    const { user } = auth;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return mcpError("Malformed JSON payload.", 400, "PARSE_ERROR");
    }

    // 1. Handle JSON-RPC 2.0 "initialize"
    if (body.method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? 1,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: "masdika-mcp",
            version: "1.0.0",
          },
        },
      });
    }

    // 2. Handle JSON-RPC 2.0 "tools/list"
    if (body.method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? 1,
        result: {
          tools: MASDIKA_MCP_TOOLS,
        },
      });
    }

    // 3. Handle JSON-RPC 2.0 "tools/call"
    if (body.method === "tools/call") {
      const toolName = body.params?.name;
      const toolArgs = body.params?.arguments || {};

      if (!toolName || typeof toolName !== "string") {
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id ?? 1,
          error: {
            code: -32602,
            message: "Missing or invalid tool name in params.name.",
          },
        });
      }

      const execution = await executeMcpTool(toolName, toolArgs, user);

      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? 1,
        result: {
          content: execution.content,
          isError: execution.isError || false,
        },
      });
    }

    // 4. Handle Direct REST Execution: { tool: "masdika_...", params: { ... } }
    const directTool = body.tool || body.name;
    if (directTool && typeof directTool === "string") {
      const toolArgs = body.params || body.arguments || {};
      const execution = await executeMcpTool(directTool, toolArgs, user);

      return NextResponse.json({
        success: !execution.isError,
        tool: directTool,
        result: execution,
      });
    }

    // If no recognized format:
    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id ?? null,
      error: {
        code: -32601,
        message: `Method not found or unsupported: '${body.method}'`,
      },
    }, { status: 400 });
  } catch (error: any) {
    console.error("[MCP_ROUTE_POST_ERROR]", error);
    return mcpError(error?.message || "Internal server error during MCP execution.", 500, "INTERNAL_ERROR");
  }
}
