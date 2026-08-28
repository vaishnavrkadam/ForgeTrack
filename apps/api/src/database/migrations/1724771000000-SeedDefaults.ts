import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaults1724771000000 implements MigrationInterface {
  name = 'SeedDefaults1724771000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Seed Default Organization (known UUID for system tasks)
    const orgId = '00000000-0000-0000-0000-000000000000';
    await queryRunner.query(`
      INSERT INTO organizations (id, slug, name, description, settings)
      VALUES (
        '${orgId}',
        'system',
        'ForgeTrack System',
        'Default system administration workspace',
        '{}'
      ) ON CONFLICT (slug) DO NOTHING;
    `);

    // 2. Seed Default Admin User (known UUID)
    // password_hash is a placeholder representing "password" (hashed)
    const userId = '11111111-1111-1111-1111-111111111111';
    await queryRunner.query(`
      INSERT INTO users (id, email, display_name, password_hash, status, email_verified_at)
      VALUES (
        '${userId}',
        'admin@forgetrack.dev',
        'System Administrator',
        '$argon2id$v=19$m=65536,t=3,p=4$6FvFk...placeholder', 
        'ACTIVE',
        now()
      ) ON CONFLICT (email) DO NOTHING;
    `);

    // 3. Link Admin to Organization as OWNER
    await queryRunner.query(`
      INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
      VALUES (
        '${orgId}',
        '${userId}',
        'OWNER',
        'ACTIVE',
        now()
      ) ON CONFLICT (organization_id, user_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const orgId = '00000000-0000-0000-0000-000000000000';
    const userId = '11111111-1111-1111-1111-111111111111';
    await queryRunner.query(`DELETE FROM organization_members WHERE organization_id = '${orgId}' AND user_id = '${userId}';`);
    await queryRunner.query(`DELETE FROM users WHERE id = '${userId}';`);
    await queryRunner.query(`DELETE FROM organizations WHERE id = '${orgId}';`);
  }
}
