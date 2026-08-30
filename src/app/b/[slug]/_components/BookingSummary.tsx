"use client";

import { CalendarDays, Clock3, UsersRound, Pencil, ArrowRight, Loader2 } from "lucide-react";

interface BookingSummaryProps {
  variant: "sidebar" | "bar";
  serviceName: string | null;
  durationMin: number | null;
  dateLabel: string | null;
  timeLabel: string | null;
  staffName: string | null;
  primaryLabel: string;
  primaryDisabled: boolean;
  submitting: boolean;
  onPrimary: () => void;
  onChangeSelection: () => void;
}

export default function BookingSummary({
  variant,
  serviceName,
  durationMin,
  dateLabel,
  timeLabel,
  staffName,
  primaryLabel,
  primaryDisabled,
  submitting,
  onPrimary,
  onChangeSelection,
}: BookingSummaryProps) {
  // La barra móvil no tiene sentido mostrarla hasta que haya al menos un
  // servicio elegido -- en desktop el sidebar sí se muestra desde el inicio
  // porque hay espacio de sobra para guiar al usuario.
  if (variant === "bar" && !serviceName) return null;

  const rootClass = variant === "sidebar" ? "cw-pb-summary" : "cw-pb-summary-bar";

  return (
    <aside className={rootClass} aria-label="Resumen de tu cita">
      {variant === "sidebar" && <h2 className="cw-pb-summary-title">Resumen de tu cita</h2>}

      {!serviceName ? (
        <p className="cw-pb-summary-empty">Elige un servicio para comenzar.</p>
      ) : (
        <div className={variant === "sidebar" ? "cw-pb-summary-body" : "cw-pb-summary-bar-body"}>
          <div className="cw-pb-summary-service">{serviceName}</div>

          <div className="cw-pb-summary-meta">
            {durationMin != null && (
              <span>
                <Clock3 size={14} aria-hidden="true" /> {durationMin} min
              </span>
            )}
            {dateLabel && (
              <span>
                <CalendarDays size={14} aria-hidden="true" />
                {dateLabel}
                {timeLabel ? ` · ${timeLabel}` : ""}
              </span>
            )}
            {staffName && (
              <span>
                <UsersRound size={14} aria-hidden="true" /> {staffName}
              </span>
            )}
          </div>

          {variant === "sidebar" && (
            <button type="button" className="cw-pb-summary-change" onClick={onChangeSelection}>
              <Pencil size={13} aria-hidden="true" /> Cambiar selección
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className="cw-pb-summary-cta"
        disabled={primaryDisabled || submitting}
        onClick={onPrimary}
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="cw-pb-spin" aria-hidden="true" />
            Agendando…
          </>
        ) : (
          <>
            {primaryLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </>
        )}
      </button>
    </aside>
  );
}
