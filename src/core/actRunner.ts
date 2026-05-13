import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { eventBus } from './eventBus';
import type { ExecutionOptions } from '../types/execution.types';

// Caminhos candidatos para o binário do act em ordem de prioridade
const ACT_CANDIDATE_PATHS: string[] = [
  path.join(os.homedir(), '.act', 'act'),          // ~/.act/act  (seu caso)
  '/usr/local/bin/act',
  '/usr/bin/act',
  path.join(os.homedir(), 'bin', 'act'),            // ~/bin/act
  path.join(os.homedir(), '.local', 'bin', 'act'),  // ~/.local/bin/act
  '/opt/homebrew/bin/act',                          // macOS Homebrew Apple Silicon
  '/home/linuxbrew/.linuxbrew/bin/act',             // Linuxbrew
];

const ANSI_RE = /\x1B\[[0-9;]*[mGKHFJK]/g;
const strip = (s: string) => s.replace(ANSI_RE, '');

// Padrões de output do act CLI
const RE_STEP_START   = /^\[([^\]]+)\]\s+⭐\s+Run\s+(.+)$/;
const RE_STEP_OK      = /^\[([^\]]+)\]\s+✅\s+Success\s+-\s+(.+)$/;
const RE_STEP_FAIL    = /^\[([^\]]+)\]\s+❌\s+Failure\s+-\s+(.+)$/;
const RE_STEP_SKIP    = /^\[([^\]]+)\]\s+⏭️\s+Skipping\s+(.+)$/;
const RE_LOG_LINE     = /^\[([^\]]+)\]\s+\|\s*(.*)$/;
const RE_JOB_START    = /^\[([^\]]+)\]\s+🚀\s+Start\s+image/;
const RE_JOB_OK       = /^\[([^\]]+)\]\s+Job\s+succeeded$/;
const RE_JOB_FAIL     = /^\[([^\]]+)\]\s+Job\s+failed$/;

function parseJobStep(bracket: string): { jobId: string; stepId: string } {
  const slash = bracket.lastIndexOf('/');
  if (slash < 0) return { jobId: bracket.trim(), stepId: 'unknown' };
  return { jobId: bracket.slice(0, slash).trim(), stepId: bracket.slice(slash + 1).trim() };
}

function sanitizeArg(arg: string): string {
  return arg.replace(/[;&|`$<>()\[\]{}\\'"]/g, '');
}

function sanitizePath(p: string): string {
  return p.replace(/[;&|`$<>()\[\]{}\\"']/g, '');
}

export class ActRunner {
  private activeProcess: ChildProcess | null = null;

  /** Testa se um caminho/comando executa act corretamente */
  async isActInstalled(actPath = 'act'): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(actPath, ['--version'], { stdio: 'ignore' });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  /**
   * Detecta automaticamente o binário do act.
   * Busca em caminhos candidatos comuns e retorna o primeiro que funcionar.
   * Salva automaticamente em actRunner.actPath se encontrado.
   */
  async autoDetect(): Promise<string | undefined> {
    // 1. Tentar o valor já configurado
    const configured = vscode.workspace.getConfiguration('actRunner').get<string>('actPath', 'act');
    if (await this.isActInstalled(configured)) {
      return configured;
    }

    // 2. Tentar caminhos candidatos conhecidos
    for (const candidate of ACT_CANDIDATE_PATHS) {
      if (fs.existsSync(candidate) && await this.isActInstalled(candidate)) {
        // Salvar automaticamente nas configurações globais
        await vscode.workspace
          .getConfiguration('actRunner')
          .update('actPath', candidate, vscode.ConfigurationTarget.Global);
        return candidate;
      }
    }

    // 3. Tentar via shell interativo para capturar aliases/PATH do usuário
    const shellPath = await this.resolveViaShell();
    if (shellPath) {
      await vscode.workspace
        .getConfiguration('actRunner')
        .update('actPath', shellPath, vscode.ConfigurationTarget.Global);
      return shellPath;
    }

    return undefined;
  }

  /** Tenta resolver o path do act via shell interativo (captura aliases e PATH do usuário) */
  private resolveViaShell(): Promise<string | undefined> {
    return new Promise((resolve) => {
      const shell = process.env.SHELL ?? '/bin/bash';
      // -i = interactive (carrega .bashrc/.zshrc com aliases), -c = executa comando
      const proc = spawn(shell, ['-i', '-c', 'command -v act 2>/dev/null || which act 2>/dev/null'], {
        stdio: ['ignore', 'pipe', 'ignore'],
        env: { ...process.env, TERM: 'dumb' },
      });
      let output = '';
      proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
      proc.on('close', (code: number | null) => {
        const resolved = output.trim().split('\n').pop()?.trim();
        if (code === 0 && resolved && resolved.length > 0 && !resolved.includes(' ')) {
          resolve(resolved);
        } else {
          resolve(undefined);
        }
      });
      proc.on('error', () => resolve(undefined));
      // timeout de 5s para não travar
      setTimeout(() => { proc.kill(); resolve(undefined); }, 5000);
    });
  }

  async run(executionId: string, options: ExecutionOptions): Promise<void> {
    const workspaceRoot = options.workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) throw new Error('Nenhum projeto selecionado. Use "Selecionar Projeto" na sidebar.');

    // actCwd: diretório de onde o act será invocado (pode ser pai do projeto para reusable workflows)
    const actCwd = options.actCwd ?? workspaceRoot;

    const config = vscode.workspace.getConfiguration('actRunner');
    const actPath = (config.get<string>('actPath') ?? 'act');
    const defaultImage = (config.get<string>('defaultImage') ?? 'catthehacker/ubuntu:act-latest');

    const args = this.buildArgs(options, defaultImage, actCwd);

    return new Promise((resolve, reject) => {
      this.activeProcess = spawn(actPath, args, {
        cwd: actCwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      this.activeProcess.stdout?.on('data', (chunk: Buffer) => {
        chunk.toString().split('\n').forEach((line: string) => {
          if (line.trim()) this.processLine(executionId, line);
        });
      });

      this.activeProcess.stderr?.on('data', (chunk: Buffer) => {
        chunk.toString().split('\n').forEach((line: string) => {
          const clean = strip(line);
          if (clean.trim()) {
            eventBus.dispatch({
              type: 'log',
              payload: { executionId, line: clean, level: 'error', timestamp: now() },
            });
          }
        });
      });

      this.activeProcess.on('close', (code: number | null) => {
        this.activeProcess = null;
        eventBus.dispatch({
          type: 'execution:end',
          payload: {
            executionId,
            status: code === 0 ? 'success' : 'failed',
            duration: 0,
            completedAt: now(),
          },
        });
        if (code === 0) resolve();
        else reject(new Error(`act encerrou com código ${code}`));
      });

      this.activeProcess.on('error', (err: Error) => {
        this.activeProcess = null;
        eventBus.dispatch({ type: 'execution:error', payload: { executionId, error: err.message } });
        reject(err);
      });
    });
  }

  stop(): void {
    this.activeProcess?.kill('SIGTERM');
    this.activeProcess = null;
  }

  private processLine(executionId: string, raw: string): void {
    const clean = strip(raw);
    let m: RegExpMatchArray | null;

    if ((m = clean.match(RE_STEP_START))) {
      const { jobId, stepId } = parseJobStep(m[1]);
      eventBus.dispatch({ type: 'step:update', payload: { executionId, jobId, stepId, stepName: m[2].trim(), status: 'running', startedAt: now() } });
      return;
    }
    if ((m = clean.match(RE_STEP_OK))) {
      const { jobId, stepId } = parseJobStep(m[1]);
      eventBus.dispatch({ type: 'step:update', payload: { executionId, jobId, stepId, stepName: m[2].trim(), status: 'success', completedAt: now() } });
      return;
    }
    if ((m = clean.match(RE_STEP_FAIL))) {
      const { jobId, stepId } = parseJobStep(m[1]);
      eventBus.dispatch({ type: 'step:update', payload: { executionId, jobId, stepId, stepName: m[2].trim(), status: 'failed', completedAt: now() } });
      return;
    }
    if ((m = clean.match(RE_STEP_SKIP))) {
      const { jobId, stepId } = parseJobStep(m[1]);
      eventBus.dispatch({ type: 'step:update', payload: { executionId, jobId, stepId, stepName: m[2].trim(), status: 'skipped', completedAt: now() } });
      return;
    }
    if ((m = clean.match(RE_JOB_START))) {
      eventBus.dispatch({ type: 'job:update', payload: { executionId, jobId: m[1].trim(), jobName: m[1].trim(), status: 'running', startedAt: now() } });
      return;
    }
    if ((m = clean.match(RE_JOB_OK))) {
      eventBus.dispatch({ type: 'job:update', payload: { executionId, jobId: m[1].trim(), jobName: m[1].trim(), status: 'success', completedAt: now() } });
      return;
    }
    if ((m = clean.match(RE_JOB_FAIL))) {
      eventBus.dispatch({ type: 'job:update', payload: { executionId, jobId: m[1].trim(), jobName: m[1].trim(), status: 'failed', completedAt: now() } });
      return;
    }
    if ((m = clean.match(RE_LOG_LINE))) {
      const { jobId, stepId } = parseJobStep(m[1]);
      eventBus.dispatch({ type: 'log', payload: { executionId, jobId, stepId, line: m[2], level: 'info', timestamp: now() } });
      return;
    }
    if (clean.trim()) {
      eventBus.dispatch({ type: 'log', payload: { executionId, line: clean, level: 'info', timestamp: now() } });
    }
  }

  private buildArgs(options: ExecutionOptions, defaultImage: string, actCwd?: string): string[] {
    const args: string[] = [];

    if (options.workflowPath) {
      // Quando o CWD é diferente do projeto, -W deve ser relativo ao actCwd
      // (exatamente como: cd fean-projects/ && act -W sample-dotnet-api/.github/workflows/file.yaml)
      const effectiveCwd = actCwd ?? options.workspaceRoot ?? '';
      const wfPath = effectiveCwd && effectiveCwd !== options.workspaceRoot
        ? path.relative(effectiveCwd, path.resolve(options.workflowPath))
        : sanitizePath(options.workflowPath);
      args.push('-W', wfPath);
    }
    if (options.jobId)        args.push('-j', sanitizeArg(options.jobId));
    if (options.dryRun)       args.push('-n');
    if (options.eventType)    args.push(sanitizeArg(options.eventType));
    if (options.eventPayloadPath) args.push('-e', sanitizePath(options.eventPayloadPath));
    if (options.envFile)      args.push('--env-file', sanitizePath(options.envFile));
    if (options.secretsFile)  args.push('--secret-file', sanitizePath(options.secretsFile));

    // Só adicionar -P se nenhum .actrc no projeto já define a plataforma
    // (evita sobrescrever a configuração local do usuário)
    if (!this.actrcDefinesPlatform(actCwd, options.workspaceRoot)) {
      args.push('-P', `ubuntu-latest=${defaultImage}`);
    }

    return args;
  }

  /** Verifica se algum .actrc no projeto já define -P para não sobrescrever */
  private actrcDefinesPlatform(actCwd?: string, workspaceRoot?: string): boolean {
    const candidates = [...new Set([actCwd, workspaceRoot].filter(Boolean) as string[])];
    return candidates.some((dir) => {
      try {
        const content = fs.readFileSync(path.join(dir, '.actrc'), 'utf-8');
        return content.split('\n').some((line) => line.trim().startsWith('-P '));
      } catch {
        return false;
      }
    });
  }
}

const now = () => new Date().toISOString();
export const actRunner = new ActRunner();
