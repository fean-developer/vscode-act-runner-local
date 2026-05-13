import * as vscode from 'vscode';
import { workflowParser } from '../core/workflowParser';

export class WorkflowCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const config = vscode.workspace.getConfiguration('actRunner');
    if (!config.get<boolean>('enableCodeLens', true)) return [];
    if (!this.isWorkflowFile(document.uri.fsPath)) return [];

    const top = new vscode.Range(0, 0, 0, 0);
    const lenses: vscode.CodeLens[] = [
      new vscode.CodeLens(top, {
        title: '▶ Executar Workflow',
        command: 'actRunner.runWorkflow',
        arguments: [document.uri.fsPath],
      }),
      new vscode.CodeLens(top, {
        title: '⚡ Quick Run',
        command: 'actRunner.quickRun',
        arguments: [document.uri.fsPath],
      }),
      new vscode.CodeLens(top, {
        title: '👁 Dry Run',
        command: 'actRunner.dryRun',
        arguments: [document.uri.fsPath],
      }),
      new vscode.CodeLens(top, {
        title: '✅ Validar',
        command: 'actRunner.validateWorkflow',
        arguments: [document.uri.fsPath],
      }),
    ];

    try {
      const workflow = workflowParser.parse(document.uri.fsPath);
      const lines = document.getText().split('\n');
      Object.keys(workflow.jobs).forEach((jobId) => {
        const lineIdx = lines.findIndex((l) => new RegExp(`^\\s{2}${jobId}:`).test(l));
        if (lineIdx >= 0) {
          lenses.push(
            new vscode.CodeLens(new vscode.Range(lineIdx, 0, lineIdx, 0), {
              title: `▶ Executar Job: ${jobId}`,
              command: 'actRunner.runJob',
              arguments: [document.uri.fsPath, jobId],
            })
          );
        }
      });
    } catch {
      // YAML inválido — apenas lenses do topo são exibidas
    }

    return lenses;
  }

  private isWorkflowFile(filePath: string): boolean {
    return /\.github[/\\]workflows[/\\].+\.ya?ml$/.test(filePath);
  }
}

export const workflowCodeLensProvider = new WorkflowCodeLensProvider();
