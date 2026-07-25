"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import { useAuth } from "../../../context/AuthContext";
import { subAccountApi } from "../../../lib/api";

const TRIGGER_TYPES = [
  "contact_created",
  "contact_changed",
  "tag_added",
  "tag_removed",
  "pipeline_stage_changed",
  "opportunity_status_changed",
  "appointment_created",
  "appointment_status_changed",
  "message_received",
  "manual",
];

const DEFAULT_STEPS = [
  { type: "send_sms", body: "Hi {{first_name}}, thanks for reaching out to {{business_name}}!" },
  { type: "wait", duration: "24h" },
  { type: "if_reply" },
  { type: "add_tag", tag: "contacted" },
];

function stepLabel(step) {
  switch (step.type) {
    case "send_sms": return "Send SMS";
    case "send_email": return "Send Email";
    case "add_tag": return `Add Tag: ${step.tag || "?"}`;
    case "remove_tag": return `Remove Tag: ${step.tag || "?"}`;
    case "wait": return `Wait ${step.duration || "24h"}`;
    case "if_reply": return "Wait for Reply";
    case "if_else": return "If / Else";
    case "update_field": return `Set ${step.field || "field"}`;
    case "create_opportunity": return "Create Opportunity";
    case "move_stage": return `Move to ${step.stage || "stage"}`;
    case "webhook": return "Send Webhook";
    case "note": return "Add Note";
    case "end": return "End Workflow";
    default: return step.type;
  }
}

export default function WorkflowsPage() {
  const { subAccountId } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState({ name: "", triggerType: "contact_created", status: "draft" });
  const [stepsText, setStepsText] = useState(JSON.stringify(DEFAULT_STEPS, null, 2));
  const [contacts, setContacts] = useState([]);
  const [enrollContactId, setEnrollContactId] = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const api = subAccountId ? subAccountApi(subAccountId) : null;
  const active = workflows.find((w) => w.id === activeId);

  const load = async () => {
    if (!api) return;
    setWorkflows(await api.get("/workflows"));
    setContacts(await api.get("/contacts"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAccountId]);

  useEffect(() => {
    if (active) {
      setForm({ name: active.name, triggerType: active.trigger_type, status: active.status });
      setStepsText(JSON.stringify(active.steps, null, 2));
      loadEnrollments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const loadEnrollments = async () => {
    if (!api || !activeId) return;
    setEnrollments(await api.get(`/workflows/${activeId}/enrollments`));
  };

  const parsedSteps = useMemo(() => {
    try {
      return JSON.parse(stepsText || "[]");
    } catch {
      return null;
    }
  }, [stepsText]);

  const save = async () => {
    if (!api) return;
    setError("");
    if (!parsedSteps) {
      setError("Steps must be valid JSON.");
      return;
    }
    const payload = { ...form, steps: parsedSteps };
    try {
      if (activeId) {
        await api.put(`/workflows/${activeId}`, payload);
      } else {
        const created = await api.post("/workflows", payload);
        setActiveId(created.id);
      }
      await load();
      setStatus("Saved.");
    } catch {
      setError("Unable to save workflow.");
    }
  };

  const createNew = () => {
    setActiveId(null);
    setForm({ name: "New Workflow", triggerType: "contact_created", status: "draft" });
    setStepsText(JSON.stringify(DEFAULT_STEPS, null, 2));
    setEnrollments([]);
  };

  const enroll = async () => {
    if (!api || !activeId || !enrollContactId) return;
    await api.post(`/workflows/${activeId}/enroll`, { contactId: enrollContactId });
    setStatus("Enrolled and advanced.");
    await loadEnrollments();
  };

  const nodes = [
    { id: "trigger", position: { x: 40, y: 40 }, data: { label: `Trigger: ${form.triggerType}` }, type: "input" },
    ...(parsedSteps || []).map((step, i) => ({
      id: `step-${i}`,
      position: { x: 40, y: 140 + i * 90 },
      data: { label: stepLabel(step) },
      type: i === (parsedSteps.length - 1) ? "output" : undefined,
    })),
  ];
  const edges = (parsedSteps || []).map((_, i) => ({
    id: `e-${i}`,
    source: i === 0 ? "trigger" : `step-${i - 1}`,
    target: `step-${i}`,
  }));

  return (
    <section className="grid">
      <div className="card">
        <div className="inline" style={{ justifyContent: "space-between" }}>
          <h2 className="section-title">Workflows</h2>
          <button className="pill" type="button" onClick={createNew}>+ New</button>
        </div>
        <div className="list">
          {workflows.map((w) => (
            <div key={w.id} className="list-item" style={{ cursor: "pointer" }} onClick={() => setActiveId(w.id)}>
              <strong>{w.name}</strong>
              <div className="small">{w.trigger_type} &middot; {w.status}</div>
            </div>
          ))}
        </div>

        <h2 className="section-title" style={{ marginTop: 20 }}>{activeId ? "Edit Workflow" : "New Workflow"}</h2>
        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label>Trigger</label>
            <select value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value })}>
              {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <label style={{ marginTop: 14 }}>Steps (JSON)</label>
        <textarea rows={10} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />
        <button className="cta" type="button" onClick={save}>Save Workflow</button>
        {error && <div className="footer">{error}</div>}
        {status && <div className="status" style={{ marginTop: 10 }}>{status}</div>}

        {activeId && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="small">Manually enroll a contact (for testing)</div>
            <div className="inline" style={{ marginTop: 8 }}>
              <select value={enrollContactId} onChange={(e) => setEnrollContactId(e.target.value)}>
                <option value="">Select contact</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="pill" type="button" onClick={enroll}>Enroll</button>
            </div>
            <div className="list" style={{ marginTop: 12 }}>
              {enrollments.map((e) => (
                <div key={e.id} className="list-item">
                  <strong>{e.contact_name}</strong>
                  <div className="small">step {e.step_index} &middot; {e.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Visual Flow</h2>
        <div className="flow-wrap">
          <ReactFlow fitView nodes={nodes} edges={edges}>
            <Background gap={16} />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </section>
  );
}
