import { readFileSync } from 'fs';
import { join } from 'path';

const bootstrapSchemaPath = join(
  __dirname,
  '..',
  'schema',
  '001_initial_schema.sql',
);
const hardeningMigrationPath = join(
  __dirname,
  '..',
  'migrations',
  '012_v1_0_6_phase_3_1_baseline_persistence_hardening.sql',
);

describe('baseline persistence architecture SQL', () => {
  it('keeps baseline rows when live tasks are deleted', () => {
    const bootstrapSchema = readFileSync(bootstrapSchemaPath, 'utf8');
    const hardeningMigration = readFileSync(hardeningMigrationPath, 'utf8');

    expect(bootstrapSchema).toContain(
      'task_id UUID REFERENCES tasks(id) ON DELETE SET NULL',
    );
    expect(hardeningMigration).toContain(
      'FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL',
    );
    expect(hardeningMigration).toContain(
      'ALTER COLUMN task_id DROP NOT NULL',
    );
  });

  it('allows only lifecycle metadata changes on baseline headers', () => {
    const bootstrapSchema = readFileSync(bootstrapSchemaPath, 'utf8');
    const hardeningMigration = readFileSync(hardeningMigrationPath, 'utf8');

    for (const sql of [bootstrapSchema, hardeningMigration]) {
      expect(sql).toContain("CHECK (status IN ('draft', 'approved', 'superseded'))");
      expect(sql).toContain("OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at");
      expect(sql).toContain("OR NEW.deleted_by_id IS DISTINCT FROM OLD.deleted_by_id");
      expect(sql).toContain(
        "RAISE EXCEPTION 'Project baseline status must be a lifecycle status'",
      );
    }
  });

  it('keeps baseline task snapshots fully immutable', () => {
    const bootstrapSchema = readFileSync(bootstrapSchemaPath, 'utf8');
    const hardeningMigration = readFileSync(hardeningMigrationPath, 'utf8');

    for (const sql of [bootstrapSchema, hardeningMigration]) {
      expect(sql).toContain(
        "RAISE EXCEPTION 'Project baseline tasks are immutable'",
      );
      expect(sql).toContain('BEFORE UPDATE OR DELETE ON project_baseline_tasks');
    }
  });
});
