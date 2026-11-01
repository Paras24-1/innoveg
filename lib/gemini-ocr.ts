/**
 * AI Odometer Meter Reading Extraction via Google Gemini Vision API
 * Extracts the numeric kilometer reading from a vehicle speedometer/meter photo.
 */
export async function extractOdometerKm(
  photoUrl: string,
  fallbackText?: string
): Promise<{
  km: number | null;
  confidence: number;
  rawText?: string;
}> {
  // If user provided a numeric KM in their caption or message, check that first
  if (fallbackText) {
    const match = fallbackText.replace(/,/g, '').match(/(\d{3,7}(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (num > 0) return { km: num, confidence: 90, rawText: fallbackText };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !photoUrl || !photoUrl.startsWith('http')) {
    return { km: null, confidence: 0 };
  }

  try {
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) return { km: null, confidence: 0 };
    const buffer = await imgRes.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

    const prompt =
      'Look at this vehicle dashboard / odometer / speedometer photo. Read the total kilometer reading (odometer mileage numbers). Reply with ONLY the numeric value (digits only, e.g. 25085). If not visible or unreadable, return null.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.warn('Gemini OCR API error:', response.status);
      return { km: null, confidence: 0 };
    }

    const json = await response.json();
    const resultText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const match = resultText.replace(/,/g, '').match(/(\d{3,7}(?:\.\d+)?)/);
    if (match) {
      return {
        km: parseFloat(match[1]),
        confidence: 95,
        rawText: resultText,
      };
    }
  } catch (e) {
    console.warn('extractOdometerKm failed:', e);
  }

  return { km: null, confidence: 0 };
}
