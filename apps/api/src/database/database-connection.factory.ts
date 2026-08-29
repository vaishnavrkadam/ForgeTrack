import * as net from 'net';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { newDb } from 'pg-mem';

const logger = new Logger('DatabaseConnectionFactory');

export async function isPortReachable(host: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function runSelfHealingSchema(ds: DataSource): Promise<void> {
  const healingQueries = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    `ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS token_hash text`,
    `ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS role varchar(40) NOT NULL DEFAULT 'DEVELOPER'`,
    `ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS expires_at timestamptz`,
    `ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS accepted_at timestamptz`,
    `ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS invited_by uuid`,
    `ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS email varchar(160)`,
    `ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS role varchar(40) NOT NULL DEFAULT 'DEVELOPER'`,
    `ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'ACTIVE'`,
    `ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS joined_at timestamptz`,
    `ALTER TABLE project_members ADD COLUMN IF NOT EXISTS role varchar(40) NOT NULL DEFAULT 'DEVELOPER'`,
    `ALTER TABLE project_members ADD COLUMN IF NOT EXISTS joined_at timestamptz`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name varchar(120)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider varchar(30)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id varchar(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'ACTIVE'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz`,
    `ALTER TABLE automation_executions ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0`,
  ];

  for (const query of healingQueries) {
    try {
      await ds.query(query);
    } catch {
      // Ignored for non-fatal syntax or already existing
    }
  }
}

export async function createDatabaseDataSource(options: any): Promise<DataSource> {
  let host = options.host || 'localhost';
  let port = options.port || 5432;

  if (options.url) {
    try {
      const parsedUrl = new URL(options.url);
      host = parsedUrl.hostname || host;
      port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (parsedUrl.protocol === 'https:' ? 443 : 5432);
    } catch {
      // Ignored
    }
  }

  const isOnline = await isPortReachable(host, port, 1500);

  if (isOnline) {
    logger.log(`Connecting to PostgreSQL on ${host}:${port}...`);
    const ds = new DataSource(options);
    await ds.initialize();
    await runSelfHealingSchema(ds);
    return ds;
  }

  // Seamless in-memory PostgreSQL engine fallback
  logger.warn(`PostgreSQL not detected on ${host}:${port}. Booting embedded In-Memory PostgreSQL engine (Zero Docker setup required)...`);

  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({ name: 'version', implementation: () => 'PostgreSQL 16.0' });
  db.public.registerFunction({ name: 'current_database', implementation: () => 'forgetrack' });
  db.public.registerFunction({ name: 'gen_random_uuid', implementation: () => crypto.randomUUID() });
  db.public.registerFunction({ name: 'now', implementation: () => new Date() });

  const ds = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: options.entities || [],
  });

  await ds.initialize();

  // Create every application table in memory
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug varchar(160) UNIQUE NOT NULL,
      name varchar(160) NOT NULL,
      description text,
      avatar_url text,
      settings jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(160) UNIQUE NOT NULL,
      display_name varchar(120) NOT NULL,
      avatar_url text,
      password_hash text,
      email_verified_at timestamptz,
      oauth_provider varchar(30),
      oauth_provider_id varchar(255),
      status varchar(30) NOT NULL DEFAULT 'ACTIVE',
      last_login_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS organization_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      role varchar(40) NOT NULL DEFAULT 'MEMBER',
      status varchar(30) NOT NULL DEFAULT 'ACTIVE',
      joined_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organization_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS organization_invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      email varchar(160) NOT NULL,
      role varchar(40) NOT NULL DEFAULT 'MEMBER',
      token_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      invited_by uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      key varchar(20) NOT NULL,
      name varchar(120) NOT NULL,
      slug varchar(120) NOT NULL,
      description text,
      visibility varchar(30) NOT NULL DEFAULT 'PRIVATE',
      status varchar(30) NOT NULL DEFAULT 'ACTIVE',
      issue_counter bigint NOT NULL DEFAULT 0,
      settings jsonb NOT NULL DEFAULT '{}',
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organization_id, key),
      UNIQUE (organization_id, slug)
    )`,
    `CREATE TABLE IF NOT EXISTS project_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL,
      user_id uuid NOT NULL,
      role varchar(40) NOT NULL DEFAULT 'DEVELOPER',
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (project_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      name varchar(120) NOT NULL,
      slug varchar(120) NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organization_id, slug)
    )`,
    `CREATE TABLE IF NOT EXISTS team_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id uuid NOT NULL,
      user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (team_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS project_teams (
      project_id uuid NOT NULL,
      team_id uuid NOT NULL,
      PRIMARY KEY (project_id, team_id)
    )`,
    `CREATE TABLE IF NOT EXISTS issue_types (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      name varchar(60) NOT NULL,
      code varchar(30) NOT NULL,
      icon varchar(80),
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS priorities (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      name varchar(60) NOT NULL,
      code varchar(30) NOT NULL,
      rank integer NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS severities (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      name varchar(60) NOT NULL,
      code varchar(30) NOT NULL,
      rank integer NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS statuses (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      name varchar(60) NOT NULL,
      code varchar(30) NOT NULL,
      category varchar(30) NOT NULL DEFAULT 'TODO',
      position integer NOT NULL DEFAULT 0,
      is_default boolean NOT NULL DEFAULT false
    )`,
    `CREATE TABLE IF NOT EXISTS components (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      name varchar(100) NOT NULL,
      lead_user_id uuid,
      description text,
      is_active boolean NOT NULL DEFAULT true
    )`,
    `CREATE TABLE IF NOT EXISTS versions (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      name varchar(80) NOT NULL,
      description text,
      release_date date,
      status varchar(30) NOT NULL DEFAULT 'UNRELEASED'
    )`,
    `CREATE TABLE IF NOT EXISTS milestones (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      name varchar(100) NOT NULL,
      description text,
      due_date date,
      status varchar(30) NOT NULL DEFAULT 'OPEN'
    )`,
    `CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      name varchar(100) NOT NULL,
      field_type varchar(40) NOT NULL,
      config jsonb NOT NULL DEFAULT '{}',
      is_required boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS issues (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid NOT NULL,
      issue_type_id uuid NOT NULL,
      status_id uuid NOT NULL,
      priority_id uuid,
      severity_id uuid,
      component_id uuid,
      version_id uuid,
      milestone_id uuid,
      assignee_id uuid,
      reporter_id uuid,
      number bigint NOT NULL,
      key varchar(40) NOT NULL,
      title varchar(255) NOT NULL,
      description text,
      reproduction_steps text,
      expected_result text,
      actual_result text,
      environment jsonb,
      estimate_minutes integer,
      time_spent_minutes integer DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz,
      closed_at timestamptz
    )`,
    `CREATE TABLE IF NOT EXISTS issue_field_values (
      id uuid PRIMARY KEY,
      issue_id uuid NOT NULL,
      field_definition_id uuid NOT NULL,
      value_json jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id uuid PRIMARY KEY,
      issue_id uuid NOT NULL,
      user_id uuid,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS attachments (
      id uuid PRIMARY KEY,
      issue_id uuid NOT NULL,
      user_id uuid,
      file_name varchar(255) NOT NULL,
      file_size bigint NOT NULL,
      content_type varchar(120),
      storage_key varchar(255),
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS labels (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      name varchar(60) NOT NULL,
      color varchar(20),
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS issue_labels (
      issue_id uuid NOT NULL,
      label_id uuid NOT NULL,
      PRIMARY KEY (issue_id, label_id)
    )`,
    `CREATE TABLE IF NOT EXISTS issue_relationships (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      source_issue_id uuid NOT NULL,
      target_issue_id uuid NOT NULL,
      relationship_type varchar(40) NOT NULL,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS watchers (
      issue_id uuid NOT NULL,
      user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (issue_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      type varchar(60) NOT NULL,
      title varchar(255) NOT NULL,
      body text,
      is_read boolean NOT NULL DEFAULT false,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      event_type varchar(80) NOT NULL,
      in_app boolean NOT NULL DEFAULT true,
      email boolean NOT NULL DEFAULT true
    )`,
    `CREATE TABLE IF NOT EXISTS audit_events (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      actor_user_id uuid,
      entity_type varchar(60) NOT NULL,
      entity_id uuid,
      action varchar(80) NOT NULL,
      before_json jsonb,
      after_json jsonb,
      metadata jsonb NOT NULL DEFAULT '{}',
      request_id varchar(100),
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS issue_history (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      issue_id uuid NOT NULL,
      actor_user_id uuid,
      field_name varchar(80) NOT NULL,
      old_value jsonb,
      new_value jsonb,
      change_type varchar(40) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS outbox_events (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      event_type varchar(100) NOT NULL,
      aggregate_type varchar(60),
      aggregate_id uuid,
      payload jsonb NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      processed_at timestamptz,
      attempt_count integer NOT NULL DEFAULT 0,
      last_error text
    )`,
    `CREATE TABLE IF NOT EXISTS automation_rules (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      name varchar(160) NOT NULL,
      description text,
      is_enabled boolean NOT NULL DEFAULT true,
      trigger_type varchar(80) NOT NULL,
      conditions jsonb NOT NULL DEFAULT '[]',
      actions jsonb NOT NULL DEFAULT '[]',
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS automation_executions (
      id uuid PRIMARY KEY,
      rule_id uuid,
      event_id uuid,
      status varchar(30) NOT NULL DEFAULT 'PENDING',
      attempt_count integer NOT NULL DEFAULT 0,
      started_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz,
      result jsonb,
      error text
    )`,
    `CREATE TABLE IF NOT EXISTS api_tokens (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      name varchar(120) NOT NULL,
      token_prefix varchar(20) NOT NULL,
      token_hash char(64) NOT NULL,
      scopes jsonb NOT NULL DEFAULT '[]',
      expires_at timestamptz,
      last_used_at timestamptz,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      token_hash char(64) UNIQUE NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      ip_address text,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS integrations (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      provider varchar(50) NOT NULL,
      name varchar(100),
      status varchar(30) NOT NULL DEFAULT 'CONNECTED',
      configuration jsonb NOT NULL DEFAULT '{}',
      secret_reference text,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS repositories (
      id uuid PRIMARY KEY,
      integration_id uuid NOT NULL,
      external_id varchar(255),
      owner varchar(255),
      name varchar(255),
      default_branch varchar(255),
      web_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS code_links (
      id uuid PRIMARY KEY,
      organization_id uuid,
      issue_id uuid NOT NULL,
      repository_id uuid,
      provider varchar(40),
      entity_type varchar(40),
      external_type varchar(40),
      external_id varchar(255) NOT NULL,
      title varchar(500),
      url text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      status varchar(40),
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS ai_suggestions (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      issue_id uuid,
      type varchar(60) NOT NULL,
      model varchar(160),
      input_hash char(64),
      result jsonb NOT NULL,
      confidence numeric(5,4),
      status varchar(30) NOT NULL DEFAULT 'PENDING',
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS embeddings (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      entity_type varchar(60) NOT NULL,
      entity_id uuid NOT NULL,
      content_hash char(64) NOT NULL,
      model varchar(160) NOT NULL,
      vector text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS webhooks (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      url text NOT NULL,
      secret_reference text,
      events jsonb NOT NULL DEFAULT '["*"]',
      is_enabled boolean NOT NULL DEFAULT true,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id uuid PRIMARY KEY,
      webhook_id uuid NOT NULL,
      event_id uuid,
      attempt_count integer NOT NULL DEFAULT 0,
      status varchar(30) NOT NULL DEFAULT 'PENDING',
      response_status integer,
      response_body text,
      next_attempt_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      delivered_at timestamptz
    )`,
    `CREATE TABLE IF NOT EXISTS import_jobs (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL,
      project_id uuid,
      created_by uuid,
      source_type varchar(40) NOT NULL DEFAULT 'JSON',
      status varchar(30) NOT NULL DEFAULT 'PENDING',
      source_object_key text,
      total_records integer DEFAULT 0,
      successful_records integer DEFAULT 0,
      failed_records integer DEFAULT 0,
      error_report_object_key text,
      created_at timestamptz NOT NULL DEFAULT now(),
      started_at timestamptz,
      finished_at timestamptz
    )`,
    `CREATE TABLE IF NOT EXISTS ci_runs (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL,
      commit_sha varchar(64) NOT NULL,
      workflow_name varchar(120) NOT NULL,
      run_number integer NOT NULL DEFAULT 1,
      status varchar(30) NOT NULL DEFAULT 'SUCCESS',
      url text,
      started_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`
  ];

  for (const sql of tableStatements) {
    try {
      await ds.query(sql);
    } catch (err: any) {
      logger.warn(`In-memory schema creation notice: ${err.message}`);
    }
  }

  // Seed default organization, project, issue types, priorities, severities, and statuses
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const projId = '00000000-0000-0000-0000-000000000002';
    const userId = '00000000-0000-0000-0000-000000000003';

    await ds.query(`
      INSERT INTO organizations (id, slug, name, description)
      VALUES ('${orgId}', 'acme-corp', 'Acme Corporation', 'Default Engineering Organization')
    `);

    await ds.query(`
      INSERT INTO users (id, email, display_name, status)
      VALUES ('${userId}', 'alex@example.com', 'Alex Chen', 'ACTIVE')
    `);

    await ds.query(`
      INSERT INTO projects (id, organization_id, key, name, slug, description)
      VALUES ('${projId}', '${orgId}', 'FORGE', 'ForgeTrack Core Engine', 'forgetrack-core', 'Core issue tracking engine')
    `);

    await ds.query(`
      INSERT INTO issue_types (id, project_id, name, code)
      VALUES ('${crypto.randomUUID()}', '${projId}', 'Bug', 'BUG')
    `);

    await ds.query(`
      INSERT INTO priorities (id, project_id, name, code, rank)
      VALUES ('${crypto.randomUUID()}', '${projId}', 'Urgent', 'URGENT', 1)
    `);

    await ds.query(`
      INSERT INTO severities (id, project_id, name, code, rank)
      VALUES ('${crypto.randomUUID()}', '${projId}', 'Blocker', 'BLOCKER', 1)
    `);

    await ds.query(`
      INSERT INTO statuses (id, project_id, name, code, category, position, is_default)
      VALUES ('${crypto.randomUUID()}', '${projId}', 'Open', 'OPEN', 'TODO', 1, true)
    `);

    logger.log('Embedded In-Memory PostgreSQL database initialized and seeded successfully.');
  } catch (err: any) {
    logger.warn(`In-memory seed notice: ${err.message}`);
  }

  return ds;
}
