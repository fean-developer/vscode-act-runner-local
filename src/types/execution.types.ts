// Tipos do domínio de Execução

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failed' | 'cancelled';
export type StepStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';
export type JobStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';
export type ExecutionTrigger = 'manual' | 'quick-run' | 'webhook' | 'codelens' | 'replay';

export interface StepResult {
  jobId: string;
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export interface JobResult {
  jobId: string;
  jobName: string;
  status: JobStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  steps: StepResult[];
}

export interface ExecutionRecord {
  id: string;
  workflowPath: string;
  workflowName: string;
  jobId?: string;
  trigger: ExecutionTrigger;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  dryRun: boolean;
  actArgs: string[];
  jobs: JobResult[];
  logSummary: string;
}

export interface ExecutionOptions {
  workflowPath: string;
  jobId?: string;
  eventType?: string;
  eventPayloadPath?: string;
  dryRun?: boolean;
  envFile?: string;
  secretsFile?: string;
  trigger?: ExecutionTrigger;
  workspaceRoot?: string;  // pasta raiz do projeto (sobrepõe workspace do VSCode)
  actCwd?: string;         // diretório de trabalho do act (para reusable workflows fora do projeto)
  workflowName?: string;   // nome display do workflow (para strip do prefixo nos brackets do act)
}
