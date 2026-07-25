"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/pipelines", label: "Pipelines" },
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/workflows", label: "Workflows" },
  { href: "/dashboard/calendars", label: "Calendars" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/agency", label: "Agency" },
];

export default function DashboardLayout({ children }) {
  const { user, loading, subAccounts, subAccountId, switchSubAccount, currentSubAccount, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main>
        <div className="container">Loading...</div>
      </main>
    );
  }

  return (
    <main>
      <div className="container" style={{ maxWidth: 1300 }}>
        <div className="topbar">
          <div className="logo">
            <span className="logo-mark" />
            Follow-Up AI
          </div>
          <div className="inline" style={{ alignItems: "center" }}>
            {subAccounts.length > 0 && (
              <select value={subAccountId || ""} onChange={(e) => switchSubAccount(e.target.value)} style={{ width: "auto" }}>
                {subAccounts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            <span className="pill">{user.agency?.name}</span>
            <button className="ghost" type="button" onClick={logout}>Log out</button>
          </div>
        </div>

        <div className="nav" style={{ marginBottom: 24 }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <button type="button" className={pathname.startsWith(item.href) ? "active" : ""}>
                {item.label.toUpperCase()}
              </button>
            </Link>
          ))}
        </div>

        {!currentSubAccount ? (
          <section className="card">
            <h2 className="section-title">No sub-account yet</h2>
            <p className="subtitle">Create one from the Agency tab to get started.</p>
          </section>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
