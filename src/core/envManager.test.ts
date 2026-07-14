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

  it('lê secret multilinha entre aspas sem criar entradas para o conteúdo', () => {
    const secretsPath = path.join(tempRoot, '.secrets');
    fs.writeFileSync(secretsPath, [
      'GH_APP_PRIVATE_KEY="',
      '-----BEGIN RSA PRIVATE KEY-----',
      'MIIEowIBAAKCAQEArQxr20etHi3d6sYULzI3eLUNFRERglfkznrV2DalQrCSx2Sm',
      '-----END RSA PRIVATE KEY-----',
      '"',
      'TOKEN=local-secret',
    ].join('\n'));

    const result = manager.read(secretsPath);

    expect(result.get('GH_APP_PRIVATE_KEY')).toBe([
      '-----BEGIN RSA PRIVATE KEY-----',
      'MIIEowIBAAKCAQEArQxr20etHi3d6sYULzI3eLUNFRERglfkznrV2DalQrCSx2Sm',
      '-----END RSA PRIVATE KEY-----',
    ].join('\n'));
    expect(result.get('TOKEN')).toBe('local-secret');
    expect(result.has('MIIEowIBAAKCAQEArQxr20etHi3d6sYULzI3eLUNFRERglfkznrV2DalQrCSx2Sm')).toBe(false);
  });

  it('salva valores multilinha em formato recarregável', () => {
    const secretsPath = path.join(tempRoot, '.secrets');
    const value = [
      '-----BEGIN RSA PRIVATE KEY-----',
      'line with "quote"',
      '-----END RSA PRIVATE KEY-----',
    ].join('\n');

    manager.write(secretsPath, new Map([['GH_APP_PRIVATE_KEY', value]]));

    expect(manager.read(secretsPath).get('GH_APP_PRIVATE_KEY')).toBe(value);
  });
});
