import { pool } from "../db.js";
import { groqComplete, buildAgentPrompt } from "./ai.js";

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

async function sendMessage({ subAccountId, contact, channel, body, direction = "outbound", provider = "simulated" }) {
  const conversation = await getOrCreateConversation(subAccountId, contact.id, channel);
  await pool.query(
    `insert into messages (sub_account_id, conversation_id, contact_id, direction, channel, body, status, provider)
     values ($1, $2, $3, $4, $5, $6, 'queued', $7)`,
    [subAccountId, conversation.id, contact.id, direction, channel, body, provider]
  );
  await pool.query("update conversations set last_message_at=now(), updated_at=now() where id=$1", [conversation.id]);
}

function applyMergeFields(text, contact, subAccount) {
  const values = {
    name: contact.name,
    first_name: (contact.name || "").split(" ")[0],
    email: contact.email || "",
    phone: contact.phone || "",
    business_name: subAccount.name,
    booking_link: subAccount.booking_link || "",
  };
  return String(text || "").replace(/{{\s*([\w.]+)\s*}}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}

async function evalCondition(condition, contact) {
  if (!condition) return true;
  const { field, op, value } = condition;
  if (field === "tag") {
    const { rows } = await pool.query(
      `select 1 from contact_tags ct join tags t on t.id=ct.tag_id where ct.contact_id=$1 and t.name=$2`,
      [contact.id, value]
    );
    const hasTag = rows.length > 0;
    return op === "not_has" ? !hasTag : hasTag;
  }
  const actual = contact[field];
  switch (op) {
    case "equals":
      return String(actual || "") === String(value);
    case "not_equals":
      return String(actual || "") !== String(value);
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

async function runStepsSync(steps, ctx) {
  for (const step of steps) {
    await executeAtomicStep(step, ctx);
  }
}

async function executeAtomicStep(step, ctx) {
  const { subAccount, contact } = ctx;
  switch (step.type) {
    case "add_tag": {
      const tagRes = await pool.query(
        `insert into tags (sub_account_id, name) values ($1, $2)
         on conflict (sub_account_id, name) do update set name=excluded.name returning *`,
        [subAccount.id, step.tag]
      );
      await pool.query(
        `insert into contact_tags (contact_id, tag_id) values ($1, $2) on conflict do nothing`,
        [contact.id, tagRes.rows[0].id]
      );
      return;
    }
    case "remove_tag": {
      await pool.query(
        `delete from contact_tags where contact_id=$1 and tag_id=(select id from tags where sub_account_id=$2 and name=$3)`,
        [contact.id, subAccount.id, step.tag]
      );
      return;
    }
    case "update_field": {
      const allowed = new Set(["status", "notes", "score", "last_appointment", "email", "phone"]);
      if (allowed.has(step.field)) {
        await pool.query(`update contacts set ${step.field}=$1 where id=$2`, [step.value, contact.id]);
      }
      return;
    }
    case "note": {
      await pool.query(`update contacts set notes = coalesce(notes || E'\\n', '') || $1 where id=$2`, [
        step.body || "",
        contact.id,
      ]);
      return;
    }
    case "create_opportunity": {
      const pipeline = await pool.query(
        "select * from pipelines where sub_account_id=$1 and (name=$2 or $2 is null) order by created_at asc limit 1",
        [subAccount.id, step.pipeline || null]
      );
      const p = pipeline.rows[0];
      if (!p) return;
      const stage = await pool.query(
        "select * from pipeline_stages where pipeline_id=$1 order by position asc limit 1",
        [p.id]
      );
      const s = stage.rows[0];
      if (!s) return;
      await pool.query(
        `insert into opportunities (sub_account_id, pipeline_id, stage_id, contact_id, name, value, status)
         values ($1, $2, $3, $4, $5, $6, 'open')`,
        [subAccount.id, p.id, s.id, contact.id, step.name || `${contact.name} opportunity`, step.value || null]
      );
      return;
    }
    case "move_stage": {
      const opp = await pool.query(
        "select * from opportunities where contact_id=$1 order by created_at desc limit 1",
        [contact.id]
      );
      const o = opp.rows[0];
      if (!o) return;
      const stage = await pool.query(
        "select * from pipeline_stages where pipeline_id=$1 and name=$2 limit 1",
        [o.pipeline_id, step.stage]
      );
      if (stage.rows[0]) {
        await pool.query("update opportunities set stage_id=$1 where id=$2", [stage.rows[0].id, o.id]);
      }
      return;
    }
    case "send_sms":
    case "send_email": {
      const channel = step.type === "send_sms" ? "sms" : "email";
      let text = applyMergeFields(step.body || "", contact, subAccount);
      if (step.ai) {
        const prompt = buildAgentPrompt(subAccount, contact, { channel, goal: step.goal || "Send a helpful follow-up." });
        text = (await groqComplete([
          { role: "system", content: "You are a precise follow-up assistant for local businesses." },
          { role: "user", content: prompt },
        ])) || text || `Hi ${contact.name}, checking in from ${subAccount.name}.`;
      }
      await sendMessage({ subAccountId: subAccount.id, contact, channel, body: text, provider: "workflow" });
      return;
    }
    case "webhook": {
      if (!step.url) return;
      try {
        await fetch(step.url, {
          method: step.method || "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact, subAccountId: subAccount.id, event: "workflow_step" }),
        });
      } catch {
        // best effort
      }
      return;
    }
    case "if_else": {
      const result = await evalCondition(step.condition, contact);
      await runStepsSync(result ? step.then || [] : step.else || [], ctx);
      return;
    }
    default:
      return;
  }
}

export async function processTrigger(subAccountId, triggerType, contact, extra = {}) {
  const { rows: workflows } = await pool.query(
    "select * from workflows where sub_account_id=$1 and trigger_type=$2 and status='published'",
    [subAccountId, triggerType]
  );
  for (const workflow of workflows) {
    const existing = await pool.query(
      "select * from workflow_enrollments where workflow_id=$1 and contact_id=$2 order by created_at desc limit 1",
      [workflow.id, contact.id]
    );
    let enrollment = existing.rows[0];
    if (enrollment && enrollment.status === "active") continue;
    if (enrollment && enrollment.status !== "completed") continue;
    if (enrollment && enrollment.status === "completed" && !workflow.allow_reentry) continue;
    const inserted = await pool.query(
      `insert into workflow_enrollments (workflow_id, contact_id, step_index, status)
       values ($1, $2, 0, 'active') returning *`,
      [workflow.id, contact.id]
    );
    enrollment = inserted.rows[0];
    await advanceEnrollment(enrollment, workflow, contact, extra);
  }
}

export async function advanceEnrollment(enrollment, workflow, contact, extra = {}) {
  const subAccountRes = await pool.query("select * from sub_accounts where id=$1", [workflow.sub_account_id]);
  const subAccount = subAccountRes.rows[0];
  const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
  let index = enrollment.step_index;
  const ctx = { subAccount, contact, enrollment };

  while (index < steps.length) {
    const step = steps[index];

    if (step.type === "wait") {
      const wakeAt = new Date(Date.now() + parseDuration(step.duration || "24h"));
      await pool.query(
        `update workflow_enrollments set step_index=$1, status='waiting', wake_at=$2, updated_at=now() where id=$3`,
        [index + 1, wakeAt, enrollment.id]
      );
      return;
    }

    if (step.type === "if_reply") {
      await pool.query(
        `update workflow_enrollments set step_index=$1, status='awaiting_reply', updated_at=now() where id=$2`,
        [index + 1, enrollment.id]
      );
      return;
    }

    if (step.type === "end") {
      await pool.query(`update workflow_enrollments set status='completed', updated_at=now() where id=$1`, [
        enrollment.id,
      ]);
      return;
    }

    await executeAtomicStep(step, ctx);
    index += 1;
  }

  await pool.query(`update workflow_enrollments set step_index=$1, status='completed', updated_at=now() where id=$2`, [
    index,
    enrollment.id,
  ]);
}

export async function processDueEnrollments() {
  const { rows } = await pool.query(
    "select * from workflow_enrollments where status='waiting' and wake_at <= now() limit 200"
  );
  for (const enrollment of rows) {
    const workflowRes = await pool.query("select * from workflows where id=$1", [enrollment.workflow_id]);
    const contactRes = await pool.query("select * from contacts where id=$1", [enrollment.contact_id]);
    if (!workflowRes.rows[0] || !contactRes.rows[0]) continue;
    await pool.query("update workflow_enrollments set status='active' where id=$1", [enrollment.id]);
    await advanceEnrollment({ ...enrollment, status: "active" }, workflowRes.rows[0], contactRes.rows[0]);
  }
  return rows.length;
}

export async function resumeAwaitingReply(subAccountId, contactId) {
  const { rows } = await pool.query(
    `select we.* from workflow_enrollments we
     join workflows w on w.id = we.workflow_id
     where we.contact_id=$1 and we.status='awaiting_reply' and w.sub_account_id=$2`,
    [contactId, subAccountId]
  );
  for (const enrollment of rows) {
    const workflowRes = await pool.query("select * from workflows where id=$1", [enrollment.workflow_id]);
    const contactRes = await pool.query("select * from contacts where id=$1", [contactId]);
    if (!workflowRes.rows[0]) continue;
    if (workflowRes.rows[0].stop_on_response) {
      await pool.query("update workflow_enrollments set status='completed', updated_at=now() where id=$1", [
        enrollment.id,
      ]);
      continue;
    }
    await pool.query("update workflow_enrollments set status='active' where id=$1", [enrollment.id]);
    await advanceEnrollment({ ...enrollment, status: "active" }, workflowRes.rows[0], contactRes.rows[0]);
  }
}

function parseDuration(input) {
  const match = /^(\d+)([smhd])$/.exec(String(input).trim());
  if (!match) return 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}
