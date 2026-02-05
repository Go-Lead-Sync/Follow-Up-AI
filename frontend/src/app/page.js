"use client";

import { useEffect, useState } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

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
  const [workflowId, setWorkflowId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageForm, setMessageForm] = useState({
    businessId: "",
    contactId: "",
    direction: "outbound",
    channel: "sms",
    body: "",
    status: "queued",
    provider: "LeadConnector",
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
      setMessageForm((prev) => ({ ...prev, businessId: data.id }));
      const contactRes = await fetch(`${apiBase}/api/contacts?businessId=${data.id}`);
      setContacts(await contactRes.json());
      const workflowRes = await fetch(`${apiBase}/api/workflows?businessId=${data.id}`);
      const workflowList = await workflowRes.json();
      if (workflowList?.[0]) {
        setWorkflow({
          businessId: data.id,
          name: workflowList[0].name,
          definition: workflowList[0].definition,
        });
        setWorkflowId(workflowList[0].id);
      }
      const messageRes = await fetch(`${apiBase}/api/messages?businessId=${data.id}`);
      setMessages(await messageRes.json());
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

  const addMessage = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageForm),
      });
      const data = await response.json();
      if (data?.id) {
        setMessages((prev) => [data, ...prev]);
        setMessageForm((prev) => ({ ...prev, body: "" }));
      }
    } catch (err) {
      setError("Unable to log message.");
    } finally {
      setLoading(false);
    }
  };

  const saveWorkflow = async () => {
    setLoading(true);
    setError("");
    try {
      const url = workflowId ? `${apiBase}/api/workflows/${workflowId}` : `${apiBase}/api/workflows`;
      const method = workflowId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });
      const data = await response.json();
      if (data?.id) {
        setWorkflowId(data.id);
      }
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
            {["business", "contacts", "messages", "workflow", "preview", "leadconnector"].map((key) => (
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

        {active === "messages" && (
          <section className="grid">
            <div className="card">
              <h2 className="section-title">Log Message</h2>
              <div className="form-grid">
                <div>
                  <label>Contact</label>
                  <select
                    value={messageForm.contactId}
                    onChange={(e) => setMessageForm({ ...messageForm, contactId: e.target.value })}
                  >
                    <option value="">Select contact</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Direction</label>
                  <select
                    value={messageForm.direction}
                    onChange={(e) => setMessageForm({ ...messageForm, direction: e.target.value })}
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
                <div>
                  <label>Channel</label>
                  <select
                    value={messageForm.channel}
                    onChange={(e) => setMessageForm({ ...messageForm, channel: e.target.value })}
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <input value={messageForm.status} onChange={(e) => setMessageForm({ ...messageForm, status: e.target.value })} />
                </div>
                <div>
                  <label>Provider</label>
                  <input value={messageForm.provider} onChange={(e) => setMessageForm({ ...messageForm, provider: e.target.value })} />
                </div>
                <div>
                  <label>Message</label>
                  <textarea rows={3} value={messageForm.body} onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })} />
                </div>
              </div>
              <button className="cta" type="button" onClick={addMessage} disabled={loading || !messageForm.contactId}>
                {loading ? "Saving..." : "Log Message"}
              </button>
            </div>
            <div className="card">
              <h2 className="section-title">Message History</h2>
              <div className="list">
                {messages.length === 0 && <p className="small">No messages logged yet.</p>}
                {messages.map((m) => (
                  <div key={m.id} className="message-card">
                    <div className="inline">
                      <span className="chip">{m.direction}</span>
                      <span className="chip">{m.channel}</span>
                      <span className="small">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <strong>{m.body}</strong>
                    <small>{m.status || "status unknown"} · {m.provider || "LeadConnector"}</small>
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
              <h2 className="section-title">Visual Flow</h2>
              <div className="flow-wrap">
                <ReactFlow
                  fitView
                  nodes={[
                    { id: "trigger", position: { x: 50, y: 80 }, data: { label: "Trigger: Appointment" }, type: "input" },
                    { id: "confirm", position: { x: 320, y: 40 }, data: { label: "Send: Confirm SMS" } },
                    { id: "wait", position: { x: 320, y: 160 }, data: { label: "Wait 24h" } },
                    { id: "recover", position: { x: 600, y: 120 }, data: { label: "No-show Recovery" }, type: "output" },
                  ]}
                  edges={[
                    { id: "e1", source: "trigger", target: "confirm" },
                    { id: "e2", source: "confirm", target: "wait" },
                    { id: "e3", source: "wait", target: "recover" },
                  ]}
                >
                  <Background gap={16} />
                  <Controls />
                </ReactFlow>
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

        {active === "leadconnector" && (
          <section className="grid">
            <div className="card">
              <h2 className="section-title">LeadConnector Integration</h2>
              <p className="subtitle">
                OAuth is required to connect LeadConnector. Once you create the OAuth app, we will store the credentials
                and enable live message sync + workflow triggers.
              </p>
              <div className="panel">
                <div className="small">Required fields (pending OAuth)</div>
                <div className="list">
                  <div className="list-item">LeadConnector Client ID</div>
                  <div className="list-item">LeadConnector Client Secret</div>
                  <div className="list-item">Redirect URL</div>
                </div>
              </div>
            </div>
            <div className="card">
              <h2 className="section-title">What We’ll Enable</h2>
              <div className="timeline">
                <div className="timeline-item">Sync contacts and calendars</div>
                <div className="timeline-item">Inbound/outbound SMS + email history</div>
                <div className="timeline-item">Trigger workflows on appointment events</div>
                <div className="timeline-item">AI responses using business + contact context</div>
              </div>
            </div>
          </section>
        )}

        {error && <div className="footer">{error}</div>}
      </div>
    </main>
  );
}
