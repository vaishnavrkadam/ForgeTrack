import { MigrationInterface, QueryRunner } from 'typeorm';

export class CiRunsAndReleaseIntelligence1724772000000 implements MigrationInterface {
  name = 'CiRunsAndReleaseIntelligence1724772000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ci_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
        commit_sha varchar(64) NOT NULL,
        branch varchar(255),
        workflow_name varchar(255),
        run_number varchar(50),
        status varchar(30) NOT NULL DEFAULT 'PENDING',
        conclusion varchar(30),
        url text,
        metadata jsonb NOT NULL DEFAULT '{}',
        started_at timestamptz,
        finished_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ci_runs_commit ON ci_runs (commit_sha);
      CREATE INDEX IF NOT EXISTS idx_ci_runs_project_status ON ci_runs (project_id, status);
      CREATE INDEX IF NOT EXISTS idx_ci_runs_org ON ci_runs (organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS ci_runs CASCADE;
    `);
  }
}
