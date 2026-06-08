import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDependencyTimelineColumns1780848001000 implements MigrationInterface {
  name = 'AddDependencyTimelineColumns1780848001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE dependency_type AS ENUM (
          'finish_to_start',
          'start_to_start',
          'finish_to_finish',
          'start_to_finish'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "dependencies"
      ADD COLUMN IF NOT EXISTS "source_task_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "dependencies"
      ADD COLUMN IF NOT EXISTS "target_task_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "dependencies"
      ADD COLUMN IF NOT EXISTS "dependency_type" dependency_type NOT NULL DEFAULT 'finish_to_start'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_dependencies_source_task'
        ) THEN
          ALTER TABLE "dependencies"
          ADD CONSTRAINT "FK_dependencies_source_task"
          FOREIGN KEY ("source_task_id") REFERENCES "tasks"("id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_dependencies_target_task'
        ) THEN
          ALTER TABLE "dependencies"
          ADD CONSTRAINT "FK_dependencies_target_task"
          FOREIGN KEY ("target_task_id") REFERENCES "tasks"("id");
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dependencies"
      DROP CONSTRAINT IF EXISTS "FK_dependencies_target_task"
    `);

    await queryRunner.query(`
      ALTER TABLE "dependencies"
      DROP CONSTRAINT IF EXISTS "FK_dependencies_source_task"
    `);

    await queryRunner.query(`
      ALTER TABLE "dependencies"
      DROP COLUMN IF EXISTS "dependency_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "dependencies"
      DROP COLUMN IF EXISTS "target_task_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "dependencies"
      DROP COLUMN IF EXISTS "source_task_id"
    `);

    await queryRunner.query('DROP TYPE IF EXISTS dependency_type');
  }
}
