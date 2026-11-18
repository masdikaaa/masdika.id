import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cloud Architecture, Kubernetes & DevOps Expertise',
  description: 'Explore Masdika technical expertise in Cloud Architecture, Kubernetes orchestration, DevOps automation, MikroTik networking, and full-stack web engineering.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
