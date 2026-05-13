import { ExecutionEngine } from '../core/executionEngine';
import { eventBus } from '../core/eventBus';
import { actRunner } from '../core/actRunner';
import { workflowParser } from '../core/workflowParser';
import { workflowValidator } from '../core/workflowValidator';
import { historyService } from '../core/historyService';

jest.mock('../core/actRunner');
jest.mock('../core/workflowParser');
jest.mock('../core/workflowValidator');
jest.mock('../core/historyService');
jest.mock('../core/eventBus', () => ({
  eventBus: { dispatch: jest.fn(), on: jest.fn(), off: jest.fn() },
}));

const { EventEmitter } = require('events');

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;

  beforeEach(() => {
    engine = new ExecutionEngine();
    jest.clearAllMocks();

    (workflowParser.parse as jest.Mock).mockResolvedValue({
      name: 'CI',
      on: { push: {} },
      jobs: { build: { runsOn: 'ubuntu-latest', steps: [] } },
    });

    (workflowValidator.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });

    // Simular processo act que finaliza imediatamente
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();
    mockProc.kill = jest.fn();
    setImmediate(() => mockProc.emit('close', 0));
    (actRunner.run as jest.Mock).mockReturnValue(mockProc);

    (historyService.save as jest.Mock).mockResolvedValue(undefined);
  });

  it('run() deve emitir execution:start', async () => {
    await engine.run({ workflowFile: '.github/workflows/ci.yml', actPath: 'act' });
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
      engine.run({ workflowFile: '.github/workflows/ci.yml', actPath: 'act' })
    ).rejects.toThrow(/runs-on/i);
  });

  it('isRunning() deve ser false após execução completar', async () => {
    await engine.run({ workflowFile: '.github/workflows/ci.yml', actPath: 'act' });
    expect(engine.isRunning()).toBe(false);
  });
});
