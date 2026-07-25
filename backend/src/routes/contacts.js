import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { processTrigger } from "../lib/workflowEngine.js";
import { logAudit } from "../middleware/auth.js";

export const contactsRouter = Router({ mergeParams: true });

async function withTagsAndFields(contact) {
  if (!contact) return contact;
  const tags = await pool.query(
    "select t.name from contact_tags ct join tags t on t.id=ct.tag_id where ct.contact_id=$1",
    [contact.id]
  );
  const fields = await pool.query(
    `select f.field_key, f.name, v.value from contact_field_values v
     join custom_field_defs f on f.id=v.field_id where v.contact_id=$1`,
    [contact.id]
  );
  return { ...contact, tags: tags.rows.map((r) => r.name), customFields: fields.rows };
}

contactsRouter.get("/", async (req, res) => {
  const { tag, status } = req.query;
  const params = [req.subAccount.id];
  let where = "c.sub_account_id=$1";
  let join = "";
  if (tag) {
    join = "join contact_tags ct on ct.contact_id=c.id join tags t on t.id=ct.tag_id";
    params.push(tag);
    where += ` and t.name=$${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` and c.status=$${params.length}`;
  }
  const { rows } = await pool.query(
    `select distinct c.* from contacts c ${join} where ${where} order by c.created_at desc`,
    params
  );
  const withExtras = await Promise.all(rows.map(withTagsAndFields));
  res.json(withExtras);
});

contactsRouter.get("/:contactId", async (req, res) => {
  const { rows } = await pool.query("select * from contacts where id=$1 and sub_account_id=$2", [
    req.params.contactId,
    req.subAccount.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "not_found" });
  res.json(await withTagsAndFields(rows[0]));
});

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lastAppointment: z.string().optional().nullable(),
  dndSms: z.boolean().optional(),
  dndEmail: z.boolean().optional(),
  dndCall: z.boolean().optional(),
});

contactsRouter.post("/", async (req, res) => {
  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const { rows } = await pool.query(
    `insert into contacts (sub_account_id, name, email, phone, address, timezone, source, status, notes, last_appointment, dnd_sms, dnd_email, dnd_call)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
    [
      req.subAccount.id,
      d.name,
      d.email || null,
      d.phone || null,
      d.address || null,
      d.timezone || null,
      d.source || null,
      d.status || null,
      d.notes || null,
      d.lastAppointment || null,
      Boolean(d.dndSms),
      Boolean(d.dndEmail),
      Boolean(d.dndCall),
    ]
  );
  const contact = rows[0];
  await logAudit({ subAccountId: req.subAccount.id, userId: req.user.id, action: "contact_created", entityType: "contact", entityId: contact.id });
  processTrigger(req.subAccount.id, "contact_created", contact).catch(() => {});
  res.json(await withTagsAndFields(contact));
});

contactsRouter.put("/:contactId", async (req, res) => {
  const parsed = ContactSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const existing = await pool.query("select * from contacts where id=$1 and sub_account_id=$2", [
    req.params.contactId,
    req.subAccount.id,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const current = existing.rows[0];
  const d = { ...current, ...parsed.data };
  const { rows } = await pool.query(
    `update contacts set name=$1, email=$2, phone=$3, address=$4, timezone=$5, source=$6, status=$7, notes=$8,
       last_appointment=$9, dnd_sms=$10, dnd_email=$11, dnd_call=$12
     where id=$13 returning *`,
    [
      d.name,
      d.email,
      d.phone,
      d.address,
      d.timezone,
      d.source,
      d.status,
      d.notes,
      d.last_appointment ?? d.lastAppointment,
      d.dnd_sms ?? d.dndSms,
      d.dnd_email ?? d.dndEmail,
      d.dnd_call ?? d.dndCall,
      req.params.contactId,
    ]
  );
  await processTrigger(req.subAccount.id, "contact_changed", rows[0]).catch(() => {});
  res.json(await withTagsAndFields(rows[0]));
});

contactsRouter.delete("/:contactId", async (req, res) => {
  await pool.query("delete from contacts where id=$1 and sub_account_id=$2", [
    req.params.contactId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});

contactsRouter.post("/:contactId/tags", async (req, res) => {
  const schema = z.object({ tag: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const contactRes = await pool.query("select * from contacts where id=$1 and sub_account_id=$2", [
    req.params.contactId,
    req.subAccount.id,
  ]);
  if (!contactRes.rows[0]) return res.status(404).json({ error: "not_found" });
  const tagRes = await pool.query(
    `insert into tags (sub_account_id, name) values ($1,$2) on conflict (sub_account_id, name) do update set name=excluded.name returning *`,
    [req.subAccount.id, parsed.data.tag]
  );
  await pool.query("insert into contact_tags (contact_id, tag_id) values ($1,$2) on conflict do nothing", [
    req.params.contactId,
    tagRes.rows[0].id,
  ]);
  await processTrigger(req.subAccount.id, "tag_added", contactRes.rows[0]).catch(() => {});
  res.json(await withTagsAndFields(contactRes.rows[0]));
});

contactsRouter.delete("/:contactId/tags/:tagName", async (req, res) => {
  const contactRes = await pool.query("select * from contacts where id=$1 and sub_account_id=$2", [
    req.params.contactId,
    req.subAccount.id,
  ]);
  if (!contactRes.rows[0]) return res.status(404).json({ error: "not_found" });
  await pool.query(
    `delete from contact_tags where contact_id=$1 and tag_id=(select id from tags where sub_account_id=$2 and name=$3)`,
    [req.params.contactId, req.subAccount.id, req.params.tagName]
  );
  await processTrigger(req.subAccount.id, "tag_removed", contactRes.rows[0]).catch(() => {});
  res.json(await withTagsAndFields(contactRes.rows[0]));
});

contactsRouter.put("/:contactId/fields/:fieldKey", async (req, res) => {
  const schema = z.object({ value: z.string().optional().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const fieldRes = await pool.query("select * from custom_field_defs where sub_account_id=$1 and field_key=$2", [
    req.subAccount.id,
    req.params.fieldKey,
  ]);
  if (!fieldRes.rows[0]) return res.status(404).json({ error: "field_not_found" });
  await pool.query(
    `insert into contact_field_values (contact_id, field_id, value) values ($1,$2,$3)
     on conflict (contact_id, field_id) do update set value=excluded.value`,
    [req.params.contactId, fieldRes.rows[0].id, parsed.data.value ?? null]
  );
  const contactRes = await pool.query("select * from contacts where id=$1", [req.params.contactId]);
  res.json(await withTagsAndFields(contactRes.rows[0]));
});

contactsRouter.post("/bulk", async (req, res) => {
  const schema = z.object({
    ids: z.array(z.string().uuid()).min(1),
    action: z.enum(["add_tag", "remove_tag", "delete", "set_status"]),
    value: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { ids, action, value } = parsed.data;

  if (action === "delete") {
    await pool.query("delete from contacts where sub_account_id=$1 and id = any($2)", [req.subAccount.id, ids]);
  } else if (action === "set_status") {
    await pool.query("update contacts set status=$1 where sub_account_id=$2 and id = any($3)", [
      value || null,
      req.subAccount.id,
      ids,
    ]);
  } else if (action === "add_tag" || action === "remove_tag") {
    if (!value) return res.status(400).json({ error: "value_required" });
    if (action === "add_tag") {
      const tagRes = await pool.query(
        `insert into tags (sub_account_id, name) values ($1,$2) on conflict (sub_account_id, name) do update set name=excluded.name returning *`,
        [req.subAccount.id, value]
      );
      for (const id of ids) {
        await pool.query("insert into contact_tags (contact_id, tag_id) values ($1,$2) on conflict do nothing", [
          id,
          tagRes.rows[0].id,
        ]);
      }
    } else {
      await pool.query(
        `delete from contact_tags where contact_id = any($1) and tag_id=(select id from tags where sub_account_id=$2 and name=$3)`,
        [ids, req.subAccount.id, value]
      );
    }
  }
  res.json({ ok: true, count: ids.length });
});
