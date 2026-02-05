import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function ensureSchema() {
  await pool.query(`
    create table if not exists followup_requests (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      name text not null,
      business_name text not null,
      appointment_time text not null,
      channel text not null,
      intent text not null,
      response_text text not null
    );
  `);
}
