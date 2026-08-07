"use client";

import { useEffect, useState } from "react";

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

export default function AppointmentsAdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <h1 className="cw-page-heading">Citas</h1>

      {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando...</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {appointments.map((a) => (
          <div key={a.id} className="cw-card">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className="cw-icon-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 500, color: "var(--grafito)" }}>{a.service.name}</div>
                  <span className={`cw-badge ${STATUS_CLASS[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                  {new Date(a.startTime).toLocaleString("es-CO", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · con {a.staff.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                  {a.customer.name} {a.customer.phone ? `· ${a.customer.phone}` : ""}
                </div>

                {a.status === "CONFIRMED" && (
                  <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                    <button onClick={() => updateStatus(a.id, "COMPLETED")} className="cw-link" style={{ background: "none", border: 0 }}>
                      Marcar completada
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
        {!loading && appointments.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Todavía no hay citas agendadas.</p>
        )}
      </div>
    </div>
  );
}
