import * as fs from 'fs';
import * as path from 'path';

type SourceFile = {
  content: string;
  packageName: string;
  relativePath: string;
};

const aiRoot = path.resolve(process.cwd(), 'src/ai');
const packageNames = [
  'gateway',
  'assistant',
  'capabilities',
  'conversation',
  'execution',
  'playground',
  'providers',
  'context',
  'prompts',
  'skills',
  'mcp',
  'common',
  'security',
  'governance',
  'monitoring',
];
const forbiddenPatterns = [
  { pattern: /from ['"][^'"]*modules/ },
  { pattern: /typeorm/ },
  { pattern: /Repository/ },
  { pattern: /@Controller/ },
  {
    allowedPaths: ['providers/http/ai-http-client.ts'],
    pattern: /fetch\(/,
  },
  { pattern: /axios/ },
  {
    allowedPaths: [
      'ai.module.ts',
      'common/ai-config.service.ts',
      'providers/index.ts',
      'providers/openai/index.ts',
      'providers/openai/openai-error.mapper.ts',
      'providers/openai/openai-provider.adapter.ts',
      'providers/openai/openai-provider.types.ts',
      'providers/openai/openai-request.mapper.ts',
      'providers/openai/openai-response.mapper.ts',
    ],
    pattern: /OpenAI/,
  },
  { pattern: /Claude/ },
  { pattern: /Gemini/ },
  {
    allowedPaths: ['common/ai-config.service.ts'],
    pattern: /http(s)?:\/\//,
  },
  { pattern: /WebSocket/ },
  { pattern: /JSON-RPC/ },
  { pattern: /SSE/ },
];
const forbiddenPackageImports: Record<string, readonly string[]> = {
  common: packageNames.filter((packageName) => packageName !== 'common'),
  assistant: ['providers', 'context', 'prompts', 'skills', 'mcp'],
  conversation: ['gateway', 'providers', 'context', 'prompts', 'skills', 'mcp'],
  context: ['gateway', 'providers', 'mcp', 'prompts', 'skills'],
  mcp: ['providers'],
  prompts: ['context', 'providers', 'mcp', 'skills'],
  providers: ['gateway', 'context', 'prompts', 'skills', 'mcp'],
  skills: ['providers', 'mcp'],
};

const readSourceFiles = (directory: string): SourceFile[] => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: SourceFile[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...readSourceFiles(entryPath));
      continue;
    }

    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) {
      continue;
    }

    const relativePath = path.relative(aiRoot, entryPath);
    const packageName = relativePath.split(path.sep)[0];
    files.push({
      content: fs.readFileSync(entryPath, 'utf8'),
      packageName,
      relativePath,
    });
  }

  return files;
};

const importedAiPackageNames = (file: SourceFile): string[] => {
  const imports = [...file.content.matchAll(/from ['"]([^'"]+)['"]/g)];

  return imports
    .map((match) => match[1])
    .filter((importPath) => importPath.startsWith('..'))
    .map((importPath) =>
      path.normalize(path.join(path.dirname(file.relativePath), importPath)),
    )
    .filter((normalizedImportPath) => !normalizedImportPath.startsWith('..'))
    .map((normalizedImportPath) => normalizedImportPath.split(path.sep)[0])
    .filter((packageName) => packageNames.includes(packageName));
};

describe('AI dependency guardrails', () => {
  const sourceFiles = readSourceFiles(aiRoot);

  it('does not import forbidden platform or runtime dependencies', () => {
    const violations = sourceFiles.flatMap((file) =>
      forbiddenPatterns
        .filter(
          ({ allowedPaths = [], pattern }) =>
            pattern.test(file.content) &&
            !allowedPaths.includes(file.relativePath),
        )
        .map(({ pattern }) => `${file.relativePath}: ${pattern.source}`),
    );

    expect(violations).toEqual([]);
  });

  it('preserves package dependency direction', () => {
    const violations = sourceFiles.flatMap((file) => {
      const forbiddenImports = forbiddenPackageImports[file.packageName] ?? [];

      return importedAiPackageNames(file)
        .filter((packageName) => forbiddenImports.includes(packageName))
        .map(
          (packageName) =>
            `${file.relativePath}: ${file.packageName} -> ${packageName}`,
        );
    });

    expect(violations).toEqual([]);
  });

  it('has no package-level circular dependencies', () => {
    const graph = new Map<string, Set<string>>();

    for (const file of sourceFiles) {
      const imports = importedAiPackageNames(file).filter(
        (packageName) => packageName !== file.packageName,
      );

      if (!graph.has(file.packageName)) {
        graph.set(file.packageName, new Set());
      }

      for (const packageName of imports) {
        graph.get(file.packageName)?.add(packageName);
      }
    }

    const cycles: string[] = [];
    const visit = (
      packageName: string,
      pathStack: readonly string[],
      visited: Set<string>,
    ) => {
      if (pathStack.includes(packageName)) {
        cycles.push([...pathStack, packageName].join(' -> '));
        return;
      }

      if (visited.has(packageName)) {
        return;
      }

      visited.add(packageName);

      for (const dependency of graph.get(packageName) ?? []) {
        visit(dependency, [...pathStack, packageName], visited);
      }
    };

    for (const packageName of graph.keys()) {
      visit(packageName, [], new Set());
    }

    expect(cycles).toEqual([]);
  });
});
