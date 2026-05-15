import { create } from 'zustand';
import type { ActEvent, StepUpdatePayload, JobUpdatePayload, LogPayload, ExecutionStartPayload, ExecutionEndPayload } from '../../types/events.types';
import type { ExecutionRecord } from '../../types/execution.types';
import type { WorkflowGraph } from '../../types/workflow.types';

export type NodeStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';
export type AppView = 'graph' | 'history' | 'env';

export interface GraphNode {
  id: string;
  type: 'job' | 'step';
  label: string;
  parentId?: string;
  status: NodeStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface LogLine {
  id: string;
  executionId: string;
  jobId?: string;
  stepId?: string;
  line: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  timestamp: string;
}

export interface ExecutionState {
  executionId: string | null;
  status: 'idle' | 'running' | 'success' | 'failed' | 'cancelled';
  workflowName: string;
  workflowPath: string | null;
  startedAt: string | null;
}

interface StoreState {
  // Navegação
  currentView: AppView;

  // Estado da execução atual
  execution: ExecutionState;

  // Grafo de workflow
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Logs
  logs: LogLine[];

  // Histórico
  history: ExecutionRecord[];
  // Logs por execução (salvo ao final de cada execução, para exibir no histórico)
  historyLogs: Record<string, string[]>;

  // Filtro de log ativo (job e/ou step selecionado no grafo)
  logFilter: { jobId: string; stepLabel?: string; label: string } | null;

  // Ações
  setView: (view: AppView) => void;
  handleEvent: (event: ActEvent) => void;
  resetExecution: () => void;
  setHistory: (records: ExecutionRecord[]) => void;
  setLogFilter: (filter: { jobId: string; stepLabel?: string; label: string } | null) => void;
}

const initialExecution: ExecutionState = {
  executionId: null,
  status: 'idle',
  workflowName: '',
  workflowPath: null,
  startedAt: null,
};

let logCounter = 0;

export const useExecutionStore = create<StoreState>((set) => ({
  currentView: 'graph',
  execution: initialExecution,
  nodes: [],
  edges: [],
  logs: [],
  history: [],
  historyLogs: {},
  logFilter: null,

  setView: (view) => set({ currentView: view }),

  setHistory: (records) => set({ history: records }),

  setLogFilter: (filter) => set({ logFilter: filter }),

  resetExecution: () =>
    set({ execution: initialExecution, nodes: [], edges: [], logs: [], logFilter: null }),

  handleEvent: (event) => {
    switch (event.type) {
      case 'execution:start':
        set((s) => ({
          execution: {
            executionId: event.payload.executionId,
            status: 'running',
            workflowName: event.payload.workflowName,
            workflowPath: event.payload.workflowPath,
            startedAt: event.payload.triggeredAt,
          },
          logs: [],
          nodes: buildInitialNodes(event.payload),
          edges: buildInitialEdges(event.payload),
          currentView: 'graph',
          logFilter: null, // limpar filtro ao iniciar nova execução
        }));
        break;

      case 'job:update': {
        const { jobId, jobName, status, startedAt, completedAt, outerJobId } = event.payload;
        set((s) => {
          // Busca por id exato, label exato OU template match
          // (ex: "Build (dotnet)" casa com "Build (${{ needs.setup.outputs.language }})")
          const matchingNode = s.nodes.find(
            n => n.type === 'job' && (
              n.id === jobId ||
              n.label === jobId ||
              matchesTemplate(jobId, n.label)
            )
          );
          if (!matchingNode) {
            // Job não existe → criar dinamicamente (ex: inner job de reusable workflow)
            const newJob: GraphNode = {
              id: jobId, type: 'job', label: jobName ?? jobId,
              parentId: outerJobId,
              status: status as NodeStatus, startedAt, completedAt,
            };
            return { nodes: [...s.nodes, newJob] };
          }
          const TERMINAL: NodeStatus[] = ['success', 'failed'];
          return {
            nodes: s.nodes.map(n => {
              if (n.id !== matchingNode.id) return n;
              if (status === 'running' && TERMINAL.includes(n.status)) return n;
              // Resolver label de template para o nome real
              // ex: "Build (${{ needs.setup.outputs.language }})" → "Build (dotnet)"
              const resolvedLabel = matchesTemplate(jobId, n.label) ? (jobName ?? jobId) : n.label;
              return {
                ...n,
                label: resolvedLabel,
                status: (status as NodeStatus) ?? n.status,
                ...(startedAt && { startedAt }),
                ...(completedAt && { completedAt }),
              };
            }),
          };
        });
        break;
      }

      case 'step:update': {
        const { jobId, stepId, stepName, status, startedAt, completedAt, duration } = event.payload;
        const nodeId = `${jobId}/${stepId}`;
        // Act prefixa steps definidos pelo usuário com "Main " (ex: "Checkout" → "Main Checkout").
        // Normalizamos para corresponder aos nodes criados a partir do YAML.
        const normalizedStep = normalizeStepName(stepName);
        set((s) => {
          let nodes = s.nodes;
          // Garantir que o job pai existe (pode ser de reusable ou ter nome com template)
          const parentExists = nodes.some(n => n.type === 'job' && (
            n.id === jobId || n.label === jobId || matchesTemplate(jobId, n.label)
          ));
          if (!parentExists) {
            nodes = [...nodes, { id: jobId, type: 'job', label: jobId, status: 'running' as NodeStatus }];
          }
          const parentNode = nodes.find(n => n.type === 'job' && (
            n.id === jobId || n.label === jobId || matchesTemplate(jobId, n.label)
          ));
          const realParentId = parentNode?.id ?? jobId;
          // Verificar se o step já existe — também tenta sem o prefixo "Main "
          const matchingStep = nodes.find(
            n => n.type === 'step' && (
              n.id === nodeId ||
              (n.parentId === realParentId && (n.label === stepName || n.label === normalizedStep))
            )
          );
          if (!matchingStep) {
            const newStep: GraphNode = {
              id: nodeId, type: 'step', label: normalizedStep, parentId: realParentId,
              status: status as NodeStatus, startedAt, completedAt, duration,
            };
            return { nodes: [...nodes, newStep] };
          }
          return { nodes: updateNode(nodes, nodeId, event.payload) };
        });
        break;
      }

      case 'log':
        set((s) => ({
          logs: [
            ...s.logs.slice(-999), // manter apenas os últimos 1000 logs
            {
              id: `log-${++logCounter}`,
              executionId: event.payload.executionId,
              jobId: event.payload.jobId,
              stepId: event.payload.stepId,
              line: event.payload.line,
              level: event.payload.level,
              timestamp: event.payload.timestamp,
            },
          ],
        }));
        break;

      case 'execution:end': {
        const { executionId, status: endStatus } = event.payload;
        const nodeStatus: NodeStatus = endStatus === 'success' ? 'success' : 'failed';
        set((s) => ({
          execution: { ...s.execution, status: endStatus },
          // Fallback: any node still in 'running' at execution end transitions to final state.
          nodes: endStatus === 'cancelled'
            ? s.nodes
            : s.nodes.map((n) => n.status === 'running' ? { ...n, status: nodeStatus } : n),
          // Salvar os logs desta execução para exibir no histórico
          historyLogs: {
            ...s.historyLogs,
            [executionId]: s.logs.map((l) => l.line),
          },
        }));
        break;
      }

      case 'execution:error':
        set((s) => ({
          execution: { ...s.execution, status: 'failed' },
          logs: [
            ...s.logs,
            {
              id: `log-${++logCounter}`,
              executionId: event.payload.executionId,
              line: `❌ Erro crítico: ${event.payload.error}`,
              level: 'error',
              timestamp: new Date().toISOString(),
            },
          ],
        }));
        break;
    }
  },
}));

// ─── Helpers do store ─────────────────────────────────────────────────────

function buildInitialNodes(payload: ExecutionStartPayload): GraphNode[] {
  const nodes: GraphNode[] = [];
  payload.jobs.forEach((job) => {
    nodes.push({ id: job.id, type: 'job', label: job.name ?? job.id, status: 'idle' });
    job.steps.forEach((step, i) => {
      const stepId = step.id ?? `step-${i}`;
      nodes.push({
        id: `${job.id}/${stepId}`,
        type: 'step',
        label: step.name ?? step.uses ?? step.run?.split('\n')[0] ?? stepId,
        parentId: job.id,
        status: 'idle',
      });
    });
  });
  return nodes;
}

/**
 * Act CLI prefixa steps definidos pelo usuário com "Main " no output
 * (ex: "Checkout" no YAML → "Main Checkout" no bracket).
 * Remove esse prefixo para corresponder corretamente aos nodes do YAML.
 */
function normalizeStepName(name: string): string {
  return name.replace(/^Main\s+/, '');
}

/**
 * Verifica se um nome resolvido (ex: "Build (dotnet)") corresponde a um template
 * GitHub Actions (ex: "Build (${{ needs.setup.outputs.language }})").
 * Compara o prefixo e sufixo ao redor da(s) expressão(ões) ${{ }}.
 */
function matchesTemplate(resolved: string, template: string): boolean {
  if (!template.includes('${{')) return false;
  const exprStart = template.indexOf('${{');
  const exprEnd = template.lastIndexOf('}}');
  if (exprEnd < 0) return false;
  const prefix = template.slice(0, exprStart);
  const suffix = template.slice(exprEnd + 2);
  return (
    resolved.startsWith(prefix) &&
    resolved.endsWith(suffix) &&
    resolved.length >= prefix.length + suffix.length
  );
}

function buildInitialEdges(payload: ExecutionStartPayload): GraphEdge[] {
  const edges: GraphEdge[] = [];
  payload.jobs.forEach((job) => {
    (job.needs ?? []).forEach((dep) => {
      edges.push({ id: `${dep}->${job.id}`, source: dep, target: job.id });
    });
  });
  return edges;
}

function updateNode(
  nodes: GraphNode[],
  nodeId: string,
  update: Partial<Pick<GraphNode, 'status' | 'startedAt' | 'completedAt' | 'duration'>>
): GraphNode[] {
  // act outputs job display names (name: field) but node ids are YAML keys.
  // For steps, nodeId is "displayJobName/stepId" while node.id is "yamlKey/stepId".
  // Match strategy: exact id → exact label → for compound "job/step" ids, match by
  // comparing the step part only within the correct parent job (matched by label).
  const exactMatch = nodes.some((n) => n.id === nodeId);
  const labelMatch = !exactMatch && nodes.some((n) => n.label === nodeId);
  const TERMINAL: NodeStatus[] = ['success', 'failed'];

  // For compound step ids ("jobDisplayName/stepId"), try matching by parent label + step suffix
  const slash = nodeId.indexOf('/');
  const jobDisplayName = slash >= 0 ? nodeId.slice(0, slash) : null;
  const stepSuffix     = slash >= 0 ? nodeId.slice(slash + 1) : null;

  return nodes.map((n) => {
    let isTarget: boolean;

    if (exactMatch) {
      isTarget = n.id === nodeId;
    } else if (labelMatch) {
      isTarget = n.label === nodeId;
    } else if (jobDisplayName !== null && stepSuffix !== null) {
      // Match step node: parent must have the job display name as id OR label,
      // and this node's id suffix (after YAML job key/) must match the step suffix.
      const parentNode = nodes.find((p) => p.type === 'job' && (
        p.id === jobDisplayName || p.label === jobDisplayName || matchesTemplate(jobDisplayName!, p.label)
      ));
      if (parentNode && n.parentId === parentNode.id) {
        // n.id = "yamlKey/stepId" — check if our stepSuffix is contained in n.id after the slash
        const nStepPart = n.id.slice(n.id.indexOf('/') + 1);
        const normalizedSuffix = normalizeStepName(stepSuffix!);
        isTarget = nStepPart === stepSuffix || nStepPart === normalizedSuffix ||
                   n.label === stepSuffix || n.label === normalizedSuffix;
      } else {
        isTarget = false;
      }
    } else {
      isTarget = false;
    }

    if (!isTarget) return n;
    // Don't downgrade a terminal state back to running
    if (update.status === 'running' && TERMINAL.includes(n.status)) return n;
    return { ...n, ...update };
  });
}
