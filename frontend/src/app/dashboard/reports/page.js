"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { subAccountApi } from "../../../lib/api";

export default function ReportsPage() {
  const { subAccountId } = useAuth();
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    if (!subAccountId) return;
    subAccountApi(subAccountId).get("/reports/overview").then(setOverview);
  }, [subAccountId]);

  if (!overview) return null;

  return (
    <section>
      <div className="card">
        <h2 className="section-title">Overview</h2>
        <div className="stats">
          <div className="stat"><strong>{overview.contacts}</strong>Total Contacts</div>
          <div className="stat"><strong>{overview.newContacts}</strong>New (30 days)</div>
          {overview.opportunitiesByStatus.map((o) => (
            <div key={o.status} className="stat"><strong>{o.count}</strong>Opportunities: {o.status} (${o.value})</div>
          ))}
          {overview.appointmentsByStatus.map((a) => (
            <div key={a.status} className="stat"><strong>{a.count}</strong>Appointments: {a.status}</div>
          ))}
          {overview.messagesByChannel.map((m) => (
            <div key={`${m.direction}-${m.channel}`} className="stat"><strong>{m.count}</strong>{m.direction} {m.channel}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
