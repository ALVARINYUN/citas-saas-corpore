"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Clock3, UsersRound, CircleCheck, CalendarCheck, Globe2, Loader2 } from "lucide-react";
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

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const detailsRef = useRef<HTMLDivElement | null>(null);
  const morningTabRef = useRef<HTMLButtonElement | null>(null);
  const afternoonTabRef = useRef<HTMLButtonElement | null>(null);

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

  function handleSelectService(s: Service) {
    if (selectedSlot) setClearedNotice("Cambiaste de servicio, elige un horario de nuevo.");
    setSelectedService(s);
    setSelectedSlot(null);
    setDetailsOpen(false);
  }

  function handleSelectDate(dateKey: string) {
    if (selectedSlot) setClearedNotice("Elegiste otra fecha, vuelve a elegir un horario.");
    setSelectedDate(dateKey);
    setSelectedSlot(null);
    setDetailsOpen(false);
  }

  function handleSelectSlot(slot: Slot) {
    setClearedNotice(null);
    setSelectedSlot(slot);
  }

  function handleChangeSelection() {
    setDetailsOpen(false);
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
    if (!detailsOpen) {
      if (!selectedSlot) return;
      setDetailsOpen(true);
      requestAnimationFrame(() => {
        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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

  const currentStep = detailsOpen ? 3 : selectedService ? 2 : 1;

  const dateLabelFull = selectedDate ? formatDateLabel(selectedDate) : null;
  const dateLabelShort = selectedDate ? formatDateLabel(selectedDate, true) : null;
  const timeLabel = selectedSlot && business ? formatTimeLabel(selectedSlot.start, business.timezone) : null;

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
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cw-pb-page">
      <div className="cw-pb-shell">
        <header className="cw-pb-header">
          <div className="cw-pb-brand">
            {business?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="cw-pb-logo-img" />
            ) : (
              <svg className="cw-pb-logo-mark" viewBox="0 0 220 60" fill="none" aria-hidden="true">
                <path
                  d="M10 40 C48 3, 76 6, 106 31 C138 57, 171 53, 207 22"
                  stroke="#8FA98C"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx="166" cy="25" r="7" fill="#8FA98C" />
              </svg>
            )}
            <div>
              <div className="cw-pb-brand-name">{business?.name ?? "Cargando…"}</div>
              <div className="cw-pb-brand-tagline">Reserva tu cita</div>
            </div>
          </div>
        </header>

        <h1 className="cw-pb-title">Reserva tu cita</h1>

        <ol className="cw-pb-steps" aria-label="Progreso de la reserva">
          {[
            { n: 1, label: "Servicio" },
            { n: 2, label: "Fecha y hora" },
            { n: 3, label: "Confirmación" },
          ].map(({ n, label }) => (
            <li key={n} className={`cw-pb-step ${currentStep === n ? "active" : ""} ${currentStep > n ? "done" : ""}`}>
              <button
                type="button"
                disabled={n >= currentStep}
                onClick={() => setDetailsOpen(false)}
                aria-current={currentStep === n ? "step" : undefined}
              >
                <span className="cw-pb-step-dot">
                  {currentStep > n ? <CircleCheck size={14} aria-hidden="true" /> : n}
                </span>
                {label}
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
                1. Elige un servicio
              </h2>

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
                <div className="cw-pb-service-grid">
                  {services.map((s) => {
                    const selected = selectedService?.id === s.id;
                    const Icon = s.capacity > 1 ? UsersRound : CalendarDays;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleSelectService(s)}
                        className={`cw-pb-service-card ${selected ? "selected" : ""}`}
                      >
                        <span className="cw-pb-service-icon" aria-hidden="true">
                          <Icon size={22} />
                        </span>
                        <span className="cw-pb-service-name">{s.name}</span>
                        <span className="cw-pb-service-meta">
                          <Clock3 size={13} aria-hidden="true" /> {s.durationMin} min
                          {s.price ? ` · $${s.price}` : ""}
                        </span>
                        {s.capacity > 1 && <span className="cw-pb-service-badge">Grupal · cupo {s.capacity}</span>}
                        {selected && (
                          <span className="cw-pb-service-selected" aria-hidden="true">
                            <CircleCheck size={18} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* PASO 2: FECHA Y HORA */}
            {selectedService && (
              <section className="cw-pb-section" aria-labelledby="step2-heading">
                <h2 id="step2-heading" className="cw-pb-section-title">
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
                  <div className="cw-pb-times-block">
                    <div
                      className="cw-pb-tabs"
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
                        className={`cw-pb-tab ${amPmTab === "morning" ? "active" : ""}`}
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
                        className={`cw-pb-tab ${amPmTab === "afternoon" ? "active" : ""}`}
                      >
                        Tarde
                      </button>
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
                        <div className="cw-pb-slot-grid">
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
                                className={`cw-pb-slot ${active ? "active" : ""} ${slot.isFull ? "full" : ""}`}
                              >
                                <span className="cw-pb-slot-time">{label}</span>
                                <span className="cw-pb-slot-staff">
                                  <UsersRound size={11} aria-hidden="true" /> {slot.staffName}
                                </span>
                                {slot.isFull && <span className="cw-pb-slot-full-label">Cupo lleno</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <p className="cw-pb-timezone-note">
                      <Globe2 size={13} aria-hidden="true" /> Zona horaria: {business?.timezone ?? "Colombia"}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* PASO 3: CONFIRMACIÓN */}
            {detailsOpen && selectedSlot && (
              <section className="cw-pb-section" aria-labelledby="step3-heading" ref={detailsRef}>
                <h2 id="step3-heading" className="cw-pb-section-title">
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
            serviceName={selectedService?.name ?? null}
            durationMin={selectedService?.durationMin ?? null}
            dateLabel={dateLabelFull}
            timeLabel={timeLabel}
            staffName={selectedSlot?.staffName ?? null}
            primaryLabel={detailsOpen ? "Confirmar cita" : "Continuar"}
            primaryDisabled={detailsOpen ? !form.name : !selectedSlot}
            submitting={submitting}
            onPrimary={handlePrimary}
            onChangeSelection={handleChangeSelection}
          />
        </div>
      </div>

      <BookingSummary
        variant="bar"
        serviceName={selectedService?.name ?? null}
        durationMin={selectedService?.durationMin ?? null}
        dateLabel={dateLabelShort}
        timeLabel={timeLabel}
        staffName={selectedSlot?.staffName ?? null}
        primaryLabel={detailsOpen ? "Confirmar cita" : "Continuar"}
        primaryDisabled={detailsOpen ? !form.name : !selectedSlot}
        submitting={submitting}
        onPrimary={handlePrimary}
        onChangeSelection={handleChangeSelection}
      />
    </main>
  );
}
