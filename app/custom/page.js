import CustomPage from '@/components/CustomPage';
import { getPublicTurnaround } from '@/lib/schedule-service';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Custom · Love & Co. Embroidery' };

export default async function CustomRoute() {
  const turnaround = await getPublicTurnaround();
  return <CustomPage turnaround={turnaround} />;
}
