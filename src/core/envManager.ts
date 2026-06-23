import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface EnvEntry {
  key: string;
  value: string;
  isSecret: boolean;
}

type FileConfigKey = 'envFile' | 'varFile' | 'secretsFile';

export class EnvManager {
  private context?: vscode.ExtensionContext;
  private fileOverrides = new Map<string, Partial<Record<FileConfigKey, string>>>();

  initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  read(filePath: string): Map<string, string> {
    const map = new Map<string, string>();
    if (!fs.existsSync(filePath)) return map;

    fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .forEach((line: string) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) return;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (key) map.set(key, value);
      });

    return map;
  }

  write(filePath: string, vars: Map<string, string>): void {
    const lines = Array.from(vars.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, lines + '\n', 'utf-8');
  }

  getEnvFilePath(workspaceRoot: string): string {
    return this.getConfiguredFilePath(workspaceRoot, 'envFile', '.env');
  }

  getVarFilePath(workspaceRoot: string): string {
    return this.getConfiguredFilePath(workspaceRoot, 'varFile', '.vars');
  }

  getSecretsFilePath(workspaceRoot: string): string {
    return this.getConfiguredFilePath(workspaceRoot, 'secretsFile', '.secrets');
  }

  getActrcFilePath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.actrc');
  }

  toWorkspaceRelative(workspaceRoot: string, filePath: string): string {
    const resolved = this.resolveWorkspacePath(workspaceRoot, filePath);
    const relative = path.relative(workspaceRoot, resolved);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
      ? relative
      : resolved;
  }

  async rememberFilePath(workspaceRoot: string, key: FileConfigKey, filePath: string): Promise<void> {
    const relativeOrAbsolute = this.toWorkspaceRelative(workspaceRoot, filePath);
    const current = this.fileOverrides.get(workspaceRoot) ?? {};
    current[key] = relativeOrAbsolute;
    this.fileOverrides.set(workspaceRoot, current);

    await this.context?.workspaceState.update(this.workspaceStateKey(workspaceRoot, key), relativeOrAbsolute);

    try {
      await vscode.workspace
        .getConfiguration('actRunner')
        .update(key, relativeOrAbsolute, vscode.ConfigurationTarget.Workspace);
    } catch {
      // Sessions started before the setting is registered can reject this update.
      // The in-memory override and workspaceState keep the selection functional.
    }
  }

  private getConfiguredFilePath(workspaceRoot: string, key: FileConfigKey, defaultFile: string): string {
    const override = this.fileOverrides.get(workspaceRoot)?.[key];
    const stored = this.context?.workspaceState.get<string>(this.workspaceStateKey(workspaceRoot, key));
    const config = vscode.workspace.getConfiguration('actRunner');
    const configured = config.get<string>(key) ?? defaultFile;
    return this.resolveWorkspacePath(workspaceRoot, override ?? stored ?? configured);
  }

  private workspaceStateKey(workspaceRoot: string, key: FileConfigKey): string {
    return `actRunner.${key}.${workspaceRoot}`;
  }

  private resolveWorkspacePath(workspaceRoot: string, filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
  }

  async ensureSecretsIgnored(workspaceRoot: string): Promise<void> {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const entries = ['.secrets', '.env.local', '.env.production'];

    let content = fs.existsSync(gitignorePath)
      ? fs.readFileSync(gitignorePath, 'utf-8')
      : '';

    const missing = entries.filter((entry) => !content.includes(entry));
    if (missing.length === 0) return;

    const choice = await vscode.window.showWarningMessage(
      `⚠️ "${missing.join(', ')}" não está no .gitignore. Risco de commitar secrets!`,
      'Adicionar ao .gitignore',
      'Ignorar'
    );

    if (choice === 'Adicionar ao .gitignore') {
      content += `\n# Act Runner — secrets locais\n${missing.join('\n')}\n`;
      fs.writeFileSync(gitignorePath, content, 'utf-8');
      vscode.window.showInformationMessage('✅ .gitignore atualizado com sucesso.');
    }
  }
}

export const envManager = new EnvManager();
