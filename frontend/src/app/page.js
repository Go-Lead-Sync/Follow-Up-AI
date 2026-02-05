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
            <p className="badge">Follow-Up AI MVP</p>
            <h1 className="brand">Automated follow-ups that reschedule, recover, and rebook.</h1>
            <p className="subtitle">
              Generate SMS and email follow-ups for confirmations, reschedules, no-shows, and rebook flows.
            </p>
          </div>
          <div className="card">
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
              <button type="submit" disabled={loading}>
                {loading ? "Composing..." : "Generate Follow-Up"}
              </button>
            </form>
          </div>
        </section>

        <section className="card output">
          <strong>Generated Message</strong>
          {error && <p>{error}</p>}
          {!error && !result && <p>Run the generator to preview the follow-up message.</p>}
          {result && (
            <>
              <span className="badge">{result.channel?.toUpperCase()}</span>
              <p>{result.text}</p>
            </>
          )}
        </section>

        <footer>
          This MVP is intentionally lightweight. Next steps: client onboarding, templates, and GHL integrations.
        </footer>
      </div>
    </main>
  );
}
