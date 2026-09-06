import Contact from '@/components/Contact';
import { getPublicTurnaround } from '@/lib/schedule-service';

export default async function ContactPage() {
  return <Contact turnaround={await getPublicTurnaround()} />;
}
