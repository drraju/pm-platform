import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('dependency domain architecture', () => {
  const taskModule = join(__dirname, '..');
  const domainFiles = [
    'dependency-domain.ts',
    'dependency-health.evaluator.ts',
    'dependency-impact.analyzer.ts',
    'dependency-ordering.policy.ts',
  ];

  it.each(domainFiles)(
    '%s remains framework and persistence independent',
    (file) => {
      const source = readFileSync(join(taskModule, file), 'utf8');

      expect(source).not.toMatch(/from ['"]@nestjs\//);
      expect(source).not.toMatch(/from ['"]typeorm['"]/);
      expect(source).not.toMatch(/@(Entity|Column|Injectable|Controller)\b/);
      expect(source).not.toMatch(/Repository</);
    },
  );

  it('reuses the canonical TaskDependency aggregate without defining another entity', () => {
    const source = readFileSync(
      join(taskModule, 'dependency-domain.ts'),
      'utf8',
    );
    const canonicalEntity = readFileSync(
      join(taskModule, 'entities', 'task-dependency.entity.ts'),
      'utf8',
    );

    expect(canonicalEntity).toContain("@Entity({ name: 'task_dependencies' })");
    expect(source).not.toContain("@Entity({ name: 'task_dependencies' })");
  });

  it.each([
    'dependency-application.ts',
    'dependency-projection.composer.ts',
    'dependency-query.service.ts',
  ])('%s contains no transport concerns', (file) => {
    const source = readFileSync(join(taskModule, file), 'utf8');

    expect(source).not.toMatch(/\/dto\//i);
    expect(source).not.toMatch(/@(Controller|Get|Post|Patch|Delete|Api\w*)\b/);
    expect(source).not.toMatch(/(BadRequest|NotFound|Conflict|Http)Exception/);
    expect(source).not.toMatch(/class-validator|@nestjs\/swagger/);
  });

  it('keeps dependency controllers repository- and entity-free', () => {
    const source = readFileSync(
      join(taskModule, 'dependencies.controller.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/Repository<|InjectRepository|typeorm/);
    expect(source).not.toMatch(/entities\//);
    expect(source).not.toMatch(/TaskDependency\b/);
    expect(source).toContain('DependencyQueryService');
    expect(source).toContain('DependencyResponseMapper');
  });
});
