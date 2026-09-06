import { getPublicTurnaround } from '@/lib/schedule-service';

export const revalidate = 300;
export const dynamic = 'force-static';

export async function GET() {
  const turnaround = await getPublicTurnaround();
  return Response.json(turnaround);
}
