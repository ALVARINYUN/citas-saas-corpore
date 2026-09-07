import { redirect } from "next/navigation";
import { ExternalLink, Globe2 } from "lucide-react";
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
    <div className="cw-shell admin-page">
      {/* Barra lateral — solo visible en pantallas >= 768px */}
      <aside className="cw-sidebar admin-sidebar">
        <div className="cw-sidebar-brand">{business.name}</div>
        <div className="cw-sidebar-sub">/b/{business.slug}</div>
        <a
          href={`/b/${business.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="public-page-link"
        >
          <span className="public-page-link-icon" aria-hidden="true">
            <Globe2 size={18} />
          </span>
          <span className="public-page-link-text">
            <span className="public-page-link-title">Página de reservas</span>
            <span className="public-page-link-sub">Ver sitio público</span>
          </span>
          <ExternalLink size={16} className="public-page-link-arrow" aria-hidden="true" />
        </a>
        <SidebarNav businessName={business.name} />
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
              <a
                href={`/b/${business.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cw-preview-link"
                style={{ padding: 0, marginTop: 4, marginBottom: 0 }}
              >
                Ver página de reservas <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <LogoutButton />
          </header>
          <TopbarNav businessName={business.name} />
        </div>

        <main className="cw-page-shell">{children}</main>
      </div>
    </div>
  );
}
