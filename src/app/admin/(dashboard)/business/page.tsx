"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Building2 } from "lucide-react";

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
    <div className="admin-content">
      <h1 className="admin-page-title">{business?.name}</h1>
      <p className="admin-page-subtitle">Configura la información que verán tus clientes.</p>
      <svg className="admin-title-mark" viewBox="0 0 220 60" fill="none" aria-hidden="true">
        <path
          d="M10 40 C48 3, 76 6, 106 31 C138 57, 171 53, 207 22"
          stroke="var(--salvia)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="166" cy="25" r="8" fill="var(--salvia)" />
      </svg>

      <div className="business-settings-card">
        <section className="identity-section">
          <h2 className="section-heading">
            <ImageIcon size={18} aria-hidden="true" />
            Identidad visual
          </h2>
          <p className="section-subheading">Logo del negocio</p>

          <div className="logo-upload-area">
            <div className="logo-preview">
              {business?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logoUrl} alt="Logo" />
              ) : (
                business?.name?.charAt(0).toUpperCase() ?? "?"
              )}
            </div>

            <div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="logo-upload-button"
                >
                  {uploading ? "Subiendo..." : business?.logoUrl ? "Cambiar logo" : "Subir logo"}
                </button>
                {business?.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={removingLogo}
                    className="cw-link-danger"
                    style={{ background: "none", border: 0, fontSize: 13 }}
                  >
                    {removingLogo ? "Quitando..." : "Quitar logo"}
                  </button>
                )}
              </div>
              <p className="form-help" style={{ marginTop: 8 }}>
                PNG, JPG o WEBP · máximo 2 MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoChange}
              style={{ display: "none" }}
            />
          </div>
        </section>

        <section className="business-info-section">
          <div className="business-info-header">
            <h2 className="section-heading" style={{ marginBottom: 0 }}>
              <Building2 size={18} aria-hidden="true" />
              Información del negocio
            </h2>
          </div>

          <div className="business-info-body">
            <form onSubmit={handleSave}>
              {error && (
                <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 16 }} role="alert">
                  {error}
                </p>
              )}

              <div className="form-field">
                <label className="form-label" htmlFor="business-name">
                  Nombre del negocio
                </label>
                <input
                  id="business-name"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="business-address">
                  Dirección
                </label>
                <input
                  id="business-address"
                  className="form-input"
                  placeholder="Escribe la dirección"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="business-description">
                  Descripción breve
                </label>
                <textarea
                  id="business-description"
                  className="form-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  aria-describedby="business-description-help"
                />
                <span id="business-description-help" className="form-help">
                  El chatbot de WhatsApp utiliza esta información para responder preguntas generales.
                </span>
              </div>

              <div className="save-button-row">
                <button type="submit" disabled={saving} className="save-button">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
