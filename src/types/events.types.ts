// Tipos do sistema de eventos — discriminated unions para type-safety total

import type { ExecutionStatus, JobStatus, StepStatus } from './execution.types';
import type { JobDefinition } from './workflow.types';

export interface ExecutionStartPayload {
  executionId: string;
  workflowPath: string;
  workflowName: string;
  jobs: JobDefinition[];
  triggeredAt: string;
}

export interface JobUpdatePayload {
  executionId: string;
  jobId: string;
  jobName: string;
  status: JobStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface StepUpdatePayload {
  executionId: string;
  jobId: string;
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export interface LogPayload {
  executionId: string;
  jobId?: string;
  stepId?: string;
  line: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  timestamp: string;
}

export interface ExecutionEndPayload {
  executionId: string;
  status: ExecutionStatus;
  duration: number;
  completedAt: string;
}

export interface ExecutionErrorPayload {
  executionId: string;
  error: string;
  code?: string;
}

// Discriminated union — todos os eventos do backend
export type ActEvent =
  | { type: 'execution:start'; payload: ExecutionStartPayload }
  | { type: 'job:update';      payload: JobUpdatePayload }
  | { type: 'step:update';     payload: StepUpdatePayload }
  | { type: 'log';             payload: LogPayload }
  | { type: 'execution:end';   payload: ExecutionEndPayload }
  | { type: 'execution:error'; payload: ExecutionErrorPayload };

export type ActEventType = ActEvent['type'];

// Extrai o payload de um evento pelo tipo
export type PayloadOf<T extends ActEventType> = Extract<ActEvent, { type: T }>['payload'];

// Mensagens trafegadas entre Extension Host e Webview
export type WebviewMessage =
  | ActEvent
  | { type: 'navigate';       payload: { view: string } }
  | { type: 'state:snapshot'; payload: Record<string, unknown> };

// Comandos enviados da Webview para o Extension Host
export type WebviewCommand =
  | { type: 'command:run';      payload: { workflowPath: string; jobId?: string; dryRun?: boolean } }
  | { type: 'command:quickRun'; payload: { workflowPath: string } }
  | { type: 'command:stop';     payload: { executionId: string } }
  | { type: 'command:rerun';    payload: { executionId: string } }
  | { type: 'state:request';    payload: Record<string, never> };
