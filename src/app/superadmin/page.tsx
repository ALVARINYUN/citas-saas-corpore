"use client";

import { useEffect, useState } from "react";

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  logoUrl: string | null;
  _count: { services: number; staff: number; appointments: number; users: number };
}

export default function SuperAdminPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/superadmin/businesses")
      .then((res) => res.json())
      .then((data) => setBusinesses(data.businesses ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleActive(b: BusinessRow) {
    await fetch(`/api/superadmin/businesses/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    load();
  }

  async function handleDelete(b: BusinessRow) {
    if (!confirm(`¿Eliminar "${b.name}" y TODOS sus datos (servicios, citas, usuarios)? Esto no se puede deshacer.`)) return;
    await fetch(`/api/superadmin/businesses/${b.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="cw-page-heading">Negocios registrados</h1>

      {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando...</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {businesses.map((b) => (
          <div key={b.id} className="cw-card">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logoUrl}
                  alt={b.name}
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <span className="cw-icon-badge">{b.name.charAt(0).toUpperCase()}</span>
              )}

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 500, color: "var(--grafito)" }}>{b.name}</span>
                  {!b.active && (
                    <span className="cw-badge cw-badge-cancelled">Desactivado</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  /b/{b.slug} · {b._count.services} servicios · {b._count.staff} staff ·{" "}
                  {b._count.appointments} citas · {b._count.users} usuario(s)
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                <a href={`/b/${b.slug}`} target="_blank" rel="noreferrer" className="cw-link">
                  Ver página
                </a>
                <button onClick={() => toggleActive(b)} className="cw-link" style={{ background: "none", border: 0 }}>
                  {b.active ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => handleDelete(b)} className="cw-link-danger" style={{ background: "none", border: 0 }}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && businesses.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Aún no hay negocios registrados.</p>
        )}
      </div>
    </div>
  );
}
