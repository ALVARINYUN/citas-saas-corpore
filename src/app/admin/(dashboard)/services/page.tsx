"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: string | null;
  capacity: number;
  active: boolean;
}

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", durationMin: "30", price: "", capacity: "1" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el servicio");
        return;
      }
      setForm({ name: "", durationMin: "30", price: "", capacity: "1" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service: Service) {
    await fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return;
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="cw-page-heading">Servicios</h1>

      <form onSubmit={handleCreate} className="cw-card" style={{ display: "grid", gap: 10, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <input
            className="cw-input"
            placeholder="Nombre del servicio"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              className="cw-input"
              placeholder="Duración (min)"
              type="number"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
              required
            />
            <input
              className="cw-input"
              placeholder="Precio (opcional)"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <input
              className="cw-input"
              placeholder="Cupo por horario"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              required
            />
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              1 = cita individual, más de 1 = varias personas o recursos por el mismo horario
            </p>
          </div>
        </div>
        {error && <p style={{ color: "#b91c1c", fontSize: 12 }}>{error}</p>}
        <button type="submit" disabled={saving} className="cw-btn-primary">
          + {saving ? "Agregando..." : "Agregar servicio"}
        </button>
      </form>

      {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando...</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {services.map((s) => (
          <div key={s.id} className="cw-list-row">
            <span className="cw-icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l1.5 4.5H18l-3.6 2.7 1.4 4.4L12 12.1l-3.8 2.5 1.4-4.4L6 7.5h4.5z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 500,
                  color: s.active ? "var(--grafito)" : "var(--muted)",
                  textDecoration: s.active ? "none" : "line-through",
                }}
              >
                {s.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {s.durationMin} min {s.price ? `· $${s.price}` : ""}
                {s.capacity > 1 ? ` · cupo ${s.capacity}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => toggleActive(s)} className="cw-link" style={{ background: "none", border: 0 }}>
                {s.active ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => handleDelete(s.id)} className="cw-link-danger" style={{ background: "none", border: 0 }}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {!loading && services.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Aún no tienes servicios. Agrega el primero arriba.
          </p>
        )}
      </div>
    </div>
  );
}
