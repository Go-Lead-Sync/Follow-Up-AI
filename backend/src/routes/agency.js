import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { hashPassword } from "../lib/auth.js";
import { requireAgencyAdmin } from "../middleware/auth.js";

export const agencyRouter = Router();

// Sub-accounts ---------------------------------------------------------------

agencyRouter.get("/sub-accounts", async (req, res) => {
  const { rows } = await pool.query(
    "select * from sub_accounts where agency_id=$1 order by created_at asc",
    [req.user.agency_id]
  );
  res.json(rows);
});

const SubAccountSchema = z.object({
  name: z.string().min(1),
  tone: z.string().optional().nullable(),
  instructionBlock: z.string().optional().nullable(),
  doList: z.string().optional().nullable(),
  dontList: z.string().optional().nullable(),
  bookingLink: z.string().optional().nullable(),
  hours: z.string().optional().nullable(),
  policies: z.string().optional().nullable(),
  faqs: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  leadconnectorLocationId: z.string().optional().nullable(),
});

agencyRouter.post("/sub-accounts", requireAgencyAdmin, async (req, res) => {
  const parsed = SubAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const { rows } = await pool.query(
    `insert into sub_accounts (agency_id, name, tone, instruction_block, do_list, dont_list, booking_link, hours, policies, faqs, timezone, leadconnector_location_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
    [
      req.user.agency_id,
      d.name,
      d.tone || null,
      d.instructionBlock || null,
      d.doList || null,
      d.dontList || null,
      d.bookingLink || null,
      d.hours || null,
      d.policies || null,
      d.faqs || null,
      d.timezone || "America/New_York",
      d.leadconnectorLocationId || null,
    ]
  );
  res.json(rows[0]);
});

agencyRouter.put("/sub-accounts/:subAccountId", async (req, res) => {
  const parsed = SubAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const { rows } = await pool.query(
    `update sub_accounts set name=$1, tone=$2, instruction_block=$3, do_list=$4, dont_list=$5,
       booking_link=$6, hours=$7, policies=$8, faqs=$9, timezone=$10, leadconnector_location_id=$11
     where id=$12 and agency_id=$13 returning *`,
    [
      d.name,
      d.tone || null,
      d.instructionBlock || null,
      d.doList || null,
      d.dontList || null,
      d.bookingLink || null,
      d.hours || null,
      d.policies || null,
      d.faqs || null,
      d.timezone || "America/New_York",
      d.leadconnectorLocationId || null,
      req.params.subAccountId,
      req.user.agency_id,
    ]
  );
  res.json(rows[0] || null);
});

agencyRouter.delete("/sub-accounts/:subAccountId", requireAgencyAdmin, async (req, res) => {
  await pool.query("delete from sub_accounts where id=$1 and agency_id=$2", [
    req.params.subAccountId,
    req.user.agency_id,
  ]);
  res.json({ ok: true });
});

// Users -----------------------------------------------------------------------

agencyRouter.get("/users", async (req, res) => {
  const { rows } = await pool.query(
    "select id, name, email, role, scoped_sub_account_ids, created_at from users where agency_id=$1 order by created_at asc",
    [req.user.agency_id]
  );
  res.json(rows);
});

const UserCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["agency_admin", "agency_view", "admin", "user"]).default("user"),
  scopedSubAccountIds: z.array(z.string().uuid()).optional().nullable(),
});

agencyRouter.post("/users", requireAgencyAdmin, async (req, res) => {
  const parsed = UserCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const existing = await pool.query("select id from users where email=$1", [d.email.toLowerCase()]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: "email_taken" });
  }
  const { rows } = await pool.query(
    `insert into users (agency_id, email, password_hash, name, role, scoped_sub_account_ids)
     values ($1,$2,$3,$4,$5,$6) returning id, name, email, role, scoped_sub_account_ids, created_at`,
    [req.user.agency_id, d.email.toLowerCase(), hashPassword(d.password), d.name, d.role, d.scopedSubAccountIds || null]
  );
  res.json(rows[0]);
});

const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["agency_admin", "agency_view", "admin", "user"]).optional(),
  scopedSubAccountIds: z.array(z.string().uuid()).optional().nullable(),
});

agencyRouter.put("/users/:userId", requireAgencyAdmin, async (req, res) => {
  const parsed = UserUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const existing = await pool.query("select * from users where id=$1 and agency_id=$2", [
    req.params.userId,
    req.user.agency_id,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const current = existing.rows[0];
  const d = parsed.data;
  const { rows } = await pool.query(
    `update users set name=$1, role=$2, scoped_sub_account_ids=$3 where id=$4 returning id, name, email, role, scoped_sub_account_ids, created_at`,
    [
      d.name ?? current.name,
      d.role ?? current.role,
      d.scopedSubAccountIds !== undefined ? d.scopedSubAccountIds : current.scoped_sub_account_ids,
      req.params.userId,
    ]
  );
  res.json(rows[0]);
});

agencyRouter.delete("/users/:userId", requireAgencyAdmin, async (req, res) => {
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: "cannot_delete_self" });
  }
  await pool.query("delete from users where id=$1 and agency_id=$2", [req.params.userId, req.user.agency_id]);
  res.json({ ok: true });
});

// Agency-wide dashboard --------------------------------------------------------

agencyRouter.get("/overview", async (req, res) => {
  const subAccounts = await pool.query("select count(*)::int as count from sub_accounts where agency_id=$1", [
    req.user.agency_id,
  ]);
  const contacts = await pool.query(
    `select count(*)::int as count from contacts c join sub_accounts s on s.id=c.sub_account_id where s.agency_id=$1`,
    [req.user.agency_id]
  );
  const opportunities = await pool.query(
    `select o.status, count(*)::int as count, coalesce(sum(o.value),0)::float as value
     from opportunities o join sub_accounts s on s.id=o.sub_account_id where s.agency_id=$1 group by o.status`,
    [req.user.agency_id]
  );
  res.json({
    subAccounts: subAccounts.rows[0].count,
    contacts: contacts.rows[0].count,
    opportunities: opportunities.rows,
  });
});
