"use client";

import { useState } from "react";

const intents = [
  { value: "confirm", label: "Confirm" },
  { value: "reschedule", label: "Reschedule" },
  { value: "no_show", label: "No-show" },
  { value: "rebook", label: "Rebook" },
];

export default function Home() {
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    appointmentTime: "",
    channel: "sms",
    intent: "confirm",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${apiBase}/api/followup/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Unable to compose message. Check the API and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="container">
        <section className="hero">
          <div>
            <span className="badge">Follow-Up AI Suite</span>
            <h1>Make reschedules feel inevitable.</h1>
            <p className="subtitle">
              High-touch follow-ups that recover no-shows, confirm appointments, and book the next visit — with
              confidence and style.
            </p>
            <div className="hero-meta">
              <span>SMS + Email</span>
              <span>Groq-powered messaging</span>
              <span>Neon-backed insights</span>
            </div>
          </div>
          <div className="card float">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div>
                  <label>Client Name</label>
                  <input value={form.name} onChange={handleChange("name")} placeholder="Jordan Lee" required />
                </div>
                <div>
                  <label>Business Name</label>
                  <input value={form.businessName} onChange={handleChange("businessName")} placeholder="Bright Dental" required />
                </div>
                <div>
                  <label>Appointment Time</label>
                  <input value={form.appointmentTime} onChange={handleChange("appointmentTime")} placeholder="Thu 3:00 PM" required />
                </div>
                <div>
                  <label>Channel</label>
                  <select value={form.channel} onChange={handleChange("channel")}>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label>Intent</label>
                  <select value={form.intent} onChange={handleChange("intent")}>
                    {intents.map((intent) => (
                      <option key={intent.value} value={intent.value}>
                        {intent.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="cta" type="submit" disabled={loading}>
                {loading ? "Composing..." : "Generate Follow-Up"}
              </button>
            </form>
          </div>
        </section>

        <section className="grid">
          <div className="card output">
            <span className="pill">Generated Message</span>
            {error && <p>{error}</p>}
            {!error && !result && <p>Run the generator to preview the follow-up message.</p>}
            {result && (
              <>
                <span className="badge">{result.channel?.toUpperCase()}</span>
                <div className="message">{result.text}</div>
              </>
            )}
          </div>
          <div className="card">
            <span className="pill">Recovery Engine</span>
            <p className="subtitle">
              Turn missed appointments into booked revenue with intent-based messaging, one-click reschedules, and
              soft-close follow-ups that feel personal.
            </p>
            <div className="stats">
              <div className="stat">
                <strong>+38%</strong>
                <span>rebook rate lift</span>
              </div>
              <div className="stat">
                <strong>2x</strong>
                <span>faster confirmations</span>
              </div>
              <div className="stat">
                <strong>24/7</strong>
                <span>response coverage</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid" style={{ marginTop: 24 }}>
          <div className="card">
            <span className="pill">What It Handles</span>
            <p className="subtitle">Confirmations, reschedules, no-shows, rebooks — all routed through a single AI brain.</p>
            <div className="hero-meta">
              <span>Appointment confirmations</span>
              <span>Missed visit recovery</span>
              <span>Smart rebooking nudges</span>
              <span>Personalized tone by brand</span>
            </div>
          </div>
          <div className="card">
            <span className="pill">Launch Ready</span>
            <p className="subtitle">
              This MVP is intentionally lean. Next up: GHL workflows, inbox sync, and multi-location onboarding in one
              click.
            </p>
            <div className="hero-meta">
              <span>GHL native integration</span>
              <span>Neon analytics</span>
              <span>Groq smart replies</span>
            </div>
          </div>
        </section>

        <div className="footer">
          Built to feel premium from day one. You decide the voice, cadence, and conversion style.
        </div>
      </div>
    </main>
  );
}
