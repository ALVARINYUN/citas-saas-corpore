"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  UsersRound,
  CircleCheck,
  CalendarCheck,
  Globe2,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import BookingCalendar, { ViewedMonth } from "./_components/BookingCalendar";
import BookingSummary from "./_components/BookingSummary";
import {
  formatDateLabel,
  formatTimeLabel,
  formatDateTimeLabel,
  getHourInTimeZone,
  todayKeyInTimeZone,
} from "./_lib/time";

interface Business {
  id: string;
  name: string;
  timezone: string;
  logoUrl: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: string | null;
  capacity: number;
}

interface Slot {
  start: string;
  end: string;
  staffId: string;
  staffName: string;
  isFull: boolean;
  spotsLeft: number;
}

type LoadState = "idle" | "loading" | "loaded" | "error";

/**
 * Íconos ilustrados reales para los dos servicios con imagen propia
 * (public/icons/*.png). Los demás servicios (ej. clases grupales que se
 * vayan agregando después) siguen usando el ícono lineal genérico de
 * lucide-react -- no inventamos una imagen para un servicio que no la tiene.
 */
function getServiceIconSrc(serviceName: string): string | null {
  const name = serviceName.toLowerCase();
  if (name.includes("pilates")) return "/icons/pilates.png";
  if (name.includes("fisioterapia")) return "/icons/fisioterapia.png";
  return null;
}

/**
 * Descripción breve por servicio. Se usa SOLO si el servicio no trae ya su
 * propia `description` desde la API (dato real) -- para los tres servicios
 * reales de Corpore que todavía no tienen descripción cargada en el panel
 * de administración, se ofrece un texto de respaldo con la copy que pidió
 * el negocio, sin inventar nada para servicios que no sean estos tres.
 */
function getServiceFallbackDescription(serviceName: string): string | null {
  const name = serviceName.toLowerCase();
  if (name.includes("pilates")) return "Sesión guiada de movimiento y control corporal.";
  if (name.includes("fisioterapia")) return "Valoración y atención fisioterapéutica personalizada.";
  if (name.includes("grupal")) return "Sesión de práctica en grupo reducido.";
  return null;
}

/** Fondo suave distinto por servicio, para que los tres círculos no se vean idénticos. */
function getServiceIconBgClass(service: { name: string; capacity: number }): string {
  const name = service.name.toLowerCase();
  if (name.includes("pilates")) return "cw-pb-icon-bg-pilates";
  if (name.includes("fisioterapia")) return "cw-pb-icon-bg-fisio";
  if (service.capacity > 1) return "cw-pb-icon-bg-grupal";
  return "";
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesState, setServicesState] = useState<LoadState>("loading");

  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [viewedMonth, setViewedMonth] = useState<ViewedMonth>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [daysLoading, setDaysLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsState, setSlotsState] = useState<LoadState>("idle");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [amPmTab, setAmPmTab] = useState<"morning" | "afternoon">("morning");
  const [clearedNotice, setClearedNotice] = useState<string | null>(null);

  // Paso REAL del flujo (no derivado): solo avanza cuando el usuario pulsa
  // "Continuar" -- seleccionar un servicio o un horario no revela el paso
  // siguiente por sí solo.
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const step2HeadingRef = useRef<HTMLHeadingElement | null>(null);
  const step3HeadingRef = useRef<HTMLHeadingElement | null>(null);
  const morningTabRef = useRef<HTMLButtonElement | null>(null);
  const afternoonTabRef = useRef<HTMLButtonElement | null>(null);
  const serviceCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ---- Carga inicial: negocio + servicios ----
  useEffect(() => {
    let cancelled = false;
    setServicesState("loading");
    fetch(`/api/business/${slug}/services`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok || data.error) {
          setServicesState("error");
          return;
        }
        setBusiness(data.business);
        setServices(data.services ?? []);
        setServicesState("loaded");
      })
      .catch(() => {
        if (!cancelled) setServicesState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const todayKey = business ? todayKeyInTimeZone(business.timezone) : "";

  // ---- Días con disponibilidad real para el calendario ----
  useEffect(() => {
    if (!business || !selectedService) return;
    let cancelled = false;
    setDaysLoading(true);
    const monthParam = `${viewedMonth.year}-${String(viewedMonth.month).padStart(2, "0")}`;
    fetch(`/api/business/${slug}/availability-days?serviceId=${selectedService.id}&month=${monthParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAvailableDates(new Set<string>(data.availableDates ?? []));
      })
      .finally(() => {
        if (!cancelled) setDaysLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [business, selectedService, viewedMonth, slug]);

  // ---- Horarios reales del día elegido ----
  useEffect(() => {
    if (!business || !selectedService || !selectedDate) {
      setSlots([]);
      setSlotsState("idle");
      return;
    }
    let cancelled = false;
    setSlotsState("loading");
    fetch(`/api/business/${slug}/availability?serviceId=${selectedService.id}&date=${selectedDate}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok || data.error) {
          setSlotsState("error");
          setSlots([]);
          return;
        }
        const list: Slot[] = data.slots ?? [];
        setSlots(list);
        setSlotsState("loaded");
        const hasMorning = list.some((s) => getHourInTimeZone(s.start, business.timezone) < 12);
        const hasAfternoon = list.some((s) => getHourInTimeZone(s.start, business.timezone) >= 12);
        if (!hasMorning && hasAfternoon) setAmPmTab("afternoon");
        else if (hasMorning && !hasAfternoon) setAmPmTab("morning");
      })
      .catch(() => {
        if (!cancelled) {
          setSlotsState("error");
          setSlots([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [business, selectedService, selectedDate, slug]);

  // Scroll suave hacia una sección ya presente en el DOM, respetando
  // prefers-reduced-motion (scroll instantáneo en vez de animado). El
  // setTimeout (no requestAnimationFrame) es deliberado: mover el foco no
  // depende de sincronizarse con un frame de pintado, y rAF puede no
  // dispararse si la pestaña no está realmente compuesta en pantalla.
  function scrollToHeading(ref: React.RefObject<HTMLHeadingElement | null>) {
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior, block: "start" });
      // preventScroll: enfocar un elemento dispara el scroll-into-view
      // propio del navegador (instantáneo), que si no se evita interrumpe
      // a mitad de camino la animación "smooth" recién iniciada arriba.
      ref.current?.focus({ preventScroll: true });
    }, 0);
  }

  function handleSelectService(s: Service) {
    if (selectedSlot) setClearedNotice("Cambiaste de servicio, elige un horario de nuevo.");
    setSelectedService(s);
    setSelectedSlot(null);
    // Si la sección "2. Fecha y hora" ya está en el DOM (el usuario vuelve a
    // elegir servicio estando en el paso 2 o 3), guiarlo de nuevo hacia
    // ella -- si todavía está en el paso 1, el propio botón "Continuar" ya
    // se encarga del scroll al avanzar.
    if (currentStep >= 2) scrollToHeading(step2HeadingRef);
  }

  function handleSelectDate(dateKey: string) {
    if (selectedSlot) setClearedNotice("Elegiste otra fecha, vuelve a elegir un horario.");
    setSelectedDate(dateKey);
    setSelectedSlot(null);
  }

  function handleSelectSlot(slot: Slot) {
    setClearedNotice(null);
    setSelectedSlot(slot);
    // Mismo criterio que handleSelectService: si "3. Confirmación" ya está
    // visible (el usuario cambia de horario estando en el paso 3), llevarlo
    // de nuevo hacia el formulario.
    if (currentStep >= 3) scrollToHeading(step3HeadingRef);
  }

  function handleChangeSelection() {
    setCurrentStep(currentStep === 3 ? 2 : 1);
  }

  // Reinicia todo el flujo desde la pantalla de éxito -- vuelve exactamente
  // a los valores iniciales de cada estado (los mismos que al cargar la
  // página por primera vez), sin recargar business/services.
  function handleStartOver() {
    setSelectedService(null);
    const now = new Date();
    setViewedMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
    setAvailableDates(new Set());
    setDaysLoading(false);
    setSelectedDate(null);
    setSlots([]);
    setSlotsState("idle");
    setSelectedSlot(null);
    setAmPmTab("morning");
    setClearedNotice(null);
    setCurrentStep(1);
    setForm({ name: "", email: "", phone: "" });
    setSubmitting(false);
    setSubmitError("");
    setConfirmed(false);
  }

  function goToStep(n: number) {
    if (n < currentStep) setCurrentStep(n as 1 | 2 | 3);
  }

  async function handleConfirm() {
    if (!selectedService || !selectedSlot || !form.name || !business) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: selectedService.id,
          staffId: selectedSlot.staffId,
          startTime: selectedSlot.start,
          customer: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "No se pudo agendar la cita");
        return;
      }
      setConfirmed(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrimary() {
    if (currentStep === 1) {
      if (!selectedService) return;
      setCurrentStep(2);
      scrollToHeading(step2HeadingRef);
      return;
    }
    if (currentStep === 2) {
      if (!selectedSlot) return;
      setCurrentStep(3);
      scrollToHeading(step3HeadingRef);
      return;
    }
    await handleConfirm();
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = amPmTab === "morning" ? "afternoon" : "morning";
    setAmPmTab(next);
    (next === "morning" ? morningTabRef : afternoonTabRef).current?.focus();
  }

  const morningSlots = useMemo(
    () => (business ? slots.filter((s) => getHourInTimeZone(s.start, business.timezone) < 12) : []),
    [slots, business]
  );
  const afternoonSlots = useMemo(
    () => (business ? slots.filter((s) => getHourInTimeZone(s.start, business.timezone) >= 12) : []),
    [slots, business]
  );
  const visibleSlots = amPmTab === "morning" ? morningSlots : afternoonSlots;

  const dateLabelFull = selectedDate ? formatDateLabel(selectedDate) : null;
  const dateLabelShort = selectedDate ? formatDateLabel(selectedDate, true) : null;
  const timeLabel = selectedSlot && business ? formatTimeLabel(selectedSlot.start, business.timezone) : null;

  const primaryLabel = currentStep === 3 ? "Confirmar cita" : "Continuar";
  const primaryDisabled =
    currentStep === 1 ? !selectedService : currentStep === 2 ? !selectedSlot : !form.name;

  if (servicesState === "error") {
    return (
      <main className="cw-pb-page">
        <div className="cw-pb-shell cw-pb-fullstate">
          <p className="cw-pb-error">No pudimos cargar este negocio. Intenta de nuevo en un momento.</p>
        </div>
      </main>
    );
  }

  if (confirmed && selectedService && selectedSlot && business) {
    return (
      <main className="cw-pb-page">
        <div className="cw-pb-shell cw-pb-fullstate">
          <div className="cw-pb-confirm-card">
            <div className="cw-pb-confirm-icon">
              <CalendarCheck size={30} aria-hidden="true" />
            </div>
            <h1 className="cw-pb-confirm-title">Cita confirmada</h1>
            <p className="cw-pb-confirm-when">{formatDateTimeLabel(selectedSlot.start, business.timezone)}</p>
            <p className="cw-pb-confirm-detail">
              {selectedService.name} · con {selectedSlot.staffName}
            </p>
            <p className="cw-pb-confirm-note">
              Te enviamos la confirmación por WhatsApp al {form.phone || "el número que nos diste"}.
            </p>
            <button type="button" onClick={handleStartOver} className="cw-pb-confirm-restart">
              Agendar otra cita
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cw-pb-page">
      <div className={`cw-pb-shell ${currentStep >= 2 ? "has-fixed-bar" : ""}`}>
        <header className="cw-pb-hero">
          <div className="cw-pb-logo-wrapper">
            {business?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="cw-pb-logo-img corpore-logo" />
            ) : (
              <div className="cw-pb-logo-block">
                <svg className="cw-pb-logo-symbol" viewBox="0 0 220 60" fill="none" aria-hidden="true">
                  <path
                    d="M10 40 C48 3, 76 6, 106 31 C138 57, 171 53, 207 22"
                    stroke="#6F866B"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                  <circle cx="166" cy="25" r="7" fill="#6F866B" />
                </svg>
                <div className="cw-pb-logo-name">{business?.name ?? "Corpore"}</div>
                <div className="cw-pb-logo-sub">Pilates</div>
              </div>
            )}
          </div>

          <div className="cw-pb-hero-container">
            <div className="cw-pb-hero-content">
              <div className="cw-pb-hero-copy">
                <p className="cw-pb-eyebrow">Reservas en línea</p>
                <h1 className="cw-pb-title">Reserva tu cita</h1>
                <p className="cw-pb-intro-text">
                  Selecciona el servicio que necesitas. En el siguiente paso podrás elegir la fecha y el horario.
                </p>
              </div>
            </div>
          </div>
        </header>

        <ol className="cw-pb-steps" aria-label="Progreso de la reserva">
          {[
            { n: 1, title: "Servicio", sub: "Elige tu atención" },
            { n: 2, title: "Fecha y hora", sub: "Consulta disponibilidad" },
            { n: 3, title: "Confirmación", sub: "Revisa tu reserva" },
          ].map(({ n, title, sub }) => (
            <li key={n} className={`cw-pb-step ${currentStep === n ? "active" : ""} ${currentStep > n ? "done" : ""}`}>
              <button
                type="button"
                disabled={n >= currentStep}
                onClick={() => goToStep(n)}
                aria-current={currentStep === n ? "step" : undefined}
              >
                <span className="cw-pb-step-dot">
                  {currentStep > n ? <CircleCheck size={14} aria-hidden="true" /> : n}
                </span>
                <span className="cw-pb-step-text">
                  <span className="cw-pb-step-title">{title}</span>
                  <span className="cw-pb-step-sub">{sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {clearedNotice && (
          <p className="cw-pb-notice" role="status">
            {clearedNotice}
          </p>
        )}

        <div className="cw-pb-layout">
          <div className="cw-pb-main">
            {/* PASO 1: SERVICIO */}
            <section className="cw-pb-section" aria-labelledby="step1-heading">
              <h2 id="step1-heading" className="cw-pb-section-title">
                Elige un servicio
              </h2>
              <p className="cw-pb-section-hint">Selecciona una opción para continuar.</p>

              {servicesState === "loading" && (
                <div className="cw-pb-service-grid" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="cw-pb-service-card skeleton" aria-hidden="true" />
                  ))}
                </div>
              )}

              {servicesState === "loaded" && services.length === 0 && (
                <p className="cw-pb-empty">Este negocio todavía no tiene servicios publicados.</p>
              )}

              {servicesState === "loaded" && services.length > 0 && (
                <div
                  className="cw-pb-service-grid"
                  role="radiogroup"
                  aria-labelledby="step1-heading"
                  onKeyDown={(e) => {
                    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
                    e.preventDefault();
                    const dir = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
                    const idx = services.findIndex((s) => s.id === selectedService?.id);
                    const nextIdx = idx === -1 ? 0 : (idx + dir + services.length) % services.length;
                    const next = services[nextIdx];
                    handleSelectService(next);
                    serviceCardRefs.current[next.id]?.focus();
                  }}
                >
                  {services.map((s) => {
                    const selected = selectedService?.id === s.id;
                    const iconSrc = getServiceIconSrc(s.name);
                    const Icon = s.capacity > 1 ? UsersRound : CalendarDays;
                    const description = s.description || getServiceFallbackDescription(s.name);
                    const isRovingTarget = selectedService ? selected : services[0]?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        ref={(el) => {
                          serviceCardRefs.current[s.id] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={isRovingTarget ? 0 : -1}
                        onClick={() => handleSelectService(s)}
                        className={`cw-pb-service-card ${selected ? "selected" : ""}`}
                      >
                        <span className="cw-pb-service-top-row">
                          <span className={`cw-pb-service-icon ${getServiceIconBgClass(s)}`} aria-hidden="true">
                            {iconSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={iconSrc} alt="" />
                            ) : (
                              <Icon size={26} />
                            )}
                          </span>
                          {selected && (
                            <span className="cw-pb-service-status" aria-hidden="true">
                              <CircleCheck size={13} /> Seleccionado
                            </span>
                          )}
                        </span>

                        <span className="cw-pb-service-body">
                          <span className="cw-pb-service-name">{s.name}</span>
                          <span className="cw-pb-service-meta">
                            <Clock3 size={13} aria-hidden="true" /> {s.durationMin} min
                            {s.price ? ` · $${s.price}` : ""}
                          </span>
                          {s.capacity > 1 && (
                            <span className="cw-pb-service-badge">Grupal · cupo {s.capacity}</span>
                          )}
                          {description && <span className="cw-pb-service-desc">{description}</span>}
                        </span>

                        <span className="cw-pb-service-action">
                          <span className="cw-pb-service-button">
                            {selected ? "Seleccionado" : "Seleccionar"}
                            <ChevronRight size={16} className="cw-pb-service-arrow" aria-hidden="true" />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {servicesState === "loaded" && services.length > 0 && (
                <p className="cw-pb-privacy-strip">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Tus datos se utilizarán únicamente para gestionar la reserva.
                </p>
              )}
            </section>

            {/* PASO 2: FECHA Y HORA */}
            {currentStep >= 2 && selectedService && (
              <section className="cw-pb-section booking-datetime-section" aria-labelledby="step2-heading">
                <h2
                  id="step2-heading"
                  className="cw-pb-section-title booking-datetime-title"
                  tabIndex={-1}
                  ref={step2HeadingRef}
                >
                  2. Fecha y hora
                </h2>

                <BookingCalendar
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  availableDates={availableDates}
                  loading={daysLoading}
                  todayKey={todayKey}
                  viewedMonth={viewedMonth}
                  onViewedMonthChange={setViewedMonth}
                />

                {!selectedDate && (
                  <p className="cw-pb-empty">Elige un día en el calendario para ver los horarios.</p>
                )}

                {selectedDate && (
                  <div>
                    <div className="booking-period-wrapper">
                      <div
                        className="booking-period-toggle"
                        role="tablist"
                        aria-label="Franja horaria"
                        onKeyDown={handleTabKeyDown}
                      >
                        <button
                          ref={morningTabRef}
                          role="tab"
                          id="tab-morning"
                          aria-selected={amPmTab === "morning"}
                          aria-controls="slots-panel"
                          tabIndex={amPmTab === "morning" ? 0 : -1}
                          onClick={() => setAmPmTab("morning")}
                          className={`booking-period-option ${amPmTab === "morning" ? "is-active" : ""}`}
                        >
                          Mañana
                        </button>
                        <button
                          ref={afternoonTabRef}
                          role="tab"
                          id="tab-afternoon"
                          aria-selected={amPmTab === "afternoon"}
                          aria-controls="slots-panel"
                          tabIndex={amPmTab === "afternoon" ? 0 : -1}
                          onClick={() => setAmPmTab("afternoon")}
                          className={`booking-period-option ${amPmTab === "afternoon" ? "is-active" : ""}`}
                        >
                          Tarde
                        </button>
                      </div>
                    </div>

                    <div
                      id="slots-panel"
                      role="tabpanel"
                      aria-labelledby={amPmTab === "morning" ? "tab-morning" : "tab-afternoon"}
                    >
                      {slotsState === "loading" && (
                        <p className="cw-pb-loading-note">
                          <Loader2 size={14} className="cw-pb-spin" aria-hidden="true" /> Buscando horarios…
                        </p>
                      )}

                      {slotsState === "error" && (
                        <p className="cw-pb-error">No pudimos cargar los horarios. Intenta de nuevo.</p>
                      )}

                      {slotsState === "loaded" && slots.length === 0 && (
                        <p className="cw-pb-empty">No hay horarios disponibles ese día.</p>
                      )}

                      {slotsState === "loaded" && slots.length > 0 && visibleSlots.length === 0 && (
                        <p className="cw-pb-empty">
                          No hay horarios en la {amPmTab === "morning" ? "mañana" : "tarde"} ese día.
                        </p>
                      )}

                      {visibleSlots.length > 0 && (
                        <div className="booking-time-grid">
                          {visibleSlots.map((slot) => {
                            const active =
                              selectedSlot?.start === slot.start && selectedSlot?.staffId === slot.staffId;
                            const label = formatTimeLabel(slot.start, business!.timezone);
                            return (
                              <button
                                key={`${slot.staffId}-${slot.start}`}
                                type="button"
                                disabled={slot.isFull}
                                aria-pressed={active}
                                onClick={() => handleSelectSlot(slot)}
                                className={`booking-time-card ${active ? "is-selected" : ""} ${slot.isFull ? "is-full" : ""}`}
                              >
                                <span className="booking-time-card__time">
                                  <Clock3 className="booking-time-card__clock" aria-hidden="true" />
                                  {label}
                                </span>
                                <span className="booking-time-card__divider" aria-hidden="true" />
                                <span className="booking-time-card__professional">
                                  <span className="booking-time-card__avatar" aria-hidden="true">
                                    <UsersRound size={18} />
                                  </span>
                                  <span className="booking-time-card__professional-copy">
                                    <span className="booking-time-card__professional-label">Profesional</span>
                                    <span className="booking-time-card__professional-name">{slot.staffName}</span>
                                  </span>
                                </span>
                                {slot.isFull && <span className="cw-pb-slot-full-label">Cupo lleno</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <p className="booking-timezone">
                      <Globe2 aria-hidden="true" /> Zona horaria: {business?.timezone ?? "Colombia"}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* PASO 3: CONFIRMACIÓN */}
            {currentStep >= 3 && selectedSlot && (
              <section className="cw-pb-section" aria-labelledby="step3-heading">
                <h2 id="step3-heading" className="cw-pb-section-title" tabIndex={-1} ref={step3HeadingRef}>
                  3. Confirmación
                </h2>

                {submitError && <p className="cw-pb-error">{submitError}</p>}

                <div className="cw-pb-fields">
                  <label className="cw-pb-field">
                    <span className="cw-pb-field-label">Nombre completo</span>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                  <label className="cw-pb-field">
                    <span className="cw-pb-field-label">WhatsApp</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="Ej: 3001234567"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </label>
                  <label className="cw-pb-field">
                    <span className="cw-pb-field-label">Email (opcional)</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </label>
                </div>
              </section>
            )}
          </div>

          <BookingSummary
            variant="sidebar"
            mobileInline={currentStep === 1}
            serviceName={selectedService?.name ?? null}
            serviceIconSrc={selectedService ? getServiceIconSrc(selectedService.name) : null}
            durationMin={selectedService?.durationMin ?? null}
            dateLabel={dateLabelFull}
            timeLabel={timeLabel}
            staffName={selectedSlot?.staffName ?? null}
            primaryLabel={primaryLabel}
            primaryDisabled={primaryDisabled}
            submitting={submitting}
            onPrimary={handlePrimary}
            onChangeSelection={handleChangeSelection}
          />
        </div>
      </div>

      {currentStep >= 2 && (
        <BookingSummary
          variant="bar"
          serviceName={selectedService?.name ?? null}
          serviceIconSrc={selectedService ? getServiceIconSrc(selectedService.name) : null}
          durationMin={selectedService?.durationMin ?? null}
          dateLabel={dateLabelShort}
          timeLabel={timeLabel}
          staffName={selectedSlot?.staffName ?? null}
          primaryLabel={primaryLabel}
          primaryDisabled={primaryDisabled}
          submitting={submitting}
          onPrimary={handlePrimary}
          onChangeSelection={handleChangeSelection}
        />
      )}
    </main>
  );
}
