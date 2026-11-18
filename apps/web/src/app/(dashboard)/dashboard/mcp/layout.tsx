import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masdika MCP (Model Context Protocol)",
  description: "Connect Cursor, Claude Desktop, Antigravity, and AI Agents directly to Masdika Cloud infrastructure.",
  openGraph: {
    title: "Masdika MCP",
    description: "Connect Cursor, Claude Desktop, Antigravity, and AI Agents directly to Masdika Cloud infrastructure.",
    url: "https://www.masdika.id/dashboard/mcp",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
