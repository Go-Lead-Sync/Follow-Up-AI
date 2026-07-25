import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

export const customValuesRouter = Router({ mergeParams: true });

customValuesRouter.get("/", async (req, res) => {
  const { rows } = await pool.query("select * from custom_values where sub_account_id=$1 order by key asc", [
    req.subAccount.id,
  ]);
  res.json(rows);
});

const ValueSchema = z.object({ key: z.string().min(1), value: z.string().optional().nullable() });

customValuesRouter.post("/", async (req, res) => {
  const parsed = ValueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { rows } = await pool.query(
    `insert into custom_values (sub_account_id, key, value) values ($1,$2,$3)
     on conflict (sub_account_id, key) do update set value=excluded.value returning *`,
    [req.subAccount.id, parsed.data.key, parsed.data.value ?? null]
  );
  res.json(rows[0]);
});

customValuesRouter.delete("/:valueId", async (req, res) => {
  await pool.query("delete from custom_values where id=$1 and sub_account_id=$2", [
    req.params.valueId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});
