import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { groqComplete, buildAgentPrompt } from "../lib/ai.js";
import { processTrigger, resumeAwaitingReply } from "../lib/workflowEngine.js";

export const conversationsRouter = Router({ mergeParams: true });

conversationsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `select c.*, ct.name as contact_name,
       (select body from messages m where m.conversation_id=c.id order by m.created_at desc limit 1) as last_message
     from conversations c
     join contacts ct on ct.id = c.contact_id
     where c.sub_account_id=$1
     order by coalesce(c.last_message_at, c.created_at) desc`,
    [req.subAccount.id]
  );
  res.json(rows);
});

conversationsRouter.get("/:conversationId/messages", async (req, res) => {
  const { rows } = await pool.query(
    "select * from messages where conversation_id=$1 and sub_account_id=$2 order by created_at asc",
    [req.params.conversationId, req.subAccount.id]
  );
  res.json(rows);
});

conversationsRouter.put("/:conversationId", async (req, res) => {
  const schema = z.object({
    status: z.enum(["open", "closed"]).optional(),
    assignedUserId: z.string().uuid().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const existing = await pool.query("select * from conversations where id=$1 and sub_account_id=$2", [
    req.params.conversationId,
    req.subAccount.id,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const current = existing.rows[0];
  const { rows } = await pool.query(
    "update conversations set status=$1, assigned_user_id=$2, updated_at=now() where id=$3 returning *",
    [
      parsed.data.status ?? current.status,
      parsed.data.assignedUserId !== undefined ? parsed.data.assignedUserId : current.assigned_user_id,
      req.params.conversationId,
    ]
  );
  res.json(rows[0]);
});

async function getOrCreateConversation(subAccountId, contactId, channel) {
  const existing = await pool.query(
    "select * from conversations where sub_account_id=$1 and contact_id=$2 and channel=$3 order by created_at desc limit 1",
    [subAccountId, contactId, channel]
  );
  if (existing.rows[0]) return existing.rows[0];
  const created = await pool.query(
    `insert into conversations (sub_account_id, contact_id, channel, status, last_message_at)
     values ($1, $2, $3, 'open', now()) returning *`,
    [subAccountId, contactId, channel]
  );
  return created.rows[0];
}

const SendSchema = z.object({
  contactId: z.string().uuid(),
  channel: z.enum(["sms", "email", "whatsapp", "facebook", "instagram", "gmb", "webchat"]),
  body: z.string().min(1),
});

conversationsRouter.post("/messages", async (req, res) => {
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const { contactId, channel, body } = parsed.data;
  const contactRes = await pool.query("select * from contacts where id=$1 and sub_account_id=$2", [
    contactId,
    req.subAccount.id,
  ]);
  if (!contactRes.rows[0]) return res.status(404).json({ error: "contact_not_found" });

  const conversation = await getOrCreateConversation(req.subAccount.id, contactId, channel);
  const { rows } = await pool.query(
    `insert into messages (sub_account_id, conversation_id, contact_id, direction, channel, body, status, provider)
     values ($1,$2,$3,'outbound',$4,$5,'queued',$6) returning *`,
    [req.subAccount.id, conversation.id, contactId, channel, body, process.env.TWILIO_ACCOUNT_SID || process.env.SENDGRID_API_KEY ? "live" : "simulated"]
  );
  await pool.query("update conversations set last_message_at=now(), updated_at=now() where id=$1", [conversation.id]);
  res.json(rows[0]);
});

// Simulates or ingests an inbound message on any channel. This is where a real
// Twilio/SendGrid/WhatsApp inbound webhook would be adapted before calling in.
const InboundSchema = z.object({
  contactId: z.string().uuid(),
  channel: z.enum(["sms", "email", "whatsapp", "facebook", "instagram", "gmb", "webchat"]),
  body: z.string().min(1),
  autoReply: z.boolean().optional(),
});

conversationsRouter.post("/inbound", async (req, res) => {
  const parsed = InboundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const { contactId, channel, body, autoReply } = parsed.data;
  const contactRes = await pool.query("select * from contacts where id=$1 and sub_account_id=$2", [
    contactId,
    req.subAccount.id,
  ]);
  const contact = contactRes.rows[0];
  if (!contact) return res.status(404).json({ error: "contact_not_found" });

  const conversation = await getOrCreateConversation(req.subAccount.id, contactId, channel);
  await pool.query(
    `insert into messages (sub_account_id, conversation_id, contact_id, direction, channel, body, status, provider)
     values ($1,$2,$3,'inbound',$4,$5,'received',$6)`,
    [req.subAccount.id, conversation.id, contactId, channel, body, "webhook"]
  );
  await pool.query("update conversations set last_message_at=now(), updated_at=now() where id=$1", [conversation.id]);

  await processTrigger(req.subAccount.id, "message_received", contact, { channel, body }).catch(() => {});
  await resumeAwaitingReply(req.subAccount.id, contactId).catch(() => {});

  let replyText = null;
  if (autoReply) {
    const prompt = buildAgentPrompt(req.subAccount, contact, {
      channel,
      goal: `Inbound message: "${body}". Respond and move the conversation forward.`,
    });
    replyText =
      (await groqComplete([
        { role: "system", content: "You are a precise follow-up assistant for local businesses." },
        { role: "user", content: prompt },
      ])) || `Thanks ${contact.name}! What time works best for you?`;
    await pool.query(
      `insert into messages (sub_account_id, conversation_id, contact_id, direction, channel, body, status, provider, meta)
       values ($1,$2,$3,'outbound',$4,$5,'queued','ai',$6)`,
      [req.subAccount.id, conversation.id, contactId, channel, replyText, { usedGroq: Boolean(process.env.GROQ_API_KEY) }]
    );
    await pool.query("update conversations set last_message_at=now(), updated_at=now() where id=$1", [conversation.id]);
  }

  res.json({ ok: true, conversationId: conversation.id, replyText });
});
