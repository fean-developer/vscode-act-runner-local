import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { actRunner } from './actRunner';
import { eventBus } from './eventBus';
import { workflowParser } from './workflowParser';
import { workflowValidator } from './workflowValidator';
import { historyService } from './historyService';
import { envManager } from './envManager';
import type { ExecutionOptions, ExecutionRecord, ExecutionStatus } from '../types/execution.types';

export class ExecutionEngine {
  private activeExecutionId: string | null = null;
  private startTime = 0;

  async run(options: ExecutionOptions): Promise<string | 'cancelled'> {
    if (this.activeExecutionId) {
      throw new Error('Já existe uma execução em andamento. Pare a atual antes de iniciar outra.');
    }

    const actPath = vscode.workspace.getConfiguration('actRunner').get<string>('actPath', 'act');
    if (!await actRunner.isActInstalled(actPath)) {
      const choice = await vscode.window.showErrorMessage(
        '❌ Executável "act" não encontrado. Informe onde ele está instalado.',
        'Procurar arquivo...',
        'Digitar caminho',
        'Ver instalação'
      );

      if (choice === 'Procurar arquivo...') {
        const uris = await vscode.window.showOpenDialog({
          canSelectFolders: false,
          canSelectFiles: true,
          canSelectMany: false,
          openLabel: 'Selecionar executável do act',
          title: 'Localizar binário do act',
          filters: { 'Executável': ['*'] },
        });
        if (uris && uris.length > 0) {
          const selected = uris[0].fsPath;
          const ok = await actRunner.isActInstalled(selected);
          if (ok) {
            await vscode.workspace.getConfiguration('actRunner')
              .update('actPath', selected, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`✅ act configurado: ${selected}`);
            // Retry with new path — fall through (don't return)
          } else {
            vscode.window.showErrorMessage(`❌ Não foi possível executar: ${selected}`);
            return 'cancelled';
          }
        } else {
          return 'cancelled';
        }
      } else if (choice === 'Digitar caminho') {
        const typed = await vscode.window.showInputBox({
          prompt: 'Cole ou digite o caminho completo para o binário do act',
          placeHolder: '/home/user/.act/act  ou  /usr/local/bin/act',
          ignoreFocusOut: true,
        });
        if (!typed || typed.trim() === '') return 'cancelled';
        const ok = await actRunner.isActInstalled(typed.trim());
        if (ok) {
          await vscode.workspace.getConfiguration('actRunner')
            .update('actPath', typed.trim(), vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(`✅ act configurado: ${typed.trim()}`);
          // Fall through to run with new path
        } else {
          vscode.window.showErrorMessage(`❌ Não foi possível executar: ${typed.trim()}`);
          return 'cancelled';
        }
      } else if (choice === 'Ver instalação') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/nektos/act#installation'));
        return 'cancelled';
      } else {
        return 'cancelled';
      }
    }
    const workflow = workflowParser.parse(options.workflowPath);
    const validation = workflowValidator.validate(workflow);
    if (!validation.valid) {
      throw new Error(`Workflow inválido:\n${validation.errors.join('\n')}`);
    }

    // Verificar TODOS os jobs com reusable workflows (incluindo ./path locais)
    const workspaceRoot = options.workspaceRoot ?? '';
    const allUsesPaths = Object.values(workflow.jobs)
      .filter((job) => job.uses)
      .map((job) => {
        const raw = job.uses!.split('@')[0]; // remove @ref
        // ./path → path  (strip ./ para comparação de existência)
        return raw.startsWith('./') ? raw.slice(2) : raw;
      });

    // Auto-detectar o CWD correto subindo diretórios até encontrar os reusable workflows
    let actCwd = options.actCwd ?? workspaceRoot;
    if (allUsesPaths.length > 0 && !options.actCwd) {
      const detected = this.detectReusableCwd(workspaceRoot, allUsesPaths);
      if (detected && detected !== workspaceRoot) {
        actCwd = detected;
        vscode.window.showInformationMessage(
          `ℹ️ Executando act a partir de: ${detected} (reusable workflows detectados no diretório pai)`
        );
      }
    }

    // Avisar sobre reusable workflows que ainda não foram encontrados com o CWD detectado
    const stillMissing = allUsesPaths.filter(
      (relPath) => !fs.existsSync(path.join(actCwd, relPath))
    );
    if (stillMissing.length > 0) {
      const jobLabels = Object.entries(workflow.jobs)
        .filter(([, job]) => {
          if (!job.uses) return false;
          const raw = job.uses.split('@')[0];
          const stripped = raw.startsWith('./') ? raw.slice(2) : raw;
          return stillMissing.includes(stripped);
        })
        .map(([id, job]) => `• ${job.name ?? id} → ${job.uses}`);

      const msg = [
        `⚠️ ${stillMissing.length} reusable workflow(s) não encontrado(s) localmente:`,
        '',
        jobLabels.join('\n'),
        '',
        `Diretório base verificado: ${actCwd}`,
        'O act vai falhar. Execute o projeto do diretório correto.',
      ].join('\n');

      const choice = await vscode.window.showWarningMessage(
        msg,
        { modal: true },
        'Executar mesmo assim',
        'Cancelar'
      );
      if (choice !== 'Executar mesmo assim') return 'cancelled';
    }

    const executionId = randomUUID();
    this.activeExecutionId = executionId;
    this.startTime = Date.now();
    const startedAt = new Date().toISOString();

    eventBus.dispatch({
      type: 'execution:start',
      payload: {
        executionId,
        workflowPath: options.workflowPath,
        workflowName: workflow.name,
        jobs: Object.values(workflow.jobs),
        triggeredAt: startedAt,
      },
    });

    let finalStatus: ExecutionStatus = 'failed';

    try {
      await actRunner.run(executionId, {
        ...options,
        actCwd,
        workspaceRoot,
        workflowName: workflow.name,
        envFile: options.envFile ?? findConfiguredOrExistingFile(workspaceRoot, envManager.getEnvFilePath(workspaceRoot), ['.env']),
        varFile: options.varFile ?? findConfiguredOrExistingFile(workspaceRoot, envManager.getVarFilePath(workspaceRoot), ['.vars', '.env']),
        secretsFile: options.secretsFile ?? findConfiguredOrExistingFile(workspaceRoot, envManager.getSecretsFilePath(workspaceRoot), ['.secrets']),
      });
      finalStatus = 'success';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      finalStatus = 'failed';
      // "act encerrou com código N" = job falhou — fluxo esperado, já sinalizado via
      // job:update + execution:end com status 'failed'. Não mostrar como "Erro Crítico".
      // Erros genuínos (falha ao spawnar o processo, ENOENT, etc.) são propagados normalmente.
      const isJobFailure = /^act encerrou com código \d+$/.test(message);
      if (!isJobFailure) {
        eventBus.dispatch({ type: 'execution:error', payload: { executionId, error: message } });
      }
    } finally {
      this.activeExecutionId = null;
      const duration = Date.now() - this.startTime;
      const record: ExecutionRecord = {
        id: executionId,
        workflowPath: options.workflowPath,
        workflowName: workflow.name,
        jobId: options.jobId,
        trigger: options.trigger ?? 'manual',
        status: finalStatus,
        startedAt,
        completedAt: new Date().toISOString(),
        duration,
        dryRun: options.dryRun ?? false,
        actArgs: [],
        jobs: [],
        logSummary: actRunner.getLogs().join('\n'),
      };
      await historyService.save(record);
      // Notificar o webview com o histórico atualizado para que o painel Histórico reflita
      // a nova execução imediatamente (sem precisar recarregar)
      eventBus.sendSnapshot({ history: historyService.getAll() });
    }

    return executionId;
  }

  stop(): void {
    if (!this.activeExecutionId) return;
    actRunner.stop();
    eventBus.dispatch({
      type: 'execution:end',
      payload: {
        executionId: this.activeExecutionId,
        status: 'cancelled',
        duration: Date.now() - this.startTime,
        completedAt: new Date().toISOString(),
      },
    });
    this.activeExecutionId = null;
  }

  /** Força reset do estado em caso de trava (processo encerrou sem limpar) */
  forceReset(): void {
    actRunner.stop();
    this.activeExecutionId = null;
    this.startTime = 0;
  }

  /**
   * Detecta o diretório correto para o act resolver reusable workflows externos.
   * Sobe a árvore de diretórios até encontrar um nível onde TODOS os caminhos existam.
   */
  private detectReusableCwd(startDir: string, uses: string[]): string {
    let dir = startDir;
    // Verificar até 5 níveis acima
    for (let i = 0; i < 5; i++) {
      const allFound = uses.every((relPath) => fs.existsSync(path.join(dir, relPath)));
      if (allFound) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break; // chegou na raiz do sistema
      dir = parent;
    }
    // Retornar o melhor match parcial (mais caminhos encontrados)
    let bestDir = startDir;
    let bestCount = 0;
    dir = startDir;
    for (let i = 0; i < 5; i++) {
      const found = uses.filter((relPath) => fs.existsSync(path.join(dir, relPath))).length;
      if (found > bestCount) { bestCount = found; bestDir = dir; }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return bestDir;
  }

  isRunning(): boolean {
    return this.activeExecutionId !== null;
  }

  getActiveExecutionId(): string | null {
    return this.activeExecutionId;
  }
}

function findConfiguredOrExistingFile(root: string, configuredFilePath: string, fallbackCandidates: string[]): string | undefined {
  if (fs.existsSync(configuredFilePath)) return configuredFilePath;
  return findExistingFile(root, fallbackCandidates);
}

function findExistingFile(root: string, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const filePath = path.join(root, candidate);
    if (fs.existsSync(filePath)) return filePath;
  }
  return undefined;
}

export const executionEngine = new ExecutionEngine();
