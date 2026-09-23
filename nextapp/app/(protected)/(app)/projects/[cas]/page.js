import PipelineView from '@/components/PipelineView.js';

export default async function CasPage({ params }) {
  const { cas } = await params;
  return <PipelineView cas={cas} />;
}
