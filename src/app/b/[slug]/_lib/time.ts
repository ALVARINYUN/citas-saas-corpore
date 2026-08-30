/**
 * Formatea/lee fechas SIEMPRE en la zona horaria del negocio (business.timezone),
 * nunca en la del navegador del visitante. Sin esto, un cliente agendando
 * desde otro huso horario vería horas distintas a las reales del negocio --
 * el mismo tipo de bug que ya arreglamos en el backend (availability.ts),
 * pero del lado del cliente.
 */

export function formatDateLabel(dateKey: string, short = false): string {
  // dateKey ("YYYY-MM-DD") no es un instante, es un día calendario -- lo
  // anclamos al mediodía UTC para formatearlo sin riesgo de que un
  // navegador en otro huso lo corra un día para atrás o adelante.
  const [y, m, d] = dateKey.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return noon.toLocaleDateString("es-CO", {
    timeZone: "UTC",
    weekday: short ? undefined : "long",
    day: "numeric",
    month: short ? "short" : "long",
  });
}

export function formatTimeLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hora del día (0-23) de un instante ISO, en la zona del negocio. */
export function getHourInTimeZone(iso: string, timeZone: string): number {
  const hourStr = new Date(iso).toLocaleString("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  });
  return parseInt(hourStr, 10);
}

/** "YYYY-MM-DD" de hoy, en la zona del negocio. */
export function todayKeyInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MONTH_LABELS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
