import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { processTrigger } from "../lib/workflowEngine.js";

export const opportunitiesRouter = Router({ mergeParams: true });

opportunitiesRouter.get("/", async (req, res) => {
  const { pipelineId, status } = req.query;
  const params = [req.subAccount.id];
  let where = "sub_account_id=$1";
  if (pipelineId) {
    params.push(pipelineId);
    where += ` and pipeline_id=$${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` and status=$${params.length}`;
  }
  const { rows } = await pool.query(`select * from opportunities where ${where} order by created_at desc`, params);
  res.json(rows);
});

const OpportunitySchema = z.object({
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  contactId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  value: z.number().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  closeDate: z.string().optional().nullable(),
});

opportunitiesRouter.post("/", async (req, res) => {
  const parsed = OpportunitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const d = parsed.data;
  const { rows } = await pool.query(
    `insert into opportunities (sub_account_id, pipeline_id, stage_id, contact_id, name, value, assigned_user_id, close_date)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [req.subAccount.id, d.pipelineId, d.stageId, d.contactId || null, d.name, d.value ?? null, d.assignedUserId || null, d.closeDate || null]
  );
  res.json(rows[0]);
});

opportunitiesRouter.put("/:opportunityId", async (req, res) => {
  const parsed = OpportunitySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const existing = await pool.query("select * from opportunities where id=$1 and sub_account_id=$2", [
    req.params.opportunityId,
    req.subAccount.id,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const current = existing.rows[0];
  const d = parsed.data;
  const stageChanged = d.stageId && d.stageId !== current.stage_id;
  const { rows } = await pool.query(
    `update opportunities set pipeline_id=$1, stage_id=$2, contact_id=$3, name=$4, value=$5, assigned_user_id=$6, close_date=$7
     where id=$8 returning *`,
    [
      d.pipelineId ?? current.pipeline_id,
      d.stageId ?? current.stage_id,
      d.contactId !== undefined ? d.contactId : current.contact_id,
      d.name ?? current.name,
      d.value !== undefined ? d.value : current.value,
      d.assignedUserId !== undefined ? d.assignedUserId : current.assigned_user_id,
      d.closeDate !== undefined ? d.closeDate : current.close_date,
      req.params.opportunityId,
    ]
  );
  const updated = rows[0];
  if (stageChanged && updated.contact_id) {
    const contactRes = await pool.query("select * from contacts where id=$1", [updated.contact_id]);
    if (contactRes.rows[0]) {
      processTrigger(req.subAccount.id, "pipeline_stage_changed", contactRes.rows[0]).catch(() => {});
    }
  }
  res.json(updated);
});

opportunitiesRouter.post("/:opportunityId/status", async (req, res) => {
  const schema = z.object({ status: z.enum(["open", "won", "lost", "abandoned"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { rows } = await pool.query(
    "update opportunities set status=$1 where id=$2 and sub_account_id=$3 returning *",
    [parsed.data.status, req.params.opportunityId, req.subAccount.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "not_found" });
  if (rows[0].contact_id) {
    const contactRes = await pool.query("select * from contacts where id=$1", [rows[0].contact_id]);
    if (contactRes.rows[0]) {
      processTrigger(req.subAccount.id, "opportunity_status_changed", contactRes.rows[0]).catch(() => {});
    }
  }
  res.json(rows[0]);
});

opportunitiesRouter.delete("/:opportunityId", async (req, res) => {
  await pool.query("delete from opportunities where id=$1 and sub_account_id=$2", [
    req.params.opportunityId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});
