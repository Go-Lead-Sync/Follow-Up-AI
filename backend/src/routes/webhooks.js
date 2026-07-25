import { Router } from "express";
import { pool } from "../db.js";
import { processTrigger, resumeAwaitingReply } from "../lib/workflowEngine.js";

export const webhooksRouter = Router();

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

// Generic inbound webhook for GoHighLevel / LeadConnector (or any CRM) events.
// Configure this URL in Settings > Integrations > Webhooks against a sub-account.
webhooksRouter.post("/leadconnector", async (req, res) => {
  const payload = req.body || {};
  const eventType = (payload.type || payload.event || payload.eventType || "").toLowerCase();
  const locationId = payload.locationId || payload.location_id || payload.data?.locationId;
  const contactExternalId = payload.contactId || payload.contact_id || payload.data?.contactId;
  const contactName = payload.contactName || payload.data?.contactName || "Lead";
  const contactEmail = payload.contactEmail || payload.data?.contactEmail || null;
  const contactPhone = payload.contactPhone || payload.data?.contactPhone || null;
  const inboundText = payload.message || payload.data?.message || "";
  const channel = (payload.channel || payload.data?.channel || "sms").toLowerCase();

  const subAccountRes = await pool.query(
    "select * from sub_accounts where leadconnector_location_id=$1 order by created_at desc limit 1",
    [locationId || ""]
  );
  const subAccount = subAccountRes.rows[0];
  if (!subAccount) {
    return res.json({ ok: true, ignored: "unknown_location" });
  }

  let contact = null;
  if (contactExternalId) {
    const contactRes = await pool.query(
      "select * from contacts where leadconnector_contact_id=$1 and sub_account_id=$2 limit 1",
      [contactExternalId, subAccount.id]
    );
    contact = contactRes.rows[0];
  }

  if (!contact) {
    const inserted = await pool.query(
      `insert into contacts (sub_account_id, leadconnector_contact_id, name, email, phone, status)
       values ($1,$2,$3,$4,$5,'new') returning *`,
      [subAccount.id, contactExternalId || null, contactName, contactEmail, contactPhone]
    );
    contact = inserted.rows[0];
    await processTrigger(subAccount.id, "contact_created", contact).catch(() => {});
  }

  if (eventType.includes("message") || eventType.includes("inbound")) {
    if (inboundText) {
      const conversation = await getOrCreateConversation(subAccount.id, contact.id, channel);
      await pool.query(
        `insert into messages (sub_account_id, conversation_id, contact_id, direction, channel, body, status, provider)
         values ($1,$2,$3,'inbound',$4,$5,'received','leadconnector')`,
        [subAccount.id, conversation.id, contact.id, channel, inboundText]
      );
      await pool.query("update conversations set last_message_at=now(), updated_at=now() where id=$1", [
        conversation.id,
      ]);
      await processTrigger(subAccount.id, "message_received", contact, { channel, body: inboundText }).catch(() => {});
      await resumeAwaitingReply(subAccount.id, contact.id).catch(() => {});
    }
  } else if (eventType.includes("appointment")) {
    if (eventType.includes("no_show") || eventType.includes("noshow")) {
      await pool.query("update contacts set status='no-show' where id=$1", [contact.id]);
      await processTrigger(subAccount.id, "appointment_status_changed", contact, { status: "no_show" }).catch(() => {});
    } else {
      await processTrigger(subAccount.id, "appointment_created", contact).catch(() => {});
    }
  } else if (eventType.includes("tag")) {
    await processTrigger(subAccount.id, "tag_added", contact).catch(() => {});
  }

  res.json({ ok: true });
});
