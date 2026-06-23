import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface EnvEntry {
  key: string;
  value: string;
  isSecret: boolean;
}

export class EnvManager {
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
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    fs.writeFileSync(filePath, lines + '\n', 'utf-8');
  }

  getEnvFilePath(workspaceRoot: string): string {
    const config = vscode.workspace.getConfiguration('actRunner');
    const envFile = config.get<string>('envFile') ?? '.env';
    return this.resolveWorkspacePath(workspaceRoot, envFile);
  }

  getVarFilePath(workspaceRoot: string): string {
    const config = vscode.workspace.getConfiguration('actRunner');
    const varFile = config.get<string>('varFile') ?? '.vars';
    return this.resolveWorkspacePath(workspaceRoot, varFile);
  }

  getSecretsFilePath(workspaceRoot: string): string {
    const config = vscode.workspace.getConfiguration('actRunner');
    const secretsFile = config.get<string>('secretsFile') ?? '.secrets';
    return this.resolveWorkspacePath(workspaceRoot, secretsFile);
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

  private resolveWorkspacePath(workspaceRoot: string, filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
  }

  async ensureSecretsIgnored(workspaceRoot: string): Promise<void> {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const entries = ['.secrets', '.env.local', '.env.production'];

    let content = fs.existsSync(gitignorePath)
      ? fs.readFileSync(gitignorePath, 'utf-8')
      : '';

    const missing = entries.filter((e) => !content.includes(e));
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
