/**
 * Odometer Reading Extraction (Zero AI Tokens)
 * Extracts numeric kilometer reading directly from caption or user message.
 * No external AI tokens or computer vision APIs are consumed.
 */
export async function extractOdometerKm(
  photoUrl: string,
  fallbackText?: string
): Promise<{
  km: number | null;
  confidence: number;
  rawText?: string;
}> {
  // If user provided a numeric KM in their caption or message, extract that
  if (fallbackText) {
    const match = fallbackText.replace(/,/g, '').match(/(\d{3,7}(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (num > 0) return { km: num, confidence: 100, rawText: fallbackText };
    }
  }

  return { km: null, confidence: 0 };
}
