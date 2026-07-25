import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

export const tagsRouter = Router({ mergeParams: true });

tagsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `select t.*, count(ct.contact_id)::int as contact_count
     from tags t left join contact_tags ct on ct.tag_id=t.id
     where t.sub_account_id=$1 group by t.id order by t.name asc`,
    [req.subAccount.id]
  );
  res.json(rows);
});

tagsRouter.post("/", async (req, res) => {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { rows } = await pool.query(
    `insert into tags (sub_account_id, name) values ($1,$2)
     on conflict (sub_account_id, name) do update set name=excluded.name returning *`,
    [req.subAccount.id, parsed.data.name]
  );
  res.json(rows[0]);
});

tagsRouter.delete("/:tagId", async (req, res) => {
  await pool.query("delete from tags where id=$1 and sub_account_id=$2", [req.params.tagId, req.subAccount.id]);
  res.json({ ok: true });
});
