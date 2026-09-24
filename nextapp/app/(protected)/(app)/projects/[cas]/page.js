import { notFound } from 'next/navigation';
import PipelineView  from '@/components/PipelineView.js';
import { requireProjectAccess } from '@/lib/project-auth.js';

export default async function CasPage({ params }) {
  const { cas } = await params;
  const result = await requireProjectAccess(cas);
  if (result.error) notFound();
  return <PipelineView cas={cas} />;
}
