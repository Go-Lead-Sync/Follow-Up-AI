import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function ensureSchema() {
  await pool.query(`
    create extension if not exists "pgcrypto";

    -- Agencies & Users ------------------------------------------------------
    create table if not exists agencies (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      name text not null,
      domain text,
      plan text not null default 'starter'
    );

    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      agency_id uuid not null references agencies(id) on delete cascade,
      email text not null unique,
      password_hash text not null,
      name text not null,
      role text not null default 'admin',
      scoped_sub_account_ids uuid[]
    );

    create table if not exists sub_accounts (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      agency_id uuid not null references agencies(id) on delete cascade,
      name text not null,
      tone text,
      instruction_block text,
      do_list text,
      dont_list text,
      booking_link text,
      hours text,
      policies text,
      faqs text,
      timezone text not null default 'America/New_York',
      leadconnector_location_id text
    );

    -- Contacts / Tags / Custom Fields ---------------------------------------
    create table if not exists contacts (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      name text not null,
      email text,
      phone text,
      address text,
      timezone text,
      dob date,
      source text,
      dnd_sms boolean not null default false,
      dnd_email boolean not null default false,
      dnd_call boolean not null default false,
      status text,
      notes text,
      score int not null default 0,
      last_appointment text,
      leadconnector_contact_id text
    );

    create table if not exists tags (
      id uuid primary key default gen_random_uuid(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      name text not null,
      unique (sub_account_id, name)
    );

    create table if not exists contact_tags (
      contact_id uuid not null references contacts(id) on delete cascade,
      tag_id uuid not null references tags(id) on delete cascade,
      primary key (contact_id, tag_id)
    );

    create table if not exists custom_field_defs (
      id uuid primary key default gen_random_uuid(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      name text not null,
      field_key text not null,
      type text not null default 'text',
      options jsonb,
      unique (sub_account_id, field_key)
    );

    create table if not exists contact_field_values (
      contact_id uuid not null references contacts(id) on delete cascade,
      field_id uuid not null references custom_field_defs(id) on delete cascade,
      value text,
      primary key (contact_id, field_id)
    );

    create table if not exists smart_lists (
      id uuid primary key default gen_random_uuid(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      name text not null,
      filters jsonb not null default '[]'
    );

    -- Pipelines / Opportunities ----------------------------------------------
    create table if not exists pipelines (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      name text not null
    );

    create table if not exists pipeline_stages (
      id uuid primary key default gen_random_uuid(),
      pipeline_id uuid not null references pipelines(id) on delete cascade,
      name text not null,
      position int not null default 0
    );

    create table if not exists opportunities (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      pipeline_id uuid not null references pipelines(id) on delete cascade,
      stage_id uuid not null references pipeline_stages(id) on delete cascade,
      contact_id uuid references contacts(id) on delete set null,
      name text not null,
      value numeric,
      status text not null default 'open',
      assigned_user_id uuid references users(id),
      close_date date
    );

    -- Conversations / Messages ------------------------------------------------
    create table if not exists conversations (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      contact_id uuid not null references contacts(id) on delete cascade,
      channel text not null,
      status text not null default 'open',
      assigned_user_id uuid references users(id),
      last_message_at timestamptz
    );

    create table if not exists messages (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      conversation_id uuid references conversations(id) on delete cascade,
      contact_id uuid references contacts(id) on delete cascade,
      direction text not null,
      channel text not null,
      body text not null,
      status text,
      provider text,
      meta jsonb
    );

    -- Calendars / Appointments --------------------------------------------------
    create table if not exists calendars (
      id uuid primary key default gen_random_uuid(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      name text not null,
      type text not null default 'personal',
      config jsonb not null default '{}'
    );

    create table if not exists appointments (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      calendar_id uuid references calendars(id) on delete set null,
      contact_id uuid references contacts(id) on delete cascade,
      start_time timestamptz not null,
      end_time timestamptz not null,
      status text not null default 'booked',
      notes text
    );

    -- Workflows ------------------------------------------------------------
    create table if not exists workflows (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      name text not null,
      trigger_type text not null,
      trigger_config jsonb not null default '{}',
      steps jsonb not null default '[]',
      status text not null default 'draft',
      allow_reentry boolean not null default false,
      stop_on_response boolean not null default true
    );

    create table if not exists workflow_enrollments (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      workflow_id uuid not null references workflows(id) on delete cascade,
      contact_id uuid not null references contacts(id) on delete cascade,
      step_index int not null default 0,
      status text not null default 'active',
      wake_at timestamptz
    );

    -- Settings / Misc --------------------------------------------------------
    create table if not exists custom_values (
      id uuid primary key default gen_random_uuid(),
      sub_account_id uuid not null references sub_accounts(id) on delete cascade,
      key text not null,
      value text,
      unique (sub_account_id, key)
    );

    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      sub_account_id uuid references sub_accounts(id) on delete cascade,
      user_id uuid references users(id),
      action text not null,
      entity_type text,
      entity_id text,
      meta jsonb
    );

    create index if not exists idx_contacts_sub_account on contacts(sub_account_id);
    create index if not exists idx_opportunities_sub_account on opportunities(sub_account_id);
    create index if not exists idx_conversations_contact on conversations(contact_id);
    create index if not exists idx_messages_conversation on messages(conversation_id);
    create index if not exists idx_appointments_sub_account on appointments(sub_account_id);
    create index if not exists idx_workflow_enrollments_wake on workflow_enrollments(status, wake_at);
  `);
}
