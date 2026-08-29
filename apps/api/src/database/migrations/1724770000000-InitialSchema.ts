import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1724770000000 implements MigrationInterface {
  name = 'InitialSchema1724770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Extensions if they exist and are available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    
    // Conditionally enable vector extension if available on PostgreSQL server
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
          CREATE EXTENSION IF NOT EXISTS vector;
        END IF;
      END $$;
    `);

    // 2. Create Core Tables in correct dependency order
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug citext UNIQUE NOT NULL,
        name varchar(160) NOT NULL,
        description text,
        avatar_url text,
        settings jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email citext UNIQUE NOT NULL,
        display_name varchar(120) NOT NULL,
        avatar_url text,
        password_hash text,
        email_verified_at timestamptz,
        status varchar(30) NOT NULL DEFAULT 'ACTIVE',
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS organization_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role varchar(40) NOT NULL DEFAULT 'MEMBER',
        status varchar(30) NOT NULL DEFAULT 'ACTIVE',
        joined_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (organization_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS organization_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email citext NOT NULL,
        role varchar(40) NOT NULL DEFAULT 'MEMBER',
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        accepted_at timestamptz,
        invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        key varchar(20) NOT NULL,
        name varchar(120) NOT NULL,
        slug varchar(120) NOT NULL,
        description text,
        visibility varchar(30) NOT NULL DEFAULT 'PRIVATE',
        status varchar(30) NOT NULL DEFAULT 'ACTIVE',
        issue_counter bigint NOT NULL DEFAULT 0,
        settings jsonb NOT NULL DEFAULT '{}',
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (organization_id, key),
        UNIQUE (organization_id, slug)
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role varchar(40) NOT NULL DEFAULT 'DEVELOPER',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS teams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        slug varchar(120) NOT NULL,
        description text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (organization_id, slug)
      );

      CREATE TABLE IF NOT EXISTS team_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (team_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS project_teams (
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, team_id)
      );

      CREATE TABLE IF NOT EXISTS issue_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(60) NOT NULL,
        code varchar(30) NOT NULL,
        icon varchar(80),
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, code)
      );

      CREATE TABLE IF NOT EXISTS priorities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(60) NOT NULL,
        code varchar(30) NOT NULL,
        rank integer NOT NULL,
        UNIQUE (project_id, code),
        UNIQUE (project_id, rank)
      );

      CREATE TABLE IF NOT EXISTS severities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(60) NOT NULL,
        code varchar(30) NOT NULL,
        rank integer NOT NULL,
        UNIQUE (project_id, code),
        UNIQUE (project_id, rank)
      );

      CREATE TABLE IF NOT EXISTS statuses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(60) NOT NULL,
        code varchar(40) NOT NULL,
        category varchar(30) NOT NULL,
        rank integer NOT NULL,
        is_terminal boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, code)
      );

      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        from_status_id uuid NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
        to_status_id uuid NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        requires_comment boolean NOT NULL DEFAULT false,
        requires_assignee boolean NOT NULL DEFAULT false,
        conditions jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, from_status_id, to_status_id)
      );

      CREATE TABLE IF NOT EXISTS components (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        description text,
        lead_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        default_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, name)
      );

      CREATE TABLE IF NOT EXISTS versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        description text,
        status varchar(30) NOT NULL DEFAULT 'PLANNED',
        start_date date,
        release_date date,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, name)
      );

      CREATE TABLE IF NOT EXISTS milestones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        description text,
        due_date date,
        status varchar(30) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, name)
      );

      CREATE TABLE IF NOT EXISTS issues (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        number bigint NOT NULL,
        issue_type_id uuid REFERENCES issue_types(id) ON DELETE SET NULL,
        status_id uuid REFERENCES statuses(id) ON DELETE SET NULL,
        priority_id uuid REFERENCES priorities(id) ON DELETE SET NULL,
        severity_id uuid REFERENCES severities(id) ON DELETE SET NULL,
        component_id uuid REFERENCES components(id) ON DELETE SET NULL,
        version_id uuid REFERENCES versions(id) ON DELETE SET NULL,
        milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
        reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
        assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
        title varchar(500) NOT NULL,
        description text,
        reproduction_steps text,
        expected_result text,
        actual_result text,
        environment jsonb,
        acceptance_criteria text,
        estimate_minutes integer,
        time_spent_minutes integer NOT NULL DEFAULT 0,
        due_at timestamptz,
        resolved_at timestamptz,
        closed_at timestamptz,
        search_vector tsvector,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, number)
      );

      CREATE TABLE IF NOT EXISTS labels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(80) NOT NULL,
        description text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, name)
      );

      CREATE TABLE IF NOT EXISTS issue_labels (
        issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY (issue_id, label_id)
      );

      CREATE TABLE IF NOT EXISTS issue_relationships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        source_issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        target_issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        relationship_type varchar(40) NOT NULL,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (source_issue_id, target_issue_id, relationship_type)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        author_id uuid REFERENCES users(id) ON DELETE SET NULL,
        body text NOT NULL,
        visibility varchar(30) NOT NULL DEFAULT 'PUBLIC',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );

      CREATE TABLE IF NOT EXISTS comment_revisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        editor_id uuid REFERENCES users(id) ON DELETE SET NULL,
        previous_body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS mentions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        mentioned_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (comment_id, mentioned_user_id)
      );

      CREATE TABLE IF NOT EXISTS issue_watchers (
        issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (issue_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
        comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
        uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
        original_filename varchar(255) NOT NULL,
        object_key text NOT NULL UNIQUE,
        mime_type varchar(255),
        byte_size bigint NOT NULL,
        checksum_sha256 char(64),
        scan_status varchar(30) NOT NULL DEFAULT 'PENDING',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT check_attachment_parent CHECK (
          (issue_id IS NOT NULL AND comment_id IS NULL) OR 
          (comment_id IS NOT NULL AND issue_id IS NULL)
        )
      );

      CREATE TABLE IF NOT EXISTS custom_fields (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        key varchar(80) NOT NULL,
        field_type varchar(40) NOT NULL,
        is_required boolean NOT NULL DEFAULT false,
        configuration jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, key)
      );

      CREATE TABLE IF NOT EXISTS issue_custom_values (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        custom_field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
        text_value text,
        number_value numeric,
        boolean_value boolean,
        date_value date,
        datetime_value timestamptz,
        json_value jsonb,
        UNIQUE (issue_id, custom_field_id)
      );

      CREATE TABLE IF NOT EXISTS saved_searches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
        name varchar(160) NOT NULL,
        visibility varchar(30) NOT NULL DEFAULT 'PRIVATE',
        query jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS dashboards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
        name varchar(160) NOT NULL,
        visibility varchar(30) NOT NULL DEFAULT 'PRIVATE',
        layout jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar(80) NOT NULL,
        title varchar(255) NOT NULL,
        body text,
        entity_type varchar(50),
        entity_id uuid,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        is_read boolean NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type varchar(80) NOT NULL,
        in_app boolean NOT NULL DEFAULT true,
        email boolean NOT NULL DEFAULT true,
        UNIQUE (organization_id, user_id, event_type)
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
        actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        entity_type varchar(60) NOT NULL,
        entity_id uuid,
        action varchar(80) NOT NULL,
        before_json jsonb,
        after_json jsonb,
        metadata jsonb NOT NULL DEFAULT '{}',
        request_id varchar(100),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS issue_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        field_name varchar(80) NOT NULL,
        old_value jsonb,
        new_value jsonb,
        change_type varchar(40) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS outbox_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        event_type varchar(100) NOT NULL,
        aggregate_type varchar(60) NOT NULL,
        aggregate_id uuid,
        payload jsonb NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        published_at timestamptz,
        processed_at timestamptz,
        attempt_count integer NOT NULL DEFAULT 0,
        last_error text
      );

      CREATE TABLE IF NOT EXISTS automation_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(160) NOT NULL,
        description text,
        is_enabled boolean NOT NULL DEFAULT true,
        trigger_type varchar(80) NOT NULL,
        conditions jsonb NOT NULL DEFAULT '[]',
        actions jsonb NOT NULL DEFAULT '[]',
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS automation_executions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
        event_id uuid,
        status varchar(30) NOT NULL DEFAULT 'PENDING',
        started_at timestamptz NOT NULL DEFAULT now(),
        finished_at timestamptz,
        result jsonb,
        error text
      );

      CREATE TABLE IF NOT EXISTS api_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        token_prefix varchar(20) NOT NULL,
        token_hash char(64) NOT NULL,
        scopes jsonb NOT NULL DEFAULT '[]',
        expires_at timestamptz,
        last_used_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash char(64) UNIQUE NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        ip_address inet,
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS integrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        provider varchar(50) NOT NULL,
        status varchar(30) NOT NULL,
        configuration jsonb NOT NULL DEFAULT '{}',
        secret_reference text,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS repositories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
        external_id varchar(255),
        owner varchar(255),
        name varchar(255),
        default_branch varchar(255),
        web_url text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS code_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
        external_type varchar(40) NOT NULL,
        external_id varchar(255) NOT NULL,
        title varchar(500),
        url text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ai_suggestions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
        type varchar(60) NOT NULL,
        model varchar(160),
        input_hash char(64),
        result jsonb NOT NULL,
        confidence numeric(5,4),
        status varchar(30) NOT NULL DEFAULT 'PENDING',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      -- Embeddings: Uses vector(1536) type conditionally depending on extension
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
          CREATE TABLE IF NOT EXISTS embeddings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
            entity_type varchar(60) NOT NULL,
            entity_id uuid NOT NULL,
            content_hash char(64) NOT NULL,
            model varchar(160) NOT NULL,
            vector vector(1536),
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (entity_type, entity_id, model)
          );
        ELSE
          CREATE TABLE IF NOT EXISTS embeddings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
            entity_type varchar(60) NOT NULL,
            entity_id uuid NOT NULL,
            content_hash char(64) NOT NULL,
            model varchar(160) NOT NULL,
            vector float8[],
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (entity_type, entity_id, model)
          );
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS webhooks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        url text NOT NULL,
        secret_reference text NOT NULL,
        events jsonb NOT NULL,
        is_enabled boolean NOT NULL DEFAULT true,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event_id uuid,
        attempt_count integer NOT NULL DEFAULT 0,
        status varchar(30) NOT NULL DEFAULT 'PENDING',
        response_status integer,
        response_body text,
        next_attempt_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        delivered_at timestamptz
      );

      CREATE TABLE IF NOT EXISTS import_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        source_type varchar(40) NOT NULL,
        status varchar(30) NOT NULL DEFAULT 'PENDING',
        source_object_key text,
        total_records integer,
        successful_records integer,
        failed_records integer,
        error_report_object_key text,
        created_at timestamptz NOT NULL DEFAULT now(),
        started_at timestamptz,
        finished_at timestamptz
      );
    `);

    // 3. Create Performance & Lookup Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_members_lookup ON organization_members (organization_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_lookup ON project_members (project_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_issues_project_number ON issues (project_id, number);
      CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issues (project_id, status_id);
      CREATE INDEX IF NOT EXISTS idx_issues_project_assignee ON issues (project_id, assignee_id);
      CREATE INDEX IF NOT EXISTS idx_issues_project_priority ON issues (project_id, priority_id);
      CREATE INDEX IF NOT EXISTS idx_issues_project_created ON issues (project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_issues_project_updated ON issues (project_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_issue_created ON comments (issue_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_events_org_created ON audit_events (organization_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events (published_at, occurred_at) WHERE published_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries (status, next_attempt_at) WHERE status = 'RETRY';
      CREATE INDEX IF NOT EXISTS idx_issue_relationships_source ON issue_relationships (source_issue_id);
      CREATE INDEX IF NOT EXISTS idx_issue_relationships_target ON issue_relationships (target_issue_id);
      
      -- Create vector index conditionally if pgvector exists and column has dimensions
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
          BEGIN
            CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING hnsw (vector vector_cosine_ops);
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`
      DROP TABLE IF EXISTS import_jobs CASCADE;
      DROP TABLE IF EXISTS webhook_deliveries CASCADE;
      DROP TABLE IF EXISTS webhooks CASCADE;
      DROP TABLE IF EXISTS embeddings CASCADE;
      DROP TABLE IF EXISTS ai_suggestions CASCADE;
      DROP TABLE IF EXISTS code_links CASCADE;
      DROP TABLE IF EXISTS repositories CASCADE;
      DROP TABLE IF EXISTS integrations CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS api_tokens CASCADE;
      DROP TABLE IF EXISTS automation_executions CASCADE;
      DROP TABLE IF EXISTS automation_rules CASCADE;
      DROP TABLE IF EXISTS outbox_events CASCADE;
      DROP TABLE IF EXISTS issue_history CASCADE;
      DROP TABLE IF EXISTS audit_events CASCADE;
      DROP TABLE IF EXISTS notification_preferences CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS dashboards CASCADE;
      DROP TABLE IF EXISTS saved_searches CASCADE;
      DROP TABLE IF EXISTS issue_custom_values CASCADE;
      DROP TABLE IF EXISTS custom_fields CASCADE;
      DROP TABLE IF EXISTS attachments CASCADE;
      DROP TABLE IF EXISTS issue_watchers CASCADE;
      DROP TABLE IF EXISTS mentions CASCADE;
      DROP TABLE IF EXISTS comment_revisions CASCADE;
      DROP TABLE IF EXISTS comments CASCADE;
      DROP TABLE IF EXISTS issue_relationships CASCADE;
      DROP TABLE IF EXISTS issue_labels CASCADE;
      DROP TABLE IF EXISTS labels CASCADE;
      DROP TABLE IF EXISTS issues CASCADE;
      DROP TABLE IF EXISTS milestones CASCADE;
      DROP TABLE IF EXISTS versions CASCADE;
      DROP TABLE IF EXISTS components CASCADE;
      DROP TABLE IF EXISTS workflow_transitions CASCADE;
      DROP TABLE IF EXISTS statuses CASCADE;
      DROP TABLE IF EXISTS severities CASCADE;
      DROP TABLE IF EXISTS priorities CASCADE;
      DROP TABLE IF EXISTS issue_types CASCADE;
      DROP TABLE IF EXISTS project_teams CASCADE;
      DROP TABLE IF EXISTS team_members CASCADE;
      DROP TABLE IF EXISTS teams CASCADE;
      DROP TABLE IF EXISTS project_members CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS organization_invitations CASCADE;
      DROP TABLE IF EXISTS organization_members CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS organizations CASCADE;
    `);
  }
}
