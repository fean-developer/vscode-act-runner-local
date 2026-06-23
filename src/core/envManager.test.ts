import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { EnvManager } from './envManager';

describe('EnvManager', () => {
  let tempRoot: string;
  let manager: EnvManager;
  let workspaceState: { get: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'act-env-manager-test-'));
    workspaceState = {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    manager = new EnvManager();
    manager.initialize({ workspaceState } as unknown as vscode.ExtensionContext);
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
      update: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('não retorna arquivo selecionado quando o usuário ainda não escolheu nenhum', () => {
    expect(manager.getSelectedEnvFilePath(tempRoot)).toBeUndefined();
    expect(manager.getSelectedVarFilePath(tempRoot)).toBeUndefined();
    expect(manager.getSelectedSecretsFilePath(tempRoot)).toBeUndefined();
  });

  it('persiste o arquivo de vars escolhido e resolve o caminho a partir do workspace', async () => {
    const varsPath = path.join(tempRoot, 'config', 'local.variables');
    fs.mkdirSync(path.dirname(varsPath), { recursive: true });
    fs.writeFileSync(varsPath, 'RUNNER=ubuntu-latest\n');

    await manager.rememberFilePath(tempRoot, 'varFile', varsPath);

    expect(workspaceState.update).toHaveBeenCalledWith(
      `actRunner.varFile.${tempRoot}`,
      'config/local.variables'
    );
    expect(manager.getSelectedVarFilePath(tempRoot)).toBe(varsPath);
    expect(manager.getVarFilePath(tempRoot)).toBe(varsPath);
  });

  it('recupera arquivo de secrets salvo em workspaceState ao reabrir a tela', () => {
    workspaceState.get.mockImplementation((key: string) =>
      key === `actRunner.secretsFile.${tempRoot}` ? 'config/local.secrets' : undefined
    );

    expect(manager.getSelectedSecretsFilePath(tempRoot)).toBe(path.join(tempRoot, 'config', 'local.secrets'));
  });
});
