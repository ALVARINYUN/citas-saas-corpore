"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: string | null;
}

interface Slot {
  start: string;
  end: string;
  staffId: string;
  staffName: string;
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();

  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/business/${slug}/services`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setBusinessId(data.business.id);
        setBusinessName(data.business.name);
        setServices(data.services);
      });
  }, [slug]);

  useEffect(() => {
    if (!selectedService) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(
      `/api/business/${slug}/availability?serviceId=${selectedService.id}&date=${date}`
    )
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [selectedService, date, slug]);

  async function handleConfirm() {
    if (!selectedService || !selectedSlot || !form.name || !businessId) return;
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId: selectedService.id,
          staffId: selectedSlot.staffId,
          startTime: selectedSlot.start,
          customer: form,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo agendar la cita");
        return;
      }
      setConfirmed(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <main style={{ minHeight: "100vh", padding: "28px 16px" }}>
        <div className="cw-booking" style={{ textAlign: "center", padding: "56px 40px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(143,169,140,0.16)",
              color: "var(--salvia)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
              fontSize: 30,
            }}
          >
            ✓
          </div>
          <h1
            className="font-display italic"
            style={{ fontSize: 34, color: "var(--petroleo)", marginBottom: 8 }}
          >
            Cita confirmada
          </h1>
          <p style={{ color: "var(--salvia)", fontFamily: "var(--font-display-serif)", fontSize: 19 }}>
            {new Date(selectedSlot!.start).toLocaleString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 14 }}>
            Te enviamos la confirmación por WhatsApp al {form.phone}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: "28px 16px" }}>
      <div className="cw-booking">
        {/* LOGO */}
        <header className="cw-brand">
          <svg className="cw-brand-symbol" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 40 C48 3, 76 6, 106 31 C138 57, 171 53, 207 22"
              stroke="#8FA98C"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle cx="166" cy="25" r="7" fill="#8FA98C" />
          </svg>
          <div className="cw-brand-name">{businessName || "Cargando..."}</div>
          <div className="cw-brand-tagline">Reserva tu cita</div>
        </header>

        <div className="cw-page-title">Elige y confirma</div>

        {error && (
          <p
            style={{
              color: "#b91c1c",
              background: "rgba(185,28,28,0.06)",
              borderRadius: 14,
              padding: "10px 16px",
              fontSize: 13,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/* PASO 1 */}
        <section className="cw-section">
          <h2 className="cw-section-title">
            <span className="cw-step">1</span>
            Elige un servicio
          </h2>

          <div style={{ display: "grid", gap: 12 }}>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s)}
                className={`cw-service-card ${selectedService?.id === s.id ? "active" : ""}`}
              >
                <div className="cw-service-icon">
                  <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="11" r="3" stroke="currentColor" strokeWidth="1.7" />
                    <path
                      d="M22 15c-2 7-3 14-2 22M26 16c5 7 8 13 10 20M20 22l-8 10M27 25l9-6M9 38h31"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="cw-service-info">
                  <div className="cw-service-name">{s.name}</div>
                  <div className="cw-service-duration">
                    ◷ <span>{s.durationMin} min{s.price ? ` · $${s.price}` : ""}</span>
                  </div>
                </div>
                <span className="cw-arrow">›</span>
              </button>
            ))}
            {services.length === 0 && !error && (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando servicios...</p>
            )}
          </div>
        </section>

        {/* PASO 2 */}
        {selectedService && (
          <section className="cw-section">
            <h2 className="cw-section-title">
              <span className="cw-step">2</span>
              Fecha y hora
            </h2>

            <label className="cw-date-control">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </label>

            {loadingSlots && (
              <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>
                Buscando horarios...
              </p>
            )}

            <div className="cw-times">
              {slots.map((slot) => {
                const active =
                  selectedSlot?.start === slot.start && selectedSlot?.staffId === slot.staffId;
                return (
                  <button
                    key={`${slot.staffId}-${slot.start}`}
                    onClick={() => setSelectedSlot(slot)}
                    className={`cw-time ${active ? "active" : ""}`}
                  >
                    {new Date(slot.start).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                );
              })}
              {!loadingSlots && slots.length === 0 && (
                <p style={{ gridColumn: "1 / -1", color: "var(--muted)", fontSize: 14 }}>
                  No hay horarios disponibles ese día.
                </p>
              )}
            </div>
          </section>
        )}

        {/* PASO 3 */}
        {selectedSlot && (
          <section className="cw-section">
            <h2 className="cw-section-title">
              <span className="cw-step">3</span>
              Tus datos
            </h2>

            <div className="cw-fields">
              <label className="cw-field">
                <svg className="cw-field-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 21v-2c0-4 3-6 8-6s8 2 8 6v2" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label className="cw-field">
                <svg className="cw-field-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M8 7c1 5 4 8 9 9" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="WhatsApp (ej: 3001234567)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label className="cw-field">
                <svg className="cw-field-icon" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                <input
                  type="email"
                  placeholder="Email (opcional)"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>

            <button onClick={handleConfirm} disabled={!form.name || submitting} className="cw-confirm">
              ▣ {submitting ? "Agendando..." : "Confirmar cita"}
            </button>

            <div className="cw-security">🔒 Tu información está segura y confidencial</div>
          </section>
        )}
      </div>
    </main>
  );
}
