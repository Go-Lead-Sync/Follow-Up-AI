import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { hashPassword, verifyPassword, signToken } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

function publicUser(user, agency) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    agencyId: user.agency_id,
    agency: agency ? { id: agency.id, name: agency.name, plan: agency.plan } : undefined,
  };
}

authRouter.post("/signup", async (req, res) => {
  const schema = z.object({
    agencyName: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const { agencyName, name, email, password } = parsed.data;

  const existing = await pool.query("select id from users where email=$1", [email.toLowerCase()]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: "email_taken" });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const agencyRes = await client.query(
      "insert into agencies (name) values ($1) returning *",
      [agencyName]
    );
    const agency = agencyRes.rows[0];
    const userRes = await client.query(
      `insert into users (agency_id, email, password_hash, name, role)
       values ($1, $2, $3, $4, 'agency_admin') returning *`,
      [agency.id, email.toLowerCase(), hashPassword(password), name]
    );
    const user = userRes.rows[0];
    const subAccountRes = await client.query(
      `insert into sub_accounts (agency_id, name, tone) values ($1, $2, $3) returning *`,
      [agency.id, "Main Location", "Warm, concise, confident"]
    );
    await client.query("commit");
    const subAccount = subAccountRes.rows[0];
    const token = signToken({ userId: user.id, agencyId: agency.id });
    res.json({ token, user: publicUser(user, agency), subAccount });
  } catch (err) {
    await client.query("rollback");
    res.status(500).json({ error: "signup_failed" });
  } finally {
    client.release();
  }
});

authRouter.post("/login", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }
  const { email, password } = parsed.data;
  const { rows } = await pool.query("select * from users where email=$1", [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const agencyRes = await pool.query("select * from agencies where id=$1", [user.agency_id]);
  const token = signToken({ userId: user.id, agencyId: user.agency_id });
  res.json({ token, user: publicUser(user, agencyRes.rows[0]) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const agencyRes = await pool.query("select * from agencies where id=$1", [req.user.agency_id]);
  const subAccounts = await pool.query(
    "select * from sub_accounts where agency_id=$1 order by created_at asc",
    [req.user.agency_id]
  );
  res.json({ user: publicUser(req.user, agencyRes.rows[0]), subAccounts: subAccounts.rows });
});
