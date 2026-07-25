"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard/contacts");
    }
  }, [loading, user, router]);

  return (
    <main>
      <div className="container">
        <div className="topbar">
          <div className="logo">
            <span className="logo-mark" />
            Follow-Up AI
          </div>
          <div className="nav">
            <Link href="/login"><button type="button">Log In</button></Link>
            <Link href="/signup"><button type="button" className="active">Get Started</button></Link>
          </div>
        </div>

        <section className="hero-card">
          <span className="badge">CRM · Conversations · Automation</span>
          <h1 className="hero-title">Run your whole client relationship in one place.</h1>
          <p className="subtitle">
            Contacts, pipelines, a unified inbox, appointment booking, and an automation engine
            that follows up so you don&apos;t have to &mdash; all multi-tenant, agency-ready.
          </p>
          <div className="hero-actions">
            <Link href="/signup"><button className="cta" type="button">Create your agency</button></Link>
            <Link href="/login"><button className="ghost" type="button">I already have an account</button></Link>
          </div>
        </section>

        <div className="stats">
          <div className="stat"><strong>CRM</strong>Contacts, tags, custom fields, smart lists</div>
          <div className="stat"><strong>Pipelines</strong>Kanban opportunities per sub-account</div>
          <div className="stat"><strong>Conversations</strong>Unified inbox across channels</div>
          <div className="stat"><strong>Workflows</strong>Trigger + action automation engine</div>
          <div className="stat"><strong>Calendars</strong>Booking with conflict detection</div>
          <div className="stat"><strong>Agency</strong>Unlimited sub-accounts, team roles</div>
        </div>
      </div>
    </main>
  );
}
