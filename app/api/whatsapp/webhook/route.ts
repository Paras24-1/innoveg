import { NextResponse } from 'next/server';
import { processIncomingWhatsAppMessage } from '@/lib/bot-engine';
import { sendWhatsAppMessage } from '@/lib/whatsapp-api';

export const dynamic = 'force-dynamic';

// Verification challenge for Meta WhatsApp Cloud API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'innoveg_secret_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Meta challenge verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  // Also support health check
  if (!mode && !token) {
    return NextResponse.json({
      status: 'active',
      message: 'InnoVeg WhatsApp Cloud API Webhook is live and ready',
      verifyTokenConfigured: Boolean(VERIFY_TOKEN),
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// Inbound webhook handler (Meta WhatsApp Cloud API & n8n / Direct JSON)
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. Simplified / Direct / n8n format: { from: "...", body: "...", location?: {...}, photoUrl?: "..." }
    if (payload.from && (payload.body || payload.message || payload.location || payload.photoUrl)) {
      const fromMobile = String(payload.from);
      const body = payload.body || payload.message;
      const location = payload.location;
      const photoUrl = payload.photoUrl;

      const botResponse = await processIncomingWhatsAppMessage({
        fromMobile,
        body,
        location,
        photoUrl,
      });

      if (botResponse.replyText) {
        await sendWhatsAppMessage(fromMobile, botResponse.replyText);
      }

      return NextResponse.json({ success: true, ...botResponse });
    }

    // 2. Official Meta WhatsApp Cloud API Webhook format
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Meta status updates (sent, delivered, read) - acknowledge with 200
    if (!message) {
      return NextResponse.json({ status: 'ignored_status_or_empty' });
    }

    const fromMobile = message.from;
    let body: string | undefined;
    let location: { latitude: number; longitude: number; name?: string } | undefined;
    let photoUrl: string | undefined;

    if (message.type === 'text') {
      body = message.text?.body;
    } else if (message.type === 'location') {
      location = {
        latitude: Number(message.location.latitude),
        longitude: Number(message.location.longitude),
        name: message.location.name || message.location.address,
      };
    } else if (message.type === 'image') {
      body = message.image?.caption || 'Photo submitted';
      photoUrl = message.image?.url || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22513?w=600&auto=format&fit=crop&q=80';
    } else if (message.type === 'interactive') {
      body = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title;
    }

    const botResponse = await processIncomingWhatsAppMessage({
      fromMobile,
      body,
      location,
      photoUrl,
    });

    // Send reply message back to officer on WhatsApp via Meta API
    if (botResponse.replyText) {
      await sendWhatsAppMessage(fromMobile, botResponse.replyText);
    }

    return NextResponse.json({
      success: true,
      botResponse,
    });
  } catch (error: any) {
    console.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
