"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface StaffMember {
  id: string;
  name: string;
  active: boolean;
  availability: Availability[];
  staffServices: { service: Service }[];
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/staff").then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
    ])
      .then(([staffData, servicesData]) => {
        setStaff(staffData.staff ?? []);
        setServices(servicesData.services ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    load();
  }

  async function handleDeleteStaff(id: string) {
    if (!confirm("¿Eliminar este miembro del staff?")) return;
    await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleService(member: StaffMember, serviceId: string) {
    const current = member.staffServices.map((ss) => ss.service.id);
    const next = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId];

    await fetch(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: next }),
    });
    load();
  }

  async function addAvailability(staffId: string, dayOfWeek: number, startTime: string, endTime: string) {
    await fetch(`/api/admin/staff/${staffId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, startTime, endTime }),
    });
    load();
  }

  async function removeAvailability(staffId: string, availabilityId: string) {
    await fetch(`/api/admin/staff/${staffId}/availability?availabilityId=${availabilityId}`, {
      method: "DELETE",
    });
    load();
  }

  return (
    <div>
      <h1 className="cw-page-heading">Staff y horarios</h1>

      <form onSubmit={handleAddStaff} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          className="cw-input"
          placeholder="Nombre del nuevo miembro"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="cw-btn-primary" style={{ width: "auto", padding: "0 20px" }}>
          + Agregar
        </button>
      </form>

      {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando...</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {staff.map((member) => (
          <div key={member.id} className="cw-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                style={{
                  fontWeight: 500,
                  color: "var(--grafito)",
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                {member.name} {expandedId === member.id ? "▲" : "▼"}
              </button>
              <button onClick={() => handleDeleteStaff(member.id)} className="cw-link-danger" style={{ background: "none", border: 0 }}>
                Eliminar
              </button>
            </div>

            {expandedId === member.id && (
              <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Servicios que atiende
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {services.map((s) => {
                      const active = member.staffServices.some((ss) => ss.service.id === s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleService(member, s.id)}
                          className={`cw-chip ${active ? "active" : ""}`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                    {services.length === 0 && (
                      <p style={{ fontSize: 12, color: "var(--muted)" }}>
                        Crea servicios primero en la pestaña Servicios.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Horario semanal
                  </p>
                  <AvailabilityEditor
                    availability={member.availability}
                    onAdd={(day, start, end) => addAvailability(member.id, day, start, end)}
                    onRemove={(availabilityId) => removeAvailability(member.id, availabilityId)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && staff.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Aún no tienes staff. Agrega el primero arriba.
          </p>
        )}
      </div>
    </div>
  );
}

function AvailabilityEditor({
  availability,
  onAdd,
  onRemove,
}: {
  availability: Availability[];
  onAdd: (day: number, start: string, end: string) => void;
  onRemove: (availabilityId: string) => void;
}) {
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  return (
    <div>
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        {availability.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 12,
              padding: "8px 12px",
              border: "1px solid rgba(190,183,170,0.4)",
            }}
          >
            <span>
              {DAYS[a.dayOfWeek]} · {a.startTime} – {a.endTime}
            </span>
            <button onClick={() => onRemove(a.id)} className="cw-link-danger" style={{ background: "none", border: 0 }}>
              Quitar
            </button>
          </div>
        ))}
        {availability.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--muted)" }}>Sin horario definido todavía.</p>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="cw-input"
          style={{ width: "auto", padding: "8px 10px", fontSize: 12 }}
        >
          {DAYS.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="cw-input"
          style={{ width: "auto", padding: "8px 10px", fontSize: 12 }}
        />
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="cw-input"
          style={{ width: "auto", padding: "8px 10px", fontSize: 12 }}
        />
        <button
          onClick={() => onAdd(day, start, end)}
          className="cw-btn-primary"
          style={{ width: "auto", padding: "8px 14px", fontSize: 12 }}
        >
          + Agregar bloque
        </button>
      </div>
    </div>
  );
}
