import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { advanceEnrollment, processDueEnrollments } from "../lib/workflowEngine.js";

export const workflowsRouter = Router({ mergeParams: true });

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

workflowsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query("select * from workflows where sub_account_id=$1 order by created_at desc", [
    req.subAccount.id,
  ]);
  res.json(rows);
});

const WorkflowSchema = z.object({
  name: z.string().min(1),
  triggerType: z.enum(TRIGGER_TYPES),
  triggerConfig: z.record(z.unknown()).optional().default({}),
  steps: z.array(z.unknown()).default([]),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  allowReentry: z.boolean().optional().default(false),
  stopOnResponse: z.boolean().optional().default(true),
});

workflowsRouter.post("/", async (req, res) => {
  const parsed = WorkflowSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const d = parsed.data;
  const { rows } = await pool.query(
    `insert into workflows (sub_account_id, name, trigger_type, trigger_config, steps, status, allow_reentry, stop_on_response)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [
      req.subAccount.id,
      d.name,
      d.triggerType,
      JSON.stringify(d.triggerConfig),
      JSON.stringify(d.steps),
      d.status,
      d.allowReentry,
      d.stopOnResponse,
    ]
  );
  res.json(rows[0]);
});

workflowsRouter.put("/:workflowId", async (req, res) => {
  const parsed = WorkflowSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const existing = await pool.query("select * from workflows where id=$1 and sub_account_id=$2", [
    req.params.workflowId,
    req.subAccount.id,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const current = existing.rows[0];
  const d = parsed.data;
  const { rows } = await pool.query(
    `update workflows set name=$1, trigger_type=$2, trigger_config=$3, steps=$4, status=$5, allow_reentry=$6, stop_on_response=$7
     where id=$8 returning *`,
    [
      d.name ?? current.name,
      d.triggerType ?? current.trigger_type,
      d.triggerConfig ? JSON.stringify(d.triggerConfig) : current.trigger_config,
      d.steps ? JSON.stringify(d.steps) : current.steps,
      d.status ?? current.status,
      d.allowReentry ?? current.allow_reentry,
      d.stopOnResponse ?? current.stop_on_response,
      req.params.workflowId,
    ]
  );
  res.json(rows[0]);
});

workflowsRouter.delete("/:workflowId", async (req, res) => {
  await pool.query("delete from workflows where id=$1 and sub_account_id=$2", [
    req.params.workflowId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});

workflowsRouter.get("/:workflowId/enrollments", async (req, res) => {
  const { rows } = await pool.query(
    `select we.*, c.name as contact_name from workflow_enrollments we
     join contacts c on c.id = we.contact_id where we.workflow_id=$1 order by we.updated_at desc`,
    [req.params.workflowId]
  );
  res.json(rows);
});

workflowsRouter.post("/:workflowId/enroll", async (req, res) => {
  const schema = z.object({ contactId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const workflowRes = await pool.query("select * from workflows where id=$1 and sub_account_id=$2", [
    req.params.workflowId,
    req.subAccount.id,
  ]);
  if (!workflowRes.rows[0]) return res.status(404).json({ error: "not_found" });
  const contactRes = await pool.query("select * from contacts where id=$1 and sub_account_id=$2", [
    parsed.data.contactId,
    req.subAccount.id,
  ]);
  if (!contactRes.rows[0]) return res.status(404).json({ error: "contact_not_found" });

  const inserted = await pool.query(
    `insert into workflow_enrollments (workflow_id, contact_id, step_index, status)
     values ($1,$2,0,'active') returning *`,
    [req.params.workflowId, parsed.data.contactId]
  );
  await advanceEnrollment(inserted.rows[0], workflowRes.rows[0], contactRes.rows[0]);
  const refreshed = await pool.query("select * from workflow_enrollments where id=$1", [inserted.rows[0].id]);
  res.json(refreshed.rows[0]);
});

// Advances any enrollments whose "wait" step has elapsed. Call this from an
// external cron (e.g. every few minutes) if you don't want to rely solely on
// the in-process interval started in index.js.
workflowsRouter.post("/tick", async (req, res) => {
  const processed = await processDueEnrollments();
  res.json({ processed });
});
