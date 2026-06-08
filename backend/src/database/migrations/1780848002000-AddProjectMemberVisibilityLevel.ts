import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectMemberVisibilityLevel1780848002000 implements MigrationInterface {
  name = 'AddProjectMemberVisibilityLevel1780848002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE project_visibility_level AS ENUM (
          'INTERNAL',
          'PARTNER',
          'CUSTOMER'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "project_members"
      ADD COLUMN IF NOT EXISTS "visibility_level" project_visibility_level NOT NULL DEFAULT 'INTERNAL'
    `);

    await queryRunner.query(`
      UPDATE "project_members"
      SET "visibility_level" = 'INTERNAL'
      WHERE "visibility_level" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_members"
      DROP COLUMN IF EXISTS "visibility_level"
    `);

    await queryRunner.query('DROP TYPE IF EXISTS project_visibility_level');
  }
}
