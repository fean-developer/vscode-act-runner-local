import * as vscode from 'vscode';
import type { ExecutionGraphHistory, ExecutionRecord } from '../types/execution.types';

const HISTORY_KEY = 'actRunner.executionHistory';
const MAX_RECORDS = 100;

export interface HistoryFilter {
  workflowPath?: string;
  status?: string;
  since?: string;
}

export class HistoryService {
  private context: vscode.ExtensionContext | null = null;
  private pendingGraphHistory = new Map<string, ExecutionGraphHistory>();

  initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  async save(record: ExecutionRecord): Promise<void> {
    if (!this.context) return;
    const pendingGraphHistory = this.pendingGraphHistory.get(record.id);
    if (pendingGraphHistory) {
      record = { ...record, graphHistory: pendingGraphHistory };
      this.pendingGraphHistory.delete(record.id);
    }
    const history = this.getAll();
    history.unshift(record);
    await this.context.globalState.update(HISTORY_KEY, history.slice(0, MAX_RECORDS));
  }

  getAll(): ExecutionRecord[] {
    if (!this.context) return [];
    return this.context.globalState.get<ExecutionRecord[]>(HISTORY_KEY, []);
  }

  getById(id: string): ExecutionRecord | undefined {
    return this.getAll().find((r) => r.id === id);
  }

  filter(options: HistoryFilter): ExecutionRecord[] {
    return this.getAll().filter((r) => {
      if (options.workflowPath && r.workflowPath !== options.workflowPath) return false;
      if (options.status && r.status !== options.status) return false;
      if (options.since && r.startedAt < options.since) return false;
      return true;
    });
  }

  async deleteById(id: string): Promise<void> {
    if (!this.context) return;
    const history = this.getAll().filter((r) => r.id !== id);
    await this.context.globalState.update(HISTORY_KEY, history);
  }

  async updateGraphHistory(id: string, graphHistory: ExecutionGraphHistory): Promise<void> {
    if (!this.context) return;
    let found = false;
    const history = this.getAll().map((record) => (
      record.id === id ? (found = true, { ...record, graphHistory }) : record
    ));
    if (!found) {
      this.pendingGraphHistory.set(id, graphHistory);
      return;
    }
    await this.context.globalState.update(HISTORY_KEY, history);
  }

  async clear(): Promise<void> {
    if (!this.context) return;
    await this.context.globalState.update(HISTORY_KEY, []);
  }
}

export const historyService = new HistoryService();
