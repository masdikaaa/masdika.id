import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Gateway',
  description: 'Unified OpenAI and Anthropic compatible AI Gateway with Rupiah pay-as-you-go billing.',
  openGraph: {
    title: 'AI Gateway',
    description: 'Unified OpenAI and Anthropic compatible AI Gateway with Rupiah pay-as-you-go billing.',
    url: 'https://www.masdika.id/dashboard/ai-gateway',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
