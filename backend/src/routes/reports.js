import { Router } from "express";
import { pool } from "../db.js";

export const reportsRouter = Router({ mergeParams: true });

reportsRouter.get("/overview", async (req, res) => {
  const subAccountId = req.subAccount.id;

  const [contacts, newContacts, opportunities, appointments, messages] = await Promise.all([
    pool.query("select count(*)::int as count from contacts where sub_account_id=$1", [subAccountId]),
    pool.query(
      "select count(*)::int as count from contacts where sub_account_id=$1 and created_at > now() - interval '30 days'",
      [subAccountId]
    ),
    pool.query(
      `select status, count(*)::int as count, coalesce(sum(value),0)::float as value
       from opportunities where sub_account_id=$1 group by status`,
      [subAccountId]
    ),
    pool.query(
      `select status, count(*)::int as count from appointments where sub_account_id=$1 group by status`,
      [subAccountId]
    ),
    pool.query(
      `select direction, channel, count(*)::int as count from messages where sub_account_id=$1 group by direction, channel`,
      [subAccountId]
    ),
  ]);

  res.json({
    contacts: contacts.rows[0].count,
    newContacts: newContacts.rows[0].count,
    opportunitiesByStatus: opportunities.rows,
    appointmentsByStatus: appointments.rows,
    messagesByChannel: messages.rows,
  });
});
