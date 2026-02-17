import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio Partilhado',
  description: 'Visualiza o portfolio partilhado de um utilizador Converge.',
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
