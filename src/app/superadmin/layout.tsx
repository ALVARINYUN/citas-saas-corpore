import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/superAdmin";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="cw-admin-header">
        <div>
          <div className="font-display italic" style={{ fontSize: 22, color: "var(--petroleo)" }}>
            Panel de plataforma
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Todos los negocios registrados</div>
        </div>
        <a href="/admin/services" className="cw-link">
          Ir a mi negocio
        </a>
      </header>
      <main className="cw-page-shell">{children}</main>
    </div>
  );
}
