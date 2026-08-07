/**
 * Envío de mensajes de WhatsApp usando la WhatsApp Cloud API de Meta.
 *
 * Requiere en .env:
 *   WHATSAPP_TOKEN            -> access token de tu app de Meta Business
 *   WHATSAPP_PHONE_NUMBER_ID  -> ID del número de WhatsApp Business que envía los mensajes
 *
 * IMPORTANTE — cómo funciona WhatsApp Business realmente:
 * Meta solo permite dos tipos de mensaje saliente:
 *  1) Mensaje de "sesión" (texto libre): solo se puede enviar si el cliente te
 *     escribió en las últimas 24 horas. Es lo que usa el chatbot para responder.
 *  2) Mensaje de "plantilla" (template): mensaje pre-aprobado por Meta, se puede
 *     enviar en cualquier momento aunque el cliente nunca te haya escrito. Es lo
 *     que se necesita para confirmaciones que el negocio inicia por su cuenta
 *     (por ejemplo, cuando alguien agenda desde la página web, no desde el chat).
 *
 * Antes de usar sendAppointmentConfirmation, debes crear y que te aprueben una
 * plantilla en Meta Business Manager (Account Tools > Message Templates), por
 * ejemplo una llamada "confirmacion_cita" con variables para nombre, servicio y
 * fecha/hora. La aprobación de Meta suele tardar minutos a horas.
 */

const WHATSAPP_API_VERSION = "v21.0";

/**
 * Responde con texto libre. Solo es válido si el cliente te escribió a ti en
 * las últimas 24 horas (siempre es cierto cuando esto se llama desde el
 * webhook, en respuesta directa a un mensaje que él mandó).
 */
export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("WhatsApp no configurado: faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID");
    return { success: false, error: "WhatsApp no configurado" };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("Error enviando WhatsApp (texto):", errBody);
    return { success: false, error: JSON.stringify(errBody) };
  }

  return { success: true };
}

interface SendTemplateParams {
  to: string; // número en formato internacional sin '+', ej: "573001234567"
  templateName: string;
  languageCode?: string; // ej: "es" o "es_CO"
  bodyParams: string[]; // valores que llenan las {{1}}, {{2}}... de la plantilla
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = "es",
  bodyParams,
}: SendTemplateParams): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("WhatsApp no configurado: faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID");
    return { success: false, error: "WhatsApp no configurado" };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("Error enviando WhatsApp:", errBody);
    return { success: false, error: JSON.stringify(errBody) };
  }

  return { success: true };
}

/**
 * Envía la confirmación de una cita recién agendada desde la página web.
 * Asume que existe una plantilla aprobada llamada "confirmacion_cita" con
 * el cuerpo: "Hola {{1}}, tu cita para {{2}} quedó confirmada el {{3}}."
 */
export async function sendAppointmentConfirmation(params: {
  phone: string;
  customerName: string;
  serviceName: string;
  dateTimeLabel: string;
}) {
  const normalizedPhone = normalizePhone(params.phone);
  if (!normalizedPhone) return { success: false, error: "Teléfono inválido" };

  return sendWhatsAppTemplate({
    to: normalizedPhone,
    templateName: "confirmacion_cita",
    bodyParams: [params.customerName, params.serviceName, params.dateTimeLabel],
  });
}

/**
 * Normaliza números colombianos comunes a formato internacional sin '+'.
 * Ajusta el código de país por defecto si tu negocio opera en otro país.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("57") && digits.length >= 12) return digits; // ya tiene código de país
  if (digits.length === 10) return `57${digits}`; // número local colombiano
  return digits;
}
