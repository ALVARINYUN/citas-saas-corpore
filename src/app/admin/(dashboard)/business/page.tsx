"use client";

import { useEffect, useRef, useState } from "react";

interface Business {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  description: string | null;
}

export default function BusinessSettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", address: "", description: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/business")
      .then((res) => res.json())
      .then((data) => {
        setBusiness(data.business);
        setForm({
          name: data.business?.name ?? "",
          address: data.business?.address ?? "",
          description: data.business?.description ?? "",
        });
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setBusiness(data.business);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/business/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el logo");
        return;
      }
      setBusiness(data.business);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    if (!confirm("¿Quitar el logo? Tu página volverá a mostrar solo el nombre del negocio.")) return;
    setRemovingLogo(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business/logo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo quitar el logo");
        return;
      }
      setBusiness(data.business);
    } finally {
      setRemovingLogo(false);
    }
  }

  if (loading) return <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando...</p>;

  return (
    <div>
      <h1 className="cw-page-heading">Mi negocio</h1>

      <div className="cw-card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Logo
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {business?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt="Logo"
              style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(190,183,170,0.5)" }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(228,214,190,0.4)",
                color: "var(--salvia)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontFamily: "var(--font-display-serif)",
              }}
            >
              {business?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}

          <div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="cw-btn-primary"
                style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}
              >
                {uploading ? "Subiendo..." : business?.logoUrl ? "Cambiar logo" : "Subir logo"}
              </button>
              {business?.logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={removingLogo}
                  className="cw-link-danger"
                  style={{ background: "none", border: 0, fontSize: 13 }}
                >
                  {removingLogo ? "Quitando..." : "Quitar logo"}
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>PNG, JPG o WEBP · máx 2MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleLogoChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="cw-card" style={{ display: "grid", gap: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Información del negocio
        </p>

        {error && <p style={{ color: "#b91c1c", fontSize: 12 }}>{error}</p>}

        <input
          className="cw-input"
          placeholder="Nombre del negocio"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="cw-input"
          placeholder="Dirección"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <textarea
          className="cw-input"
          placeholder="Descripción breve (el chatbot de WhatsApp la usa para responder preguntas generales)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          style={{ resize: "vertical", fontFamily: "var(--font-body)" }}
        />

        <button type="submit" disabled={saving} className="cw-btn-primary">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
