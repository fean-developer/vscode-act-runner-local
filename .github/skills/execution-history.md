# Skill: Histórico de Execuções

## Objetivo
Rastrear, persistir e permitir a re-execução de workflows passados com filtros avançados.

## Armazenamento
Usar `vscode.ExtensionContext.globalState` para persistência entre sessões do VSCode.

## Modelo de Dados

```typescript
interface ExecutionRecord {
  id: string;                    // UUID único
  workflowPath: string;          // Ex: '.github/workflows/ci.yml'
  workflowName: string;          // Nome do workflow
  jobId?: string;                // Se foi execução de job específico
  trigger: ExecutionTrigger;     // 'manual' | 'quick-run' | 'webhook' | 'replay'
  status: ExecutionStatus;       // 'success' | 'failed' | 'cancelled' | 'running'
  startedAt: string;             // ISO 8601
  completedAt?: string;          // ISO 8601
  duration?: number;             // milissegundos
  dryRun: boolean;               // Foi um dry run?
  actArgs: string[];             // Argumentos passados ao CLI (sem secrets)
  stepResults: StepResult[];     // Resultado de cada step
  logSummary: string;            // Primeiras N linhas de log para preview
}

interface StepResult {
  jobId: string;
  stepId: string;
  stepName: string;
  status: StepStatus;
  duration?: number;
}
```

## Implementação do HistoryService

```typescript
const HISTORY_KEY = 'actRunner.executionHistory';
const MAX_RECORDS = 100;

class HistoryService {
  constructor(private context: vscode.ExtensionContext) {}

  // Salvar nova execução
  async save(record: ExecutionRecord): Promise<void> {
    const history = this.getAll();
    history.unshift(record);          // Mais recente primeiro
    const trimmed = history.slice(0, MAX_RECORDS);
    await this.context.globalState.update(HISTORY_KEY, trimmed);
  }

  // Recuperar todas as execuções
  getAll(): ExecutionRecord[] {
    return this.context.globalState.get<ExecutionRecord[]>(HISTORY_KEY, []);
  }

  // Filtrar execuções
  filter(options: HistoryFilter): ExecutionRecord[] {
    return this.getAll().filter((r) => {
      if (options.workflowPath && r.workflowPath !== options.workflowPath) return false;
      if (options.status && r.status !== options.status) return false;
      if (options.since && r.startedAt < options.since) return false;
      return true;
    });
  }

  // Limpar histórico
  async clear(): Promise<void> {
    await this.context.globalState.update(HISTORY_KEY, []);
  }
}
```

## Re-execução

Para re-executar a partir do histórico:
1. Recuperar o `ExecutionRecord` pelo ID
2. Reconstruir os `actArgs` (sem secrets — estes são relidos dos arquivos)
3. Criar novo `ExecutionRecord` com `trigger: 'replay'` referenciando o original
4. Passar ao `ExecutionEngine` para execução

## UI do Painel de Histórico

- Lista com paginação (25 por página)
- Filtros: workflow, status, período
- Cada item mostra: nome do workflow, status, data, duração
- Botão de re-executar em cada item
- Botão de ver logs do item (se disponível)
- Botão de limpar histórico

## Output
- Registros persistentes de execuções
- Re-execução fiel a partir do histórico
- Histórico filtrável e navegável