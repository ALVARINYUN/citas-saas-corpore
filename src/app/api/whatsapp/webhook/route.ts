import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleIncomingMessage } from "@/lib/whatsappBot";
import { sendWhatsAppText } from "@/lib/whatsapp";

/**
 * Meta llama a este mismo endpoint (GET) una sola vez para verificar que el
 * webhook es tuyo, cuando lo configuras en developers.facebook.com. Debes
 * poner WHATSAPP_VERIFY_TOKEN en tu .env con cualquier valor secreto que
 * elijas, y usar ese mismo valor en el panel de Meta al conectar el webhook.
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Token de verificación inválido" }, { status: 403 });
}

/**
 * Meta manda aquí cada mensaje entrante de WhatsApp. El "phone_number_id"
 * que viene en el payload identifica cuál número de WhatsApp Business lo
 * recibió, y con eso encontramos a qué negocio (tenant) pertenece.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const phoneNumberId = value?.metadata?.phone_number_id;
    const message = value?.messages?.[0];

    // Puede llegar sin mensaje (ej: notificación de "leído"), se ignora.
    if (!phoneNumberId || !message || message.type !== "text") {
      return NextResponse.json({ received: true });
    }

    const fromPhone: string = message.from; // ya viene en formato internacional
    const text: string = message.text?.body ?? "";

    const socialAccount = await prisma.socialAccount.findFirst({
      where: { platform: "WHATSAPP", accountId: phoneNumberId },
    });

    if (!socialAccount) {
      console.warn(`No hay negocio conectado para el número de WhatsApp ${phoneNumberId}`);
      return NextResponse.json({ received: true });
    }

    const reply = await handleIncomingMessage(socialAccount.businessId, fromPhone, text);
    await sendWhatsAppText(fromPhone, reply);

    return NextResponse.json({ received: true });
  } catch (err) {
    // Siempre respondemos 200 a Meta aunque algo falle internamente, para que
    // no reintente indefinidamente el mismo mensaje.
    console.error("Error procesando webhook de WhatsApp:", err);
    return NextResponse.json({ received: true });
  }
}
