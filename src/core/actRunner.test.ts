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

  it('sanitizeArg deve remover caracteres de shell injection', () => {
    const runner = new ActRunner();
    // @ts-ignore — acessar método privado para teste
    expect(runner['sanitizeArg']('valid-arg')).toBe('valid-arg');
    // @ts-ignore
    expect(runner['sanitizeArg']('bad; rm -rf /')).not.toContain(';');
    // @ts-ignore
    expect(runner['sanitizeArg']('$(echo pwned)')).not.toContain('$');
  });

  it('run() deve emitir evento "close" ao finalizar', async () => {
    const mockProc = createMockProcess([
      '[build] ⭐ Run actions/checkout@v4',
      '[build]   ✅ Success - actions/checkout@v4',
    ]);
    (spawn as jest.Mock).mockReturnValueOnce(mockProc);

    const closeSpy = jest.fn();
    const proc = runner.run('exec-001', {
      workflowFile: '.github/workflows/ci.yml',
      actPath: 'act',
    });
    proc.on('close', closeSpy);

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(closeSpy).toHaveBeenCalled();
  });
});
