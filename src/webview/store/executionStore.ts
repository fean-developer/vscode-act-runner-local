import { create } from 'zustand';
import type { ActEvent, StepUpdatePayload, JobUpdatePayload, LogPayload, ExecutionStartPayload, ExecutionEndPayload } from '../../types/events.types';
import type { ExecutionRecord } from '../../types/execution.types';
import type { WorkflowGraph } from '../../types/workflow.types';

export type NodeStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';
export type AppView = 'graph' | 'history' | 'env' | 'webhook' | 'templates';

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

  // Ações
  setView: (view: AppView) => void;
  handleEvent: (event: ActEvent) => void;
  resetExecution: () => void;
  setHistory: (records: ExecutionRecord[]) => void;
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

  setView: (view) => set({ currentView: view }),

  setHistory: (records) => set({ history: records }),

  resetExecution: () =>
    set({ execution: initialExecution, nodes: [], edges: [], logs: [] }),

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
        }));
        break;

      case 'job:update':
        set((s) => ({
          nodes: updateNode(s.nodes, event.payload.jobId, event.payload),
        }));
        break;

      case 'step:update':
        set((s) => ({
          nodes: updateNode(s.nodes, `${event.payload.jobId}/${event.payload.stepId}`, event.payload),
        }));
        break;

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

      case 'execution:end':
        set((s) => ({
          execution: { ...s.execution, status: event.payload.status },
        }));
        break;

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
  return nodes.map((n) => (n.id === nodeId ? { ...n, ...update } : n));
}
