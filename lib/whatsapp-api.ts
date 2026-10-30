/**
 * Meta WhatsApp Cloud API Client
 * Sends messages directly to WhatsApp users
 */

export async function sendWhatsAppMessage(to: string, text: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn('[WhatsApp API] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured. Skipping outgoing message to:', to);
    return { success: false, error: 'WhatsApp credentials not configured in environment variables' };
  }

  // Format phone number (ensure country code, default to India +91 if 10 digits)
  let cleanPhone = to.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp API] Error sending message:', data);
      return { success: false, error: data.error?.message || 'Meta API error' };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[WhatsApp API] Network error sending message:', error);
    return { success: false, error: error.message };
  }
}
