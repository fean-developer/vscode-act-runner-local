import * as vscode from 'vscode';
import * as path from 'path';
import { workflowParser } from '../core/workflowParser';
import type { WorkflowDefinition } from '../types/workflow.types';

type WorkflowItemContext = 'workflow' | 'job' | 'empty' | 'folder';

export class WorkflowTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemContext: WorkflowItemContext,
    public readonly workflowPath?: string,
    public readonly jobId?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = itemContext;

    if (itemContext === 'folder') {
      this.iconPath = new vscode.ThemeIcon('folder-opened');
    } else if (itemContext === 'workflow') {
      this.iconPath = new vscode.ThemeIcon('file-code');
      this.tooltip = workflowPath;
    } else if (itemContext === 'job') {
      this.iconPath = new vscode.ThemeIcon('play-circle');
    } else {
      // empty / hint
      this.iconPath = new vscode.ThemeIcon('info');
    }
  }
}

export class WorkflowExplorer implements vscode.TreeDataProvider<WorkflowTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<WorkflowTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private workflows: WorkflowDefinition[] = [];
  private projectRoot: string | undefined;

  /** Define a pasta raiz do projeto manualmente */
  setProjectRoot(root: string): void {
    this.projectRoot = root;
    this.workflows = [];
    this._onDidChangeTreeData.fire(undefined);
  }

  getProjectRoot(): string | undefined {
    return this.projectRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  refresh(): void {
    this.workflows = [];
    this._onDidChangeTreeData.fire(undefined);
  }

  private loadWorkflows(): WorkflowDefinition[] {
    const root = this.getProjectRoot();
    if (!root) return [];
    const files = workflowParser.discoverWorkflows(root);
    const result: WorkflowDefinition[] = [];
    for (const f of files) {
      try {
        result.push(workflowParser.parse(f));
      } catch {
        // ignora YAML inválido silenciosamente
      }
    }
    return result;
  }

  getTreeItem(element: WorkflowTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: WorkflowTreeItem): WorkflowTreeItem[] {
    if (!element) {
      const root = this.getProjectRoot();

      if (!root) {
        return [
          new WorkflowTreeItem(
            'Clique em 📂 para selecionar um projeto',
            vscode.TreeItemCollapsibleState.None,
            'empty'
          ),
        ];
      }

      if (this.workflows.length === 0) {
        this.workflows = this.loadWorkflows();
      }

      if (this.workflows.length === 0) {
        return [
          new WorkflowTreeItem(
            `Nenhum workflow em ${path.basename(root)}/.github/workflows/`,
            vscode.TreeItemCollapsibleState.None,
            'empty'
          ),
        ];
      }

      // Header mostrando a pasta do projeto
      const folderItem = new WorkflowTreeItem(
        path.basename(root),
        vscode.TreeItemCollapsibleState.None,
        'folder'
      );
      folderItem.description = root;
      folderItem.tooltip = `Projeto: ${root}`;

      const workflowItems = this.workflows.map(
        (w) =>
          new WorkflowTreeItem(
            `${w.name}  (${path.basename(w.filePath)})`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'workflow',
            w.filePath
          )
      );
      return [folderItem, ...workflowItems];
    }

    if (element.itemContext === 'workflow' && element.workflowPath) {
      const wf = this.workflows.find((w) => w.filePath === element.workflowPath);
      if (!wf) return [];
      return Object.values(wf.jobs).map((job) => {
        const isReusable = !!job.uses;
        const label = job.name ?? job.id;
        const item = new WorkflowTreeItem(
          label,
          vscode.TreeItemCollapsibleState.None,
          'job',
          element.workflowPath,
          job.id
        );
        if (isReusable) {
          item.description = 'reusable';
          item.iconPath = new vscode.ThemeIcon('references');
          item.tooltip = `Reusable workflow: ${job.uses}`;
        }
        return item;
      });
    }

    return [];
  }
}

export const workflowExplorer = new WorkflowExplorer();
