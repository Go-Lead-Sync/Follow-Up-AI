import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

export const pipelinesRouter = Router({ mergeParams: true });

async function withStages(pipeline) {
  const stages = await pool.query("select * from pipeline_stages where pipeline_id=$1 order by position asc", [
    pipeline.id,
  ]);
  return { ...pipeline, stages: stages.rows };
}

pipelinesRouter.get("/", async (req, res) => {
  const { rows } = await pool.query("select * from pipelines where sub_account_id=$1 order by created_at asc", [
    req.subAccount.id,
  ]);
  res.json(await Promise.all(rows.map(withStages)));
});

const PipelineSchema = z.object({
  name: z.string().min(1),
  stages: z.array(z.string().min(1)).min(1),
});

pipelinesRouter.post("/", async (req, res) => {
  const parsed = PipelineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const pipelineRes = await client.query(
      "insert into pipelines (sub_account_id, name) values ($1,$2) returning *",
      [req.subAccount.id, parsed.data.name]
    );
    const pipeline = pipelineRes.rows[0];
    for (let i = 0; i < parsed.data.stages.length; i++) {
      await client.query("insert into pipeline_stages (pipeline_id, name, position) values ($1,$2,$3)", [
        pipeline.id,
        parsed.data.stages[i],
        i,
      ]);
    }
    await client.query("commit");
    res.json(await withStages(pipeline));
  } catch (err) {
    await client.query("rollback");
    res.status(500).json({ error: "create_failed" });
  } finally {
    client.release();
  }
});

pipelinesRouter.put("/:pipelineId", async (req, res) => {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { rows } = await pool.query(
    "update pipelines set name=$1 where id=$2 and sub_account_id=$3 returning *",
    [parsed.data.name, req.params.pipelineId, req.subAccount.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "not_found" });
  res.json(await withStages(rows[0]));
});

pipelinesRouter.delete("/:pipelineId", async (req, res) => {
  await pool.query("delete from pipelines where id=$1 and sub_account_id=$2", [
    req.params.pipelineId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});

pipelinesRouter.post("/:pipelineId/stages", async (req, res) => {
  const schema = z.object({ name: z.string().min(1), position: z.number().int().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const countRes = await pool.query("select count(*)::int as count from pipeline_stages where pipeline_id=$1", [
    req.params.pipelineId,
  ]);
  const { rows } = await pool.query(
    "insert into pipeline_stages (pipeline_id, name, position) values ($1,$2,$3) returning *",
    [req.params.pipelineId, parsed.data.name, parsed.data.position ?? countRes.rows[0].count]
  );
  res.json(rows[0]);
});

pipelinesRouter.delete("/:pipelineId/stages/:stageId", async (req, res) => {
  await pool.query("delete from pipeline_stages where id=$1 and pipeline_id=$2", [
    req.params.stageId,
    req.params.pipelineId,
  ]);
  res.json({ ok: true });
});
