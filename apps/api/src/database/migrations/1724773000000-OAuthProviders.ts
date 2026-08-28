import { MigrationInterface, QueryRunner } from 'typeorm';

export class OAuthProviders1724773000000 implements MigrationInterface {
  name = 'OAuthProviders1724773000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider varchar(30);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id varchar(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth 
        ON users (oauth_provider, oauth_provider_id) 
        WHERE oauth_provider IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_oauth;
      ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
      ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider_id;
      ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider;
    `);
  }
}
