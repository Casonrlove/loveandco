import CustomerProof from '@/components/CustomerProof';
export const metadata = { title: 'Review your personalization · Love & Co.', robots: { index: false, follow: false } };
export default async function ProofPage({ params }) { const { id } = await params; return <CustomerProof id={id} />; }
