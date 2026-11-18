import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Model Context Protocol (MCP) | Admin Panel',
  description: 'Manage Model Context Protocol client API keys, invocation logs, and platform tool endpoints.',
};

export default function AdminMcpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
