"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { subAccountApi } from "../../../lib/api";

export default function PipelinesPage() {
  const { subAccountId } = useAuth();
  const [pipelines, setPipelines] = useState([]);
  const [activePipelineId, setActivePipelineId] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStages, setNewStages] = useState("New, Contacted, Booked, Won");
  const [oppForm, setOppForm] = useState({ name: "", value: "", contactId: "" });
  const [dragId, setDragId] = useState(null);

  const api = subAccountId ? subAccountApi(subAccountId) : null;
  const activePipeline = pipelines.find((p) => p.id === activePipelineId);

  const load = async () => {
    if (!api) return;
    const list = await api.get("/pipelines");
    setPipelines(list);
    if (!activePipelineId && list[0]) setActivePipelineId(list[0].id);
    setContacts(await api.get("/contacts"));
  };

  const loadOpportunities = async () => {
    if (!api || !activePipelineId) return;
    setOpportunities(await api.get(`/opportunities?pipelineId=${activePipelineId}`));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAccountId]);

  useEffect(() => {
    loadOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePipelineId, subAccountId]);

  const createPipeline = async (event) => {
    event.preventDefault();
    if (!api || !newPipelineName.trim()) return;
    const stages = newStages.split(",").map((s) => s.trim()).filter(Boolean);
    const created = await api.post("/pipelines", { name: newPipelineName, stages });
    setNewPipelineName("");
    await load();
    setActivePipelineId(created.id);
  };

  const createOpportunity = async (event) => {
    event.preventDefault();
    if (!api || !activePipeline) return;
    await api.post("/opportunities", {
      pipelineId: activePipeline.id,
      stageId: activePipeline.stages[0].id,
      contactId: oppForm.contactId || null,
      name: oppForm.name,
      value: oppForm.value ? Number(oppForm.value) : null,
    });
    setOppForm({ name: "", value: "", contactId: "" });
    await loadOpportunities();
  };

  const moveStage = async (opportunityId, stageId) => {
    if (!api) return;
    await api.put(`/opportunities/${opportunityId}`, { stageId });
    await loadOpportunities();
  };

  const setStatus = async (opportunityId, status) => {
    if (!api) return;
    await api.post(`/opportunities/${opportunityId}/status`, { status });
    await loadOpportunities();
  };

  return (
    <section>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="inline">
            {pipelines.map((p) => (
              <button
                key={p.id}
                type="button"
                className={p.id === activePipelineId ? "pill" : "ghost"}
                onClick={() => setActivePipelineId(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={createPipeline} className="form-grid" style={{ marginTop: 16 }}>
          <div>
            <label>New Pipeline Name</label>
            <input value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} placeholder="Sales" />
          </div>
          <div>
            <label>Stages (comma separated)</label>
            <input value={newStages} onChange={(e) => setNewStages(e.target.value)} />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="cta" type="submit" style={{ marginTop: 0 }}>Create Pipeline</button>
          </div>
        </form>
      </div>

      {activePipeline && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 className="section-title">New Opportunity in {activePipeline.name}</h2>
            <form onSubmit={createOpportunity} className="form-grid">
              <div>
                <label>Name</label>
                <input required value={oppForm.name} onChange={(e) => setOppForm({ ...oppForm, name: e.target.value })} />
              </div>
              <div>
                <label>Value ($)</label>
                <input value={oppForm.value} onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })} />
              </div>
              <div>
                <label>Contact</label>
                <select value={oppForm.contactId} onChange={(e) => setOppForm({ ...oppForm, contactId: e.target.value })}>
                  <option value="">No contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ alignSelf: "end" }}>
                <button className="cta" type="submit" style={{ marginTop: 0 }}>Add Opportunity</button>
              </div>
            </form>
          </div>

          <div className="kanban">
            {activePipeline.stages.map((stage) => (
              <div
                key={stage.id}
                className="kanban-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragId && moveStage(dragId, stage.id)}
              >
                <div className="kanban-col-title">{stage.name}</div>
                <div className="list">
                  {opportunities
                    .filter((o) => o.stage_id === stage.id)
                    .map((o) => (
                      <div
                        key={o.id}
                        className="list-item"
                        draggable
                        onDragStart={() => setDragId(o.id)}
                        style={{ cursor: "grab" }}
                      >
                        <strong>{o.name}</strong>
                        <div className="small">
                          {o.value ? `$${o.value}` : "no value"} &middot; {o.status}
                        </div>
                        {o.status === "open" && (
                          <div className="inline" style={{ marginTop: 8 }}>
                            <button type="button" className="pill" onClick={() => setStatus(o.id, "won")}>Won</button>
                            <button type="button" className="pill" onClick={() => setStatus(o.id, "lost")}>Lost</button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
