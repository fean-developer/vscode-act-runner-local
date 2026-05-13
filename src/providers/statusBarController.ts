import * as vscode from 'vscode';
import { eventBus } from '../core/eventBus';

export class StatusBarController {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.setIdle();
    this.item.show();
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    eventBus.on('execution:start', () => this.setRunning());

    eventBus.on('execution:end', (p) => {
      if (p.status === 'success') this.setSuccess();
      else if (p.status === 'cancelled') this.setIdle();
      else this.setFailed();
      setTimeout(() => this.setIdle(), 5000);
    });

    eventBus.on('execution:error', () => {
      this.setFailed();
      setTimeout(() => this.setIdle(), 5000);
    });
  }

  private setIdle(): void {
    this.item.text = '$(run) Act Runner';
    this.item.tooltip = 'Act Visual Runner — clique para abrir o menu';
    this.item.command = 'actRunner.showMenu';
    this.item.backgroundColor = undefined;
    this.item.color = undefined;
  }

  private setRunning(): void {
    this.item.text = '$(sync~spin) Act: executando...';
    this.item.tooltip = 'Execução em andamento — clique para parar';
    this.item.command = 'actRunner.stopExecution';
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.item.color = undefined;
  }

  private setSuccess(): void {
    this.item.text = '$(check) Act: sucesso';
    this.item.tooltip = 'Última execução concluída com sucesso';
    this.item.command = 'actRunner.showMenu';
    this.item.backgroundColor = undefined;
    this.item.color = new vscode.ThemeColor('charts.green');
  }

  private setFailed(): void {
    this.item.text = '$(error) Act: falhou';
    this.item.tooltip = 'Última execução falhou — clique para ver detalhes';
    this.item.command = 'actRunner.viewHistory';
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.item.color = undefined;
  }

  dispose(): void {
    this.item.dispose();
  }
}
