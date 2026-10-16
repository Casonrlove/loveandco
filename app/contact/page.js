import Contact from '@/components/Contact';

export default async function ContactPage({ searchParams }) {
  const { order } = await searchParams;
  return <Contact order={typeof order === 'string' && /^[0-9a-f]{8}$/i.test(order) ? order.toLowerCase() : ''} />;
}
