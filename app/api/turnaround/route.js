import { getFreshPublicTurnaround } from '@/lib/schedule-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const turnaround = await getFreshPublicTurnaround();
  return Response.json(turnaround, { headers: { 'Cache-Control': 'no-store' } });
}
