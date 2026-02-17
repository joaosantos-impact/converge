import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Artigos sobre crypto, impostos e portfolio management.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
