import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

export const smartListsRouter = Router({ mergeParams: true });

smartListsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query("select * from smart_lists where sub_account_id=$1 order by name asc", [
    req.subAccount.id,
  ]);
  res.json(rows);
});

const FilterSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["equals", "not_equals", "contains", "is_empty", "not_empty", "has_tag", "not_has_tag"]),
  value: z.string().optional().nullable(),
});

const SmartListSchema = z.object({
  name: z.string().min(1),
  filters: z.array(FilterSchema).default([]),
});

smartListsRouter.post("/", async (req, res) => {
  const parsed = SmartListSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const { rows } = await pool.query(
    "insert into smart_lists (sub_account_id, name, filters) values ($1,$2,$3) returning *",
    [req.subAccount.id, parsed.data.name, JSON.stringify(parsed.data.filters)]
  );
  res.json(rows[0]);
});

smartListsRouter.put("/:listId", async (req, res) => {
  const parsed = SmartListSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const { rows } = await pool.query(
    "update smart_lists set name=$1, filters=$2 where id=$3 and sub_account_id=$4 returning *",
    [parsed.data.name, JSON.stringify(parsed.data.filters), req.params.listId, req.subAccount.id]
  );
  res.json(rows[0] || null);
});

smartListsRouter.delete("/:listId", async (req, res) => {
  await pool.query("delete from smart_lists where id=$1 and sub_account_id=$2", [
    req.params.listId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});

function matches(contact, tagNames, filter) {
  const { field, op, value } = filter;
  if (field === "tag") {
    const hasTag = tagNames.includes(value);
    return op === "not_has_tag" ? !hasTag : hasTag;
  }
  const actual = contact[field];
  switch (op) {
    case "equals":
      return String(actual || "") === String(value || "");
    case "not_equals":
      return String(actual || "") !== String(value || "");
    case "contains":
      return String(actual || "").toLowerCase().includes(String(value || "").toLowerCase());
    case "is_empty":
      return !actual;
    case "not_empty":
      return Boolean(actual);
    default:
      return true;
  }
}

smartListsRouter.get("/:listId/contacts", async (req, res) => {
  const listRes = await pool.query("select * from smart_lists where id=$1 and sub_account_id=$2", [
    req.params.listId,
    req.subAccount.id,
  ]);
  if (!listRes.rows[0]) return res.status(404).json({ error: "not_found" });
  const filters = listRes.rows[0].filters || [];

  const contactsRes = await pool.query("select * from contacts where sub_account_id=$1", [req.subAccount.id]);
  const tagsRes = await pool.query(
    `select ct.contact_id, t.name from contact_tags ct
     join tags t on t.id=ct.tag_id join contacts c on c.id=ct.contact_id
     where c.sub_account_id=$1`,
    [req.subAccount.id]
  );
  const tagsByContact = new Map();
  for (const row of tagsRes.rows) {
    if (!tagsByContact.has(row.contact_id)) tagsByContact.set(row.contact_id, []);
    tagsByContact.get(row.contact_id).push(row.name);
  }

  const results = contactsRes.rows.filter((contact) => {
    const tagNames = tagsByContact.get(contact.id) || [];
    return filters.every((filter) => matches(contact, tagNames, filter));
  });
  res.json(results);
});
