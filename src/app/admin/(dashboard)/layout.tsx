import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/admin/login");

  const business = await prisma.business.findUnique({ where: { id: session.businessId } });
  if (!business) redirect("/admin/login");

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="cw-admin-header">
        <div>
          <div className="font-display italic" style={{ fontSize: 22, color: "var(--petroleo)", lineHeight: 1.1 }}>
            {business.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em" }}>
            /b/{business.slug}
          </div>
        </div>
        <LogoutButton />
      </header>

      <nav className="cw-admin-nav">
        <NavLink href="/admin/services" label="Servicios" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.6H19l-4.6 3.4 1.8 5.6L12 14.2 7.8 17.6l1.8-5.6L5 8.6h5.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        } />
        <NavLink href="/admin/staff" label="Staff y horarios" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c2.5.3 4.5 2.3 4.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        } />
        <NavLink href="/admin/appointments" label="Citas" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" /></svg>
        } />
      </nav>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>{children}</main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} className="cw-admin-nav-link">
      {icon}
      {label}
    </a>
  );
}
