# Skill: Parsing de Workflows YAML

## Objetivo
Converter arquivos YAML do GitHub Actions em grafos estruturados de nós e arestas, prontos para renderização no React Flow e execução pelo `act`.

## Estrutura de um Workflow GitHub Actions

```yaml
name: CI Pipeline
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: npm install
      - name: Build
        run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: npm test
```

## Tipos TypeScript do Grafo

```typescript
interface WorkflowDefinition {
  name: string;
  filePath: string;
  on: WorkflowTrigger;
  jobs: Record<string, JobDefinition>;
}

interface JobDefinition {
  id: string;
  name?: string;
  runsOn: string;
  needs?: string[];
  steps: StepDefinition[];
  if?: string;
}

interface StepDefinition {
  id?: string;
  name?: string;
  uses?: string;       // Action externa
  run?: string;        // Comando shell
  with?: Record<string, string>;
  env?: Record<string, string>;
  if?: string;
}

interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowNode {
  id: string;          // 'jobId' ou 'jobId/stepIndex'
  type: 'job' | 'step';
  label: string;
  parentId?: string;   // jobId pai (para steps)
  data: JobDefinition | StepDefinition;
}

interface WorkflowEdge {
  id: string;
  source: string;      // jobId de origem
  target: string;      // jobId de destino
  type: 'needs';       // dependência
}
```

## Implementação do Parser

```typescript
import * as yaml from 'js-yaml';
import * as fs from 'fs';

function parseWorkflow(filePath: string): WorkflowDefinition {
  const content = fs.readFileSync(filePath, 'utf-8');
  const raw = yaml.load(content) as Record<string, unknown>;

  if (!raw || typeof raw !== 'object') {
    throw new Error(`YAML inválido em: ${filePath}`);
  }

  const jobs: Record<string, JobDefinition> = {};
  const rawJobs = raw.jobs as Record<string, unknown>;

  Object.entries(rawJobs ?? {}).forEach(([jobId, rawJob]) => {
    const job = rawJob as Record<string, unknown>;
    jobs[jobId] = {
      id: jobId,
      name: job.name as string | undefined,
      runsOn: job['runs-on'] as string,
      needs: Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs as string] : [],
      steps: parseSteps(job.steps as unknown[]),
      if: job.if as string | undefined,
    };
  });

  return {
    name: raw.name as string ?? filePath,
    filePath,
    on: raw.on as WorkflowTrigger,
    jobs,
  };
}

function parseSteps(rawSteps: unknown[]): StepDefinition[] {
  return (rawSteps ?? []).map((s, index) => {
    const step = s as Record<string, unknown>;
    return {
      id: (step.id as string) ?? `step-${index}`,
      name: step.name as string | undefined,
      uses: step.uses as string | undefined,
      run: step.run as string | undefined,
      with: step.with as Record<string, string> | undefined,
      env: step.env as Record<string, string> | undefined,
      if: step.if as string | undefined,
    };
  });
}
```

## Resolução de Dependências

```typescript
function buildGraph(workflow: WorkflowDefinition): WorkflowGraph {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  Object.values(workflow.jobs).forEach((job) => {
    nodes.push({ id: job.id, type: 'job', label: job.name ?? job.id, data: job });

    job.steps.forEach((step) => {
      nodes.push({
        id: `${job.id}/${step.id}`,
        type: 'step',
        label: step.name ?? step.id ?? 'step',
        parentId: job.id,
        data: step,
      });
    });

    (job.needs ?? []).forEach((dep) => {
      edges.push({ id: `${dep}->${job.id}`, source: dep, target: job.id, type: 'needs' });
    });
  });

  return { nodes, edges };
}
```

## Descoberta de Workflows

```typescript
import * as glob from 'glob';

function discoverWorkflows(workspaceRoot: string): string[] {
  return glob.sync('.github/workflows/*.{yml,yaml}', { cwd: workspaceRoot });
}
```

## Output
- `WorkflowDefinition` tipada a partir de qualquer YAML de GitHub Actions
- Grafo com nós de job/step e arestas de dependência
- Erros descritivos para YAML inválido