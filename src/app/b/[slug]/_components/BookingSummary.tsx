"use client";

import { CalendarDays, Clock3, Pencil, ArrowRight, Loader2 } from "lucide-react";

interface BookingSummaryProps {
  variant: "sidebar" | "bar";
  /** Solo aplica a variant="sidebar": en vez de ocultarse en móvil, se
   * muestra en flujo normal (no fija) debajo del contenido. Se usa en el
   * paso 1, donde todavía no hay barra fija de horario/fecha que mostrar. */
  mobileInline?: boolean;
  serviceName: string | null;
  serviceIconSrc?: string | null;
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
  mobileInline = false,
  serviceName,
  serviceIconSrc,
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
    <aside className={`${rootClass} ${mobileInline ? "mobile-inline" : ""}`} aria-label="Resumen de tu cita">
      {variant === "sidebar" && <h2 className="cw-pb-summary-title">Resumen de tu cita</h2>}

      {variant === "sidebar" && !serviceName && (
        <>
          <p className="cw-pb-summary-empty">Aún no has seleccionado un servicio</p>
          <p className="cw-pb-summary-empty-sub">
            El resumen aparecerá aquí a medida que completes la reserva.
          </p>
        </>
      )}

      {variant === "sidebar" && serviceName && (
        <div className="cw-pb-summary-body">
          <div className="cw-pb-summary-service-row">
            <span className="cw-pb-summary-service-icon" aria-hidden="true">
              {serviceIconSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={serviceIconSrc} alt="" />
              ) : (
                <CalendarDays size={20} />
              )}
            </span>
            <div>
              <div className="cw-pb-summary-service">{serviceName}</div>
              {durationMin != null && (
                <div className="cw-pb-summary-duration">
                  <Clock3 size={12} aria-hidden="true" /> {durationMin} min
                </div>
              )}
            </div>
          </div>

          <button type="button" className="cw-pb-summary-change" onClick={onChangeSelection}>
            <Pencil size={13} aria-hidden="true" /> Cambiar selección
          </button>
        </div>
      )}

      {variant === "sidebar" && (
        <dl className="cw-pb-summary-rows" aria-live="polite">
          <div className="cw-pb-summary-row">
            <dt>Servicio</dt>
            <dd key={serviceName ?? "empty"} className="cw-pb-fade-in">
              {serviceName ?? "—"}
            </dd>
          </div>
          <div className="cw-pb-summary-row">
            <dt>Fecha</dt>
            <dd key={dateLabel ?? "empty"} className="cw-pb-fade-in">
              {dateLabel ?? "—"}
            </dd>
          </div>
          <div className="cw-pb-summary-row">
            <dt>Hora</dt>
            <dd key={timeLabel ?? "empty"} className="cw-pb-fade-in">
              {timeLabel ?? "—"}
            </dd>
          </div>
        </dl>
      )}

      {variant === "bar" && (
        <div className="cw-pb-summary-bar-body">
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
            {staffName && <span>{staffName}</span>}
          </div>
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

      {variant === "sidebar" && <p className="cw-pb-summary-footer-note">Reserva segura y confidencial</p>}
    </aside>
  );
}
