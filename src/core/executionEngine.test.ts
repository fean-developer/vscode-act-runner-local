import { ExecutionEngine } from '../core/executionEngine';
import { eventBus } from '../core/eventBus';
import { actRunner } from '../core/actRunner';
import { workflowParser } from '../core/workflowParser';
import { workflowValidator } from '../core/workflowValidator';
import { historyService } from '../core/historyService';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

jest.mock('../core/actRunner');
jest.mock('../core/workflowParser');
jest.mock('../core/workflowValidator');
jest.mock('../core/historyService');
jest.mock('../core/eventBus', () => ({
  eventBus: { dispatch: jest.fn(), sendSnapshot: jest.fn(), on: jest.fn(), off: jest.fn() },
}));

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let tempRoot: string;

  beforeEach(() => {
    engine = new ExecutionEngine();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'act-runner-test-'));
    jest.clearAllMocks();
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
      update: jest.fn().mockResolvedValue(undefined),
    });

    (workflowParser.parse as jest.Mock).mockReturnValue({
      name: 'CI',
      on: { push: {} },
      jobs: { build: { runsOn: 'ubuntu-latest', steps: [] } },
    });

    (workflowValidator.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });

    (actRunner.isActInstalled as jest.Mock).mockResolvedValue(true);
    (actRunner.run as jest.Mock).mockResolvedValue(undefined);
    (actRunner.getLogs as jest.Mock).mockReturnValue([]);

    (historyService.save as jest.Mock).mockResolvedValue(undefined);
    (historyService.getAll as jest.Mock).mockReturnValue([]);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('run() deve emitir execution:start', async () => {
    await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: tempRoot });
    expect(eventBus.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'execution:start' })
    );
  });

  it('run() deve rejeitar se validação falhar', async () => {
    (workflowValidator.validate as jest.Mock).mockReturnValue({
      valid: false,
      errors: ['runs-on ausente'],
    });

    await expect(
      engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: tempRoot })
    ).rejects.toThrow(/runs-on/i);
  });

  it('isRunning() deve ser false após execução completar', async () => {
    await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: tempRoot });
    expect(engine.isRunning()).toBe(false);
  });

  it('usa .env como envFile e fallback de varFile quando .vars não existe', async () => {
    const envPath = path.join(tempRoot, '.env');
    fs.writeFileSync(envPath, 'RUNNER=ubuntu-latest\nDEFAULT_RUNNER=ubuntu-latest\n');

    await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: tempRoot });

    expect(actRunner.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        envFile: envPath,
        varFile: envPath,
      })
    );
  });

  it('prefere .vars como varFile quando .env e .vars existem', async () => {
    const envPath = path.join(tempRoot, '.env');
    const varsPath = path.join(tempRoot, '.vars');
    fs.writeFileSync(envPath, 'RUNNER=ubuntu-latest\n');
    fs.writeFileSync(varsPath, 'RUNNER=ubuntu-latest\n');

    await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: tempRoot });

    expect(actRunner.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        envFile: envPath,
        varFile: varsPath,
      })
    );
  });

  it('usa arquivo customizado configurado como varFile', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, defaultValue: unknown) => key === 'varFile' ? 'my.variables' : defaultValue),
      update: jest.fn().mockResolvedValue(undefined),
    });
    const customVarsPath = path.join(tempRoot, 'my.variables');
    fs.writeFileSync(customVarsPath, 'RUNNER=ubuntu-latest\n');

    await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: tempRoot });

    expect(actRunner.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        varFile: customVarsPath,
      })
    );
  });

  it('usa .vars do projeto selecionado mesmo quando actCwd é o diretório pai', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'act-runner-root-'));
    const apiRoot = path.join(repoRoot, 'Sandbox', 'api');
    fs.mkdirSync(apiRoot, { recursive: true });
    const varsPath = path.join(apiRoot, '.vars');
    fs.writeFileSync(varsPath, 'RUNNER=ubuntu-latest\n');

    try {
      await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: apiRoot, actCwd: repoRoot });

      expect(actRunner.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          actCwd: repoRoot,
          workspaceRoot: apiRoot,
          varFile: varsPath,
        })
      );
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('usa arquivo customizado de vars do projeto selecionado quando actCwd é o diretório pai', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'act-runner-root-'));
    const apiRoot = path.join(repoRoot, 'Sandbox', 'api');
    fs.mkdirSync(apiRoot, { recursive: true });
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, defaultValue: unknown) => key === 'varFile' ? 'config/local.variables' : defaultValue),
      update: jest.fn().mockResolvedValue(undefined),
    });
    const customVarsPath = path.join(apiRoot, 'config', 'local.variables');
    fs.mkdirSync(path.dirname(customVarsPath), { recursive: true });
    fs.writeFileSync(customVarsPath, 'RUNNER=ubuntu-latest\n');

    try {
      await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: apiRoot, actCwd: repoRoot });

      expect(actRunner.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          actCwd: repoRoot,
          workspaceRoot: apiRoot,
          varFile: customVarsPath,
        })
      );
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('usa .secrets do projeto selecionado mesmo quando actCwd é o diretório pai', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'act-runner-root-'));
    const apiRoot = path.join(repoRoot, 'Sandbox', 'api');
    fs.mkdirSync(apiRoot, { recursive: true });
    const secretsPath = path.join(apiRoot, '.secrets');
    fs.writeFileSync(secretsPath, 'TOKEN=local-secret\n');

    try {
      await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: apiRoot, actCwd: repoRoot });

      expect(actRunner.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          actCwd: repoRoot,
          workspaceRoot: apiRoot,
          secretsFile: secretsPath,
        })
      );
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('usa arquivo customizado configurado como secretsFile', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, defaultValue: unknown) => key === 'secretsFile' ? 'config/local.secrets' : defaultValue),
      update: jest.fn().mockResolvedValue(undefined),
    });
    const customSecretsPath = path.join(tempRoot, 'config', 'local.secrets');
    fs.mkdirSync(path.dirname(customSecretsPath), { recursive: true });
    fs.writeFileSync(customSecretsPath, 'TOKEN=local-secret\n');

    await engine.run({ workflowPath: '.github/workflows/ci.yml', workspaceRoot: tempRoot });

    expect(actRunner.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        secretsFile: customSecretsPath,
      })
    );
  });

});
