"use client";

import { useEffect, useMemo, useState } from "react";

interface Appointment {
  id: string;
  startTime: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  service: { name: string };
  staff: { name: string };
  customer: { name: string; phone: string | null };
}

const STATUS_LABEL: Record<Appointment["status"], string> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistió",
};

const STATUS_CLASS: Record<Appointment["status"], string> = {
  CONFIRMED: "cw-badge-confirmed",
  CANCELLED: "cw-badge-cancelled",
  COMPLETED: "cw-badge-completed",
  NO_SHOW: "cw-badge-noshow",
};

const DOW = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AppointmentsAdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  function load() {
    setLoading(true);
    fetch("/api/admin/appointments")
      .then((res) => res.json())
      .then((data) => setAppointments(data.appointments ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(id: string, status: Appointment["status"]) {
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  // Agrupa las citas por día (clave YYYY-MM-DD) para poder marcar el calendario
  // y filtrar la lista del día seleccionado sin recorrer todo cada vez.
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = toDateKey(new Date(a.startTime));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  const dayAppointments = (appointmentsByDay.get(selectedDate) ?? []).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 = domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: new Date(year, month, i - startOffset + 1), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      cells.push({ date: next, inMonth: false });
    }
    return cells;
  }, [viewMonth]);

  return (
    <div>
      <h1 className="cw-page-heading">Citas</h1>

      {loading && <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 12 }}>Cargando...</p>}

      <div className="cw-two-col">
        {/* Columna izquierda: citas del día seleccionado */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {dayAppointments.map((a) => (
              <div key={a.id} className="cw-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div className="cw-day-appt-time">
                    {new Date(a.startTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontWeight: 500, color: "var(--grafito)" }}>{a.service.name}</div>
                      <span className={`cw-badge ${STATUS_CLASS[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                      con {a.staff.name} · {a.customer.name}
                      {a.customer.phone ? ` · ${a.customer.phone}` : ""}
                    </div>

                    {a.status === "CONFIRMED" && (
                      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                        <button onClick={() => updateStatus(a.id, "COMPLETED")} className="cw-link" style={{ background: "none", border: 0 }}>
                          Completada
                        </button>
                        <button onClick={() => updateStatus(a.id, "NO_SHOW")} className="cw-link-danger" style={{ background: "none", border: 0 }}>
                          No asistió
                        </button>
                        <button
                          onClick={() => updateStatus(a.id, "CANCELLED")}
                          style={{ fontSize: 12, color: "var(--muted)", textDecoration: "underline", background: "none", border: 0, cursor: "pointer" }}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!loading && dayAppointments.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No hay citas este día.</p>
            )}
          </div>
        </div>

        {/* Columna derecha: calendario */}
        <div className="cw-calendar-card">
          <div className="cw-calendar-header">
            <button
              className="cw-calendar-nav-btn"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <span className="cw-calendar-month-label">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              className="cw-calendar-nav-btn"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>

          <div className="cw-calendar-grid">
            {DOW.map((d) => (
              <div key={d} className="cw-calendar-dow">
                {d}
              </div>
            ))}
            {calendarCells.map(({ date, inMonth }) => {
              const key = toDateKey(date);
              const hasAppt = appointmentsByDay.has(key);
              const isSelected = key === selectedDate;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`cw-calendar-day ${isSelected ? "selected" : ""} ${hasAppt ? "has-appt" : ""} ${!inMonth ? "muted" : ""}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
