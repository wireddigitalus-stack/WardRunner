/**
 * Generate a high-precision Apple Maps URL that:
 * 1. Centers the map directly on the address (ll=lat,lng)
 * 2. Drops a pinned callout with the verified street address (q=address)
 * 3. Works seamlessly on macOS Apple Maps, iOS Apple Maps, and web fallback
 */
export function getAppleMapsUrl(options: {
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  title?: string | null;
  mode?: 'view' | 'directions';
}): string {
  const { address, lat, lng, title, mode = 'view' } = options;

  let queryAddress = '';
  if (address && address.trim()) {
    queryAddress = address.trim();
  } else if (title && title.trim()) {
    queryAddress = title.trim();
  }

  // Ensure city and state are appended so Apple Maps geocodes to Bristol, TN
  if (queryAddress) {
    const lower = queryAddress.toLowerCase();
    if (!lower.includes('bristol') && !lower.includes('tn') && !lower.includes('tennessee') && !lower.includes('37620')) {
      queryAddress = `${queryAddress}, Bristol, TN 37620`;
    }
  }

  const params: string[] = [];

  // q parameter drops the pin and displays the address label in Apple Maps
  if (queryAddress) {
    params.push(`q=${encodeURIComponent(queryAddress)}`);
  } else if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    params.push(`q=${encodeURIComponent('Sign Location')}`);
  }

  // ll parameter centers the map camera exactly on the coordinates
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    params.push(`ll=${lat},${lng}`);
  }

  // If directions mode requested, also provide daddr
  if (mode === 'directions') {
    if (queryAddress) {
      params.push(`daddr=${encodeURIComponent(queryAddress)}`);
    } else if (lat != null && lng != null) {
      params.push(`daddr=${lat},${lng}`);
    }
  }

  return `https://maps.apple.com/?${params.join('&')}`;
}
