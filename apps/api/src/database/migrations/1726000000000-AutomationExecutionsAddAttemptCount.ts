import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutomationExecutionsAddAttemptCount1726000000000 implements MigrationInterface {
  name = 'AutomationExecutionsAddAttemptCount1726000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE automation_executions
      ADD COLUMN attempt_count integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE automation_executions
      DROP COLUMN attempt_count;
    `);
  }
}
