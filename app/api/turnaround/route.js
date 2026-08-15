import { getPublicTurnaround } from '@/lib/schedule-service';

export async function GET() {
  const turnaround = await getPublicTurnaround();
  return Response.json(turnaround);
}
