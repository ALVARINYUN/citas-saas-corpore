"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
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
          Bienvenido
        </h1>
        <p style={{ color: "var(--salvia)", fontSize: 12, letterSpacing: "0.1em", textAlign: "center", marginBottom: 24, textTransform: "uppercase" }}>
          Entra al panel de tu negocio
        </p>

        {error && (
          <p style={{ color: "#b91c1c", background: "rgba(185,28,28,0.06)", borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
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
              placeholder="Contraseña"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="cw-btn-primary" style={{ marginTop: 18 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 18 }}>
          ¿No tienes cuenta?{" "}
          <a href="/admin/signup" className="cw-link">
            Regístrate
          </a>
        </p>
      </form>
    </main>
  );
}
