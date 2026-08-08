import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./LogoutButton";
import { SidebarNav, TopbarNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/admin/login");

  const business = await prisma.business.findUnique({ where: { id: session.businessId } });
  if (!business) redirect("/admin/login");

  return (
    <div className="cw-shell">
      {/* Barra lateral — solo visible en pantallas >= 768px */}
      <aside className="cw-sidebar">
        <div className="cw-sidebar-brand">{business.name}</div>
        <div className="cw-sidebar-sub">/b/{business.slug}</div>
        <SidebarNav />
        <div className="cw-sidebar-footer">
          <LogoutButton />
        </div>
      </aside>

      <div className="cw-main">
        {/* Barra superior — solo visible en móvil, reemplaza la barra lateral */}
        <div className="cw-topbar-mobile">
          <header className="cw-admin-header">
            <div>
              <div className="font-display italic" style={{ fontSize: 22, color: "var(--petroleo)", lineHeight: 1.1 }}>
                {business.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>/b/{business.slug}</div>
            </div>
            <LogoutButton />
          </header>
          <TopbarNav />
        </div>

        <main className="cw-page-shell">{children}</main>
      </div>
    </div>
  );
}
