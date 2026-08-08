"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/admin/business",
    label: "Mi negocio",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 21V6a1 1 0 011-1h10a1 1 0 011 1v15M9 9h.01M13 9h.01M9 13h.01M13 13h.01M9 17h.01M13 17h.01M16 21h4V11h-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/admin/services",
    label: "Servicios",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l1.8 5.6H19l-4.6 3.4 1.8 5.6L12 14.2 7.8 17.6l1.8-5.6L5 8.6h5.2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/admin/staff",
    label: "Staff y horarios",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c2.5.3 4.5 2.3 4.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/admin/appointments",
    label: "Citas",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={`cw-sidebar-link ${pathname?.startsWith(link.href) ? "active" : ""}`}
        >
          {link.icon}
          {link.label}
        </a>
      ))}
    </>
  );
}

export function TopbarNav() {
  const pathname = usePathname();
  return (
    <nav className="cw-admin-nav">
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={`cw-admin-nav-link ${pathname?.startsWith(link.href) ? "active" : ""}`}
        >
          {link.icon}
          {link.label}
        </a>
      ))}
    </nav>
  );
}
