import { ActRunner } from '../core/actRunner';

// Mockar child_process para não executar o CLI de verdade
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

function createMockProcess(stdoutLines: string[], stderrLines: string[] = [], exitCode = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = jest.fn();
  proc.pid = 12345;

  // Emitir linhas async
  setImmediate(() => {
    for (const line of stdoutLines) {
      proc.stdout.emit('data', Buffer.from(line + '\n'));
    }
    for (const line of stderrLines) {
      proc.stderr.emit('data', Buffer.from(line + '\n'));
    }
    proc.emit('close', exitCode);
  });

  return proc;
}

describe('ActRunner', () => {
  let runner: ActRunner;

  beforeEach(() => {
    runner = new ActRunner();
    (spawn as jest.Mock).mockReset();
  });

  it('isActInstalled() deve retornar true quando act está disponível', async () => {
    (spawn as jest.Mock).mockReturnValueOnce(createMockProcess(['act version 0.2.60']));
    const result = await runner.isActInstalled('act');
    expect(result).toBe(true);
  });

  it('isActInstalled() deve retornar false quando act não está disponível', async () => {
    (spawn as jest.Mock).mockReturnValueOnce(createMockProcess([], [], 127));
    const result = await runner.isActInstalled('act-nao-existe');
    expect(result).toBe(false);
  });

  it('buildArgs() deve incluir varFile quando informado', () => {
    const args = (runner as any).buildArgs(
      {
        workflowPath: '.github/workflows/ci.yml',
        workspaceRoot: '/repo',
        envFile: '/repo/.env',
        varFile: '/repo/.vars',
      },
      'catthehacker/ubuntu:act-latest',
      '/repo'
    );

    expect(args).toEqual(expect.arrayContaining([
      '--env-file', '/repo/.env',
      '--var-file', '/repo/.vars',
    ]));
  });

  it('run() deve resolver ao finalizar com sucesso', async () => {
    const mockProc = createMockProcess([
      '[build] ⭐ Run actions/checkout@v4',
      '[build]   ✅ Success - actions/checkout@v4',
    ]);
    (runner as any).cleanupActContainers = jest.fn().mockResolvedValue(undefined);
    (runner as any).cleanupDanglingImages = jest.fn().mockResolvedValue(undefined);
    (spawn as jest.Mock).mockReturnValueOnce(mockProc);

    await expect(runner.run('exec-001', {
      workflowPath: '.github/workflows/ci.yml',
      workspaceRoot: '/repo',
    })).resolves.toBeUndefined();

    expect(spawn).toHaveBeenNthCalledWith(
      1,
      'act',
      expect.arrayContaining(['-W', '.github/workflows/ci.yml']),
      expect.objectContaining({ cwd: '/repo' })
    );
  });
});
