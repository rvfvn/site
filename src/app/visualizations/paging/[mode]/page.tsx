import { notFound } from 'next/navigation';
import PagingWalkthrough from '@/components/paging/walkthrough';
const modes = ['mapping', 'translation', 'replacement', 'fifo', 'second-chance', 'lru'] as const;
export function generateStaticParams() { return modes.map(mode => ({ mode })); }
export const metadata = { title: 'Paging, step by step', robots: { index: false, follow: true } };
export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!modes.includes(mode as typeof modes[number])) notFound();
  return <PagingWalkthrough mode={mode as typeof modes[number]} />;
}
