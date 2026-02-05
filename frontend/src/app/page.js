"use client";

import { useEffect, useState } from "react";

const intents = [
  { value: "confirm", label: "Confirm" },
  { value: "reschedule", label: "Reschedule" },
  { value: "no_show", label: "No-show" },
  { value: "rebook", label: "Rebook" },
];

export default function Home() {
  const [active, setActive] = useState("business");
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    appointmentTime: "",
    channel: "sms",
    intent: "confirm",
  });
  const [business, setBusiness] = useState({
    id: "",
    name: "",
    tone: "",
    bookingLink: "",
    hours: "",
    policies: "",
    faqs: "",
  });
  const [contacts, setContacts] = useState([]);
  const [contactForm, setContactForm] = useState({
    businessId: "",
    name: "",
    email: "",
    phone: "",
    lastAppointment: "",
    status: "",
    notes: "",
  });
  const [workflow, setWorkflow] = useState({
    businessId: "",
    name: "Core Follow-Up",
    definition: {
      trigger: "appointment_created",
      steps: [
        { type: "message", channel: "sms", intent: "confirm" },
        { type: "wait", duration: "24h" },
        { type: "message", channel: "sms", intent: "no_show" },
      ],
    },
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  useEffect(() => {
    loadBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBusiness = async () => {
    const res = await fetch(`${apiBase}/api/business`);
    const data = await res.json();
    if (data?.id) {
      setBusiness({
        id: data.id,
        name: data.name || "",
        tone: data.tone || "",
        bookingLink: data.booking_link || "",
        hours: data.hours || "",
        policies: data.policies || "",
        faqs: data.faqs || "",
      });
      setContactForm((prev) => ({ ...prev, businessId: data.id }));
      setWorkflow((prev) => ({ ...prev, businessId: data.id }));
      const contactRes = await fetch(`${apiBase}/api/contacts?businessId=${data.id}`);
      setContacts(await contactRes.json());
    }
  };

  const saveBusiness = async () => {
    setLoading(true);
    setError("");
    try {
      const method = business.id ? "PUT" : "POST";
      const url = business.id ? `${apiBase}/api/business/${business.id}` : `${apiBase}/api/business`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      });
      const data = await response.json();
      if (data?.id) {
        setBusiness({
          id: data.id,
          name: data.name,
          tone: data.tone,
          bookingLink: data.booking_link || "",
          hours: data.hours || "",
          policies: data.policies || "",
          faqs: data.faqs || "",
        });
        setContactForm((prev) => ({ ...prev, businessId: data.id }));
        setWorkflow((prev) => ({ ...prev, businessId: data.id }));
      }
    } catch (err) {
      setError("Unable to save business profile.");
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const data = await response.json();
      if (data?.id) {
        setContacts((prev) => [data, ...prev]);
        setContactForm((prev) => ({ ...prev, name: "", email: "", phone: "", notes: "" }));
      }
    } catch (err) {
      setError("Unable to add contact.");
    } finally {
      setLoading(false);
    }
  };

  const saveWorkflow = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });
      await response.json();
    } catch (err) {
      setError("Unable to save workflow.");
    } finally {
      setLoading(false);
    }
  };

  const runPreview = async (contactId) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/prompt-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          contactId,
          intent: form.intent,
          channel: form.channel,
        }),
      });
      const data = await response.json();
      setPreview(data);
    } catch (err) {
      setError("Unable to preview AI prompt.");
    } finally {
      setLoading(false);
    }
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
        <div className="topbar">
          <div className="logo">
            <span className="logo-mark" />
            Follow-Up AI
          </div>
          <div className="nav">
            {["business", "contacts", "workflow", "preview"].map((key) => (
              <button
                key={key}
                type="button"
                className={active === key ? "active" : ""}
                onClick={() => {
                  setActive(key);
                  if (key === "business") {
                    loadBusiness();
                  }
                }}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {active === "business" && (
          <section className="card">
            <h2 className="section-title">Business Profile</h2>
            <div className="form-grid">
              <div>
                <label>Business Name</label>
                <input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
              </div>
              <div>
                <label>Tone</label>
                <input value={business.tone} onChange={(e) => setBusiness({ ...business, tone: e.target.value })} placeholder="Warm, confident, short sentences" />
              </div>
              <div>
                <label>Booking Link</label>
                <input value={business.bookingLink} onChange={(e) => setBusiness({ ...business, bookingLink: e.target.value })} />
              </div>
              <div>
                <label>Hours</label>
                <input value={business.hours} onChange={(e) => setBusiness({ ...business, hours: e.target.value })} placeholder="Mon-Fri 9am-6pm" />
              </div>
              <div>
                <label>Policies</label>
                <textarea rows={3} value={business.policies} onChange={(e) => setBusiness({ ...business, policies: e.target.value })} />
              </div>
              <div>
                <label>FAQs</label>
                <textarea rows={3} value={business.faqs} onChange={(e) => setBusiness({ ...business, faqs: e.target.value })} />
              </div>
            </div>
            <button className="cta" type="button" onClick={saveBusiness} disabled={loading}>
              {loading ? "Saving..." : "Save Business Profile"}
            </button>
          </section>
        )}

        {active === "contacts" && (
          <section className="grid">
            <div className="card">
              <h2 className="section-title">Add Contact</h2>
              <div className="form-grid">
                <div>
                  <label>Name</label>
                  <input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                </div>
                <div>
                  <label>Email</label>
                  <input value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div>
                  <label>Phone</label>
                  <input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                </div>
                <div>
                  <label>Last Appointment</label>
                  <input value={contactForm.lastAppointment} onChange={(e) => setContactForm({ ...contactForm, lastAppointment: e.target.value })} />
                </div>
                <div>
                  <label>Status</label>
                  <input value={contactForm.status} onChange={(e) => setContactForm({ ...contactForm, status: e.target.value })} placeholder="no-show, confirm, rebook" />
                </div>
                <div>
                  <label>Notes</label>
                  <textarea rows={3} value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} />
                </div>
              </div>
              <button className="cta" type="button" onClick={addContact} disabled={loading}>
                {loading ? "Adding..." : "Add Contact"}
              </button>
            </div>
            <div className="card">
              <h2 className="section-title">Contacts</h2>
              <div className="list">
                {contacts.length === 0 && <p className="small">No contacts yet. Add one to start AI previews.</p>}
                {contacts.map((c) => (
                  <div key={c.id} className="list-item">
                    <strong>{c.name}</strong>
                    <div className="small">{c.status || "status unknown"} · {c.last_appointment || "no appointment"}</div>
                    <div className="inline" style={{ marginTop: 8 }}>
                      <button type="button" className="pill" onClick={() => runPreview(c.id)}>Preview AI</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {active === "workflow" && (
          <section className="grid">
            <div className="card">
              <h2 className="section-title">Workflow Builder</h2>
              <div className="form-grid">
                <div>
                  <label>Workflow Name</label>
                  <input value={workflow.name} onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })} />
                </div>
                <div>
                  <label>Trigger</label>
                  <input
                    value={workflow.definition.trigger}
                    onChange={(e) =>
                      setWorkflow({
                        ...workflow,
                        definition: { ...workflow.definition, trigger: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <label style={{ marginTop: 14 }}>Steps (JSON)</label>
              <textarea
                rows={8}
                value={JSON.stringify(workflow.definition.steps, null, 2)}
                onChange={(e) =>
                  {
                    try {
                      const steps = JSON.parse(e.target.value || "[]");
                      setWorkflow({
                        ...workflow,
                        definition: { ...workflow.definition, steps },
                      });
                    } catch (err) {
                      setError("Invalid JSON in steps.");
                    }
                  }
                }
              />
              <button className="cta" type="button" onClick={saveWorkflow} disabled={loading}>
                {loading ? "Saving..." : "Save Workflow"}
              </button>
            </div>
            <div className="card">
              <h2 className="section-title">Flow Preview</h2>
              <div className="list">
                {workflow.definition.steps.map((step, idx) => (
                  <div key={idx} className="list-item">
                    <strong>{step.type}</strong>
                    <div className="small">{step.channel || step.duration || step.intent}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {active === "preview" && (
          <section className="grid">
            <div className="card">
              <h2 className="section-title">AI Prompt Preview</h2>
              <div className="form-grid">
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
              <div className="list" style={{ marginTop: 12 }}>
                {contacts.map((c) => (
                  <div key={c.id} className="list-item">
                    <strong>{c.name}</strong>
                    <div className="small">{c.status || "status unknown"}</div>
                    <button className="pill" type="button" onClick={() => runPreview(c.id)} style={{ marginTop: 8 }}>
                      Generate Preview
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="card output">
              <span className="pill">Prompt + Response</span>
              {error && <p>{error}</p>}
              {!error && !preview && <p>Select a contact to preview the AI prompt.</p>}
              {preview && (
                <>
                  <div className="message">
                    <strong>Prompt</strong>
                    <p className="small" style={{ whiteSpace: "pre-wrap" }}>{preview.prompt}</p>
                  </div>
                  <div className="message">
                    <strong>Response</strong>
                    <p>{preview.text}</p>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {error && <div className="footer">{error}</div>}
      </div>
    </main>
  );
}
