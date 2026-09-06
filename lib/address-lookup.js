import 'server-only';
import { addressFromGoogleComponents } from './address.js';

export function placesKey() {
  return process.env.GOOGLE_PLACES_API_KEY || '';
}

export async function suggestAddresses(query, sessionToken = '') {
  const key = placesKey();
  if (!key) return { error: 'not_configured', suggestions: [] };

  const newer = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ['us'],
      languageCode: 'en',
      ...(sessionToken ? { sessionToken } : {}),
    }),
    cache: 'no-store', signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (newer?.ok) {
    const data = await newer.json();
    const suggestions = (data.suggestions || []).map((item) => {
      const prediction = item.placePrediction || {};
      const placeId = String(prediction.placeId || '').replace(/^places\//, '');
      const label = prediction.text?.text || prediction.structuredFormat?.mainText?.text || '';
      if (!placeId || !label) return null;
      return { id: placeId, placeId, label };
    }).filter(Boolean);
    return { suggestions };
  }

  const legacy = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  legacy.searchParams.set('input', query);
  legacy.searchParams.set('types', 'address');
  legacy.searchParams.set('components', 'country:us');
  legacy.searchParams.set('key', key);
  if (sessionToken) legacy.searchParams.set('sessiontoken', sessionToken);
  const response = await fetch(legacy, { cache: 'no-store', signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!response?.ok) return { suggestions: [] };
  const data = await response.json().catch(() => ({}));
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return { suggestions: [], error: 'lookup_unavailable' };
  }
  return {
    suggestions: (data.predictions || []).map((item) => ({
      id: item.place_id,
      placeId: item.place_id,
      label: item.description,
    })),
  };
}

export async function detailsForPlace(placeId, sessionToken = '') {
  const key = placesKey();
  if (!key || !placeId) return null;

  const newer = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'id,formattedAddress,addressComponents',
    },
    cache: 'no-store', signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (newer?.ok) {
    const data = await newer.json();
    const parsed = addressFromGoogleComponents(data.addressComponents, data.formattedAddress);
    if (parsed) return parsed;
  }

  const legacy = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  legacy.searchParams.set('place_id', placeId);
  legacy.searchParams.set('fields', 'address_component,formatted_address');
  legacy.searchParams.set('key', key);
  if (sessionToken) legacy.searchParams.set('sessiontoken', sessionToken);
  const response = await fetch(legacy, { cache: 'no-store', signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!response?.ok) return null;
  const data = await response.json().catch(() => ({}));
  return addressFromGoogleComponents(data.result?.address_components, data.result?.formatted_address);
}
