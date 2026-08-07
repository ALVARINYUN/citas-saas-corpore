"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} style={{ fontSize: 13, color: "var(--muted)", background: "none", border: 0, cursor: "pointer" }}>
      Cerrar sesión
    </button>
  );
}
