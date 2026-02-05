import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function ensureSchema() {
  await pool.query(`
    create extension if not exists "pgcrypto";

    create table if not exists business_profiles (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      name text not null,
      tone text not null,
      instruction_block text,
      do_list text,
      dont_list text,
      leadconnector_location_id text,
      booking_link text,
      hours text,
      policies text,
      faqs text
    );

    alter table business_profiles add column if not exists instruction_block text;
    alter table business_profiles add column if not exists do_list text;
    alter table business_profiles add column if not exists dont_list text;
    alter table business_profiles add column if not exists leadconnector_location_id text;

    create table if not exists contacts (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      business_id uuid references business_profiles(id) on delete cascade,
      leadconnector_contact_id text,
      name text not null,
      email text,
      phone text,
      last_appointment text,
      status text,
      notes text
    );

    alter table contacts add column if not exists leadconnector_contact_id text;

    create table if not exists workflows (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      business_id uuid references business_profiles(id) on delete cascade,
      name text not null,
      definition jsonb not null
    );

    create table if not exists messages (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      business_id uuid references business_profiles(id) on delete cascade,
      contact_id uuid references contacts(id) on delete cascade,
      direction text not null,
      channel text not null,
      body text not null,
      status text,
      provider text,
      meta jsonb
    );

    create table if not exists contact_sequences (
      contact_id uuid primary key references contacts(id) on delete cascade,
      workflow_id uuid references workflows(id) on delete cascade,
      step_index int not null default 0,
      updated_at timestamptz not null default now()
    );

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
