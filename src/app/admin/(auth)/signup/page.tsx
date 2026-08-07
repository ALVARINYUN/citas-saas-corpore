"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la cuenta");
        return;
      }
      router.push("/admin/services");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={handleSubmit} className="cw-booking" style={{ maxWidth: 380, padding: "40px 36px" }}>
        <h1 className="font-display italic" style={{ fontSize: 30, color: "var(--petroleo)", textAlign: "center", marginBottom: 4 }}>
          Crea tu negocio
        </h1>
        <p style={{ color: "var(--salvia)", fontSize: 12, letterSpacing: "0.1em", textAlign: "center", marginBottom: 24, textTransform: "uppercase" }}>
          Empieza a gestionar tus citas
        </p>

        {error && (
          <p style={{ color: "#b91c1c", background: "rgba(185,28,28,0.06)", borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <div className="cw-input-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 21V6a1 1 0 011-1h10a1 1 0 011 1v15M9 9h.01M13 9h.01M9 13h.01M13 13h.01M9 17h.01M13 17h.01M16 21h4V11h-4"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              className="cw-input"
              placeholder="Nombre del negocio"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              required
            />
          </div>
          <div className="cw-input-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <input
              className="cw-input"
              placeholder="Correo"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="cw-input-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <input
              className="cw-input"
              placeholder="Contraseña (mínimo 8 caracteres)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="cw-btn-primary" style={{ marginTop: 18 }}>
          {loading ? "Creando..." : "Crear cuenta"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 18 }}>
          ¿Ya tienes cuenta?{" "}
          <a href="/admin/login" className="cw-link">
            Inicia sesión
          </a>
        </p>
      </form>
    </main>
  );
}
