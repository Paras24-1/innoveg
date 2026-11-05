/**
 * Haversine formula to calculate the distance between two GPS coordinates in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  
  const R = 6371; // Earth's radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Number(distance.toFixed(2));
}

/**
 * Exact distance in meters between two GPS coordinates (used for Two-Point GPS drift detection)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Check if the new GPS point is within `thresholdMeters` (default 150m) of any prior visit
 */
export function isDuplicateLocation(
  newLat: number,
  newLng: number,
  previousVisits: { latitude: number; longitude: number }[],
  thresholdMeters: number = 150
): boolean {
  const thresholdKm = thresholdMeters / 1000;
  return previousVisits.some((visit) => {
    const dist = calculateDistanceKm(newLat, newLng, visit.latitude, visit.longitude);
    return dist <= thresholdKm;
  });
}

/**
 * Calculate total sequential route distance for an employee's visits
 */
export function calculateTotalRouteKm(
  visits: { latitude: number; longitude: number }[]
): number {
  if (visits.length <= 1) return 0;
  let totalKm = 0;
  for (let i = 1; i < visits.length; i++) {
    totalKm += calculateDistanceKm(
      visits[i - 1].latitude,
      visits[i - 1].longitude,
      visits[i].latitude,
      visits[i].longitude
    );
  }
  return Number(totalKm.toFixed(1));
}

export const DEFAULT_FIELD_PHOTO = 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22513?w=600&auto=format&fit=crop&q=80';

/**
 * Convert Google Drive and external media URLs into high-speed direct CDN links
 */
export function formatPhotoUrl(url?: string): string {
  if (!url) return DEFAULT_FIELD_PHOTO;
  const cleanUrl = url.trim().replace(/^=/, '');

  // Convert Google Drive view/uc links to Google's direct public CDN
  if (cleanUrl.includes('drive.google.com')) {
    const match = cleanUrl.match(/id=([a-zA-Z0-9_-]+)/) || cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }

  return cleanUrl || DEFAULT_FIELD_PHOTO;
}
