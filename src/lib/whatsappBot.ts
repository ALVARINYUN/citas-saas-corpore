import { prisma } from "./prisma";
import { getAvailableSlots } from "./availability";
import { createAppointment, getUpcomingAppointmentsByPhone, cancelAppointment, SlotTakenError } from "./appointments";

interface ConversationContext {
  serviceId?: string;
  serviceName?: string;
  date?: string; // YYYY-MM-DD
  slotStart?: string; // ISO
  staffId?: string;
  serviceOptions?: { id: string; name: string }[];
  slotOptions?: { start: string; staffId: string; label: string }[];
  cancelOptions?: { id: string; label: string }[];
}

/**
 * Punto de entrada: recibe un mensaje entrante de WhatsApp y devuelve el
 * texto de respuesta. Mantiene el estado en WhatsAppConversation para que
 * el cliente pueda escribir en varios mensajes separados sin perder el hilo.
 */
export async function handleIncomingMessage(
  businessId: string,
  fromPhone: string,
  rawText: string
): Promise<string> {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  const conversation = await prisma.whatsAppConversation.upsert({
    where: { businessId_customerPhone: { businessId, customerPhone: fromPhone } },
    create: { businessId, customerPhone: fromPhone },
    update: {},
  });

  const context = (conversation.context as ConversationContext) ?? {};

  // Permite cancelar el flujo actual en cualquier momento
  if (["cancelar flujo", "salir", "menu", "menú"].includes(lower)) {
    await resetConversation(businessId, fromPhone);
    return await getMainMenuReply(businessId);
  }

  switch (conversation.state) {
    case "IDLE":
      return await handleIdleState(businessId, fromPhone, lower);

    case "AWAITING_SERVICE":
      return await handleServiceSelection(businessId, fromPhone, text, context);

    case "AWAITING_DATE":
      return await handleDateSelection(businessId, fromPhone, text, context);

    case "AWAITING_TIME":
      return await handleTimeSelection(businessId, fromPhone, text, context);

    case "AWAITING_NAME":
      return await handleNameInput(businessId, fromPhone, text, context);

    case "AWAITING_CANCEL_CHOICE":
      return await handleCancelChoice(businessId, fromPhone, text, context);

    default:
      await resetConversation(businessId, fromPhone);
      return await getMainMenuReply(businessId);
  }
}

// ============================================
// Estado: IDLE — el bot interpreta la intención inicial
// ============================================

async function handleIdleState(businessId: string, phone: string, lower: string): Promise<string> {
  if (matchesAny(lower, ["agendar", "cita", "reservar", "quiero una cita", "turno"])) {
    return startBookingFlow(businessId, phone);
  }

  if (matchesAny(lower, ["cancelar", "anular"])) {
    return startCancelFlow(businessId, phone);
  }

  if (matchesAny(lower, ["horario", "hora abren", "a que hora"])) {
    return "Nuestros horarios varían según el profesional y el servicio. Escribe *agendar* y te muestro la disponibilidad real para el día que quieras.";
  }

  if (matchesAny(lower, ["direccion", "dirección", "donde quedan", "ubicacion", "ubicación"])) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    return business?.address
      ? `Estamos ubicados en: ${business.address}`
      : "Por ahora no tengo la dirección registrada, te recomiendo confirmar directamente con el negocio.";
  }

  if (matchesAny(lower, ["precio", "cuanto cuesta", "cuánto cuesta", "costo"])) {
    const services = await prisma.service.findMany({
      where: { businessId, active: true },
      take: 8,
    });
    if (services.length === 0) return "Aún no tenemos servicios cargados.";
    const list = services
      .map((s) => `• ${s.name}${s.price ? ` – $${s.price}` : ""}`)
      .join("\n");
    return `Estos son nuestros servicios:\n${list}\n\nEscribe *agendar* si quieres reservar alguno.`;
  }

  return await getMainMenuReply(businessId);
}

async function getMainMenuReply(businessId: string): Promise<string> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const name = business?.name ?? "nuestro negocio";
  return `¡Hola! Soy el asistente de ${name} 👋\n\nPuedo ayudarte a:\n• *Agendar* una cita\n• *Cancelar* una cita existente\n• Responder sobre *precios*, *horario* o *dirección*\n\n¿Qué necesitas?`;
}

// ============================================
// Flujo de agendamiento
// ============================================

async function startBookingFlow(businessId: string, phone: string): Promise<string> {
  const services = await prisma.service.findMany({
    where: { businessId, active: true },
    take: 8,
  });

  if (services.length === 0) {
    return "Por ahora no tenemos servicios disponibles para agendar.";
  }

  await setState(businessId, phone, "AWAITING_SERVICE", {});

  const list = services
    .map((s, i) => `${i + 1}. ${s.name} (${s.durationMin} min${s.price ? ` – $${s.price}` : ""})`)
    .join("\n");

  // Guardamos el listado en la conversación para poder mapear el número que responda
  await setContext(businessId, phone, {
    serviceOptions: services.map((s) => ({ id: s.id, name: s.name })),
  });

  return `Perfecto, ¿cuál servicio quieres agendar? Responde con el número:\n${list}`;
}

async function handleServiceSelection(
  businessId: string,
  phone: string,
  text: string,
  context: ConversationContext
): Promise<string> {
  const options = context.serviceOptions;
  const index = parseInt(text, 10) - 1;
  const chosen = options?.[index];

  if (!chosen) {
    return "No entendí cuál elegiste. Responde solo con el número del servicio de la lista.";
  }

  await setState(businessId, phone, "AWAITING_DATE", {
    ...context,
    serviceId: chosen.id,
    serviceName: chosen.name,
  });

  return `Elegiste *${chosen.name}*. ¿Para qué día? (ejemplo: "mañana", "2026-08-15", o "15/08")`;
}

async function handleDateSelection(
  businessId: string,
  phone: string,
  text: string,
  context: ConversationContext
): Promise<string> {
  const date = parseSpanishDate(text);
  if (!date) {
    return 'No entendí la fecha. Escríbela como "mañana" o en formato AAAA-MM-DD, por ejemplo 2026-08-15.';
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    return "No encontré este negocio. Intenta de nuevo más tarde.";
  }

  // Usamos los getters locales (no toISOString, que es UTC) porque `date`
  // se construyó con las mismas componentes año/mes/día que el cliente
  // escribió, sin importar la zona del servidor.
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const slots = await getAvailableSlots(businessId, context.serviceId!, dateStr, business.timezone);
  // Por WhatsApp solo tiene sentido ofrecer como opción numerada los
  // horarios que todavía tienen cupo -- uno lleno no se puede "elegir".
  const available = slots.filter((s) => !s.isFull);

  if (available.length === 0) {
    return "No hay horarios disponibles ese día. ¿Quieres intentar con otra fecha?";
  }
  const options = available.slice(0, 8);

  await setState(businessId, phone, "AWAITING_TIME", {
    ...context,
    date: dateStr,
    slotOptions: options.map((s) => ({
      start: s.start.toISOString(),
      staffId: s.staffId,
      label: s.start.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    })),
  });

  const list = options
    .map(
      (s, i) =>
        `${i + 1}. ${s.start.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} con ${s.staffName}`
    )
    .join("\n");

  return `Estos horarios están libres:\n${list}\n\nResponde con el número que prefieras.`;
}

async function handleTimeSelection(
  businessId: string,
  phone: string,
  text: string,
  context: ConversationContext
): Promise<string> {
  const options = context.slotOptions;
  const index = parseInt(text, 10) - 1;
  const chosen = options?.[index];

  if (!chosen) {
    return "No entendí cuál horario elegiste. Responde solo con el número de la lista.";
  }

  await setState(businessId, phone, "AWAITING_NAME", {
    ...context,
    slotStart: chosen.start,
    staffId: chosen.staffId,
  });

  return "¿A nombre de quién queda la cita? Escribe tu nombre completo.";
}

async function handleNameInput(
  businessId: string,
  phone: string,
  text: string,
  context: ConversationContext
): Promise<string> {
  if (text.length < 2) {
    return "Ese nombre no parece válido, escríbelo de nuevo por favor.";
  }

  try {
    const appointment = await createAppointment({
      businessId,
      serviceId: context.serviceId!,
      staffId: context.staffId!,
      startTime: new Date(context.slotStart!),
      customer: { name: text, phone },
    });

    await resetConversation(businessId, phone);

    return `¡Listo, ${text}! Tu cita para *${appointment.service.name}* quedó confirmada el ${appointment.startTime.toLocaleString(
      "es-CO",
      { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }
    )}. Nos vemos 🙌`;
  } catch (err) {
    await resetConversation(businessId, phone);
    if (err instanceof SlotTakenError) {
      return "Justo alguien más tomó ese horario. Escribe *agendar* para intentar con otro.";
    }
    return "Hubo un problema agendando tu cita. Escribe *agendar* para intentarlo de nuevo.";
  }
}

// ============================================
// Flujo de cancelación
// ============================================

async function startCancelFlow(businessId: string, phone: string): Promise<string> {
  const upcoming = await getUpcomingAppointmentsByPhone(businessId, phone);

  if (upcoming.length === 0) {
    return "No encontré citas próximas a tu nombre con este número.";
  }

  const options = upcoming.map((a) => ({
    id: a.id,
    label: `${a.service.name} – ${a.startTime.toLocaleString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  }));

  await setState(businessId, phone, "AWAITING_CANCEL_CHOICE", { cancelOptions: options });

  const list = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
  return `¿Cuál cita quieres cancelar?\n${list}`;
}

async function handleCancelChoice(
  businessId: string,
  phone: string,
  text: string,
  context: ConversationContext
): Promise<string> {
  const index = parseInt(text, 10) - 1;
  const chosen = context.cancelOptions?.[index];

  if (!chosen) {
    return "No entendí cuál cita quieres cancelar. Responde con el número de la lista.";
  }

  await cancelAppointment(chosen.id);
  await resetConversation(businessId, phone);

  return `Listo, cancelé tu cita: ${chosen.label}.`;
}

// ============================================
// Utilidades
// ============================================

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

async function setState(
  businessId: string,
  phone: string,
  state:
    | "IDLE"
    | "AWAITING_SERVICE"
    | "AWAITING_DATE"
    | "AWAITING_TIME"
    | "AWAITING_NAME"
    | "AWAITING_CANCEL_CHOICE",
  context: object
) {
  await prisma.whatsAppConversation.update({
    where: { businessId_customerPhone: { businessId, customerPhone: phone } },
    data: { state, context },
  });
}

async function setContext(businessId: string, phone: string, context: object) {
  await prisma.whatsAppConversation.update({
    where: { businessId_customerPhone: { businessId, customerPhone: phone } },
    data: { context },
  });
}

async function resetConversation(businessId: string, phone: string) {
  await prisma.whatsAppConversation.update({
    where: { businessId_customerPhone: { businessId, customerPhone: phone } },
    data: { state: "IDLE", context: {} },
  });
}

/** Interpreta fechas simples en español: "hoy", "mañana", "2026-08-15", "15/08". */
function parseSpanishDate(text: string): Date | null {
  const lower = text.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lower === "hoy") return today;
  if (lower === "mañana" || lower === "manana") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  const isoMatch = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  const shortMatch = lower.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const [, d, m] = shortMatch;
    const year = today.getFullYear();
    return new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00`);
  }

  return null;
}
