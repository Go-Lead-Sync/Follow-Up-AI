import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

export const customFieldsRouter = Router({ mergeParams: true });

customFieldsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "select * from custom_field_defs where sub_account_id=$1 order by name asc",
    [req.subAccount.id]
  );
  res.json(rows);
});

const FieldSchema = z.object({
  name: z.string().min(1),
  fieldKey: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "field_key must be lowercase snake_case"),
  type: z.enum(["text", "textarea", "number", "phone", "dropdown", "checkbox", "radio", "date", "monetary", "signature"]),
  options: z.array(z.string()).optional().nullable(),
});

customFieldsRouter.post("/", async (req, res) => {
  const parsed = FieldSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const d = parsed.data;
  const { rows } = await pool.query(
    `insert into custom_field_defs (sub_account_id, name, field_key, type, options)
     values ($1,$2,$3,$4,$5) returning *`,
    [req.subAccount.id, d.name, d.fieldKey, d.type, d.options ? JSON.stringify(d.options) : null]
  );
  res.json(rows[0]);
});

customFieldsRouter.put("/:fieldId", async (req, res) => {
  const parsed = FieldSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const existing = await pool.query("select * from custom_field_defs where id=$1 and sub_account_id=$2", [
    req.params.fieldId,
    req.subAccount.id,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const current = existing.rows[0];
  const d = parsed.data;
  const { rows } = await pool.query(
    `update custom_field_defs set name=$1, type=$2, options=$3 where id=$4 returning *`,
    [
      d.name ?? current.name,
      d.type ?? current.type,
      d.options ? JSON.stringify(d.options) : current.options,
      req.params.fieldId,
    ]
  );
  res.json(rows[0]);
});

customFieldsRouter.delete("/:fieldId", async (req, res) => {
  await pool.query("delete from custom_field_defs where id=$1 and sub_account_id=$2", [
    req.params.fieldId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});
