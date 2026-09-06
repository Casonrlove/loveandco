export async function GET(_request, { params }) {
  const code = String((await params).code || '').replace(/\D/g, '').slice(0, 5);
  if (code.length !== 5) {
    return Response.json({ found: false, error: 'Enter a 5-digit ZIP code.' }, { status: 400 });
  }

  const response = await fetch(`https://api.zippopotam.us/us/${code}`, {
    signal: AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  }).catch(() => null);

  if (!response?.ok) {
    return Response.json({ found: false }, { status: 404 });
  }

  const data = await response.json().catch(() => ({}));
  const place = data.places?.[0];
  if (!place) return Response.json({ found: false }, { status: 404 });

  return Response.json({
    found: true,
    city: place['place name'] || '',
    region: place['state abbreviation'] || '',
  });
}
