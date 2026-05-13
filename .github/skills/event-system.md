# Skill: Sistema de Eventos em Tempo Real

## Objetivo
Implementar comunicação em tempo real entre o Extension Host e a Webview UI usando um barramento de eventos tipados, sem polling.

## Arquitetura

```
ActRunner → ExecutionEngine → EventBus → postMessage → Webview Store → React Components
```

## Catálogo de Eventos

### execution:start
```typescript
{
  type: 'execution:start';
  payload: {
    executionId: string;       // UUID único da execução
    workflowPath: string;      // Caminho relativo do arquivo YAML
    workflowName: string;      // Nome do workflow
    jobs: JobDefinition[];     // Lista de jobs do workflow
    triggeredAt: string;       // ISO 8601
  };
}
```

### job:update
```typescript
{
  type: 'job:update';
  payload: {
    executionId: string;
    jobId: string;
    status: 'idle' | 'running' | 'success' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
  };
}
```

### step:update
```typescript
{
  type: 'step:update';
  payload: {
    executionId: string;
    jobId: string;
    stepId: string;
    stepName: string;
    status: 'idle' | 'running' | 'success' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    duration?: number;         // milissegundos
  };
}
```

### log
```typescript
{
  type: 'log';
  payload: {
    executionId: string;
    jobId?: string;
    stepId?: string;
    line: string;              // Linha de log (com ou sem ANSI codes)
    level: 'info' | 'warn' | 'error' | 'debug';
    timestamp: string;         // ISO 8601
  };
}
```

### execution:end
```typescript
{
  type: 'execution:end';
  payload: {
    executionId: string;
    status: 'success' | 'failed' | 'cancelled';
    duration: number;          // milissegundos totais
    completedAt: string;       // ISO 8601
  };
}
```

### execution:error
```typescript
{
  type: 'execution:error';
  payload: {
    executionId: string;
    error: string;             // Mensagem descritiva (sem secrets)
    code?: string;             // Código do erro se disponível
  };
}
```

## Implementação do EventBus

```typescript
import { EventEmitter } from 'events';
import { WebviewPanel } from 'vscode';

type ActEvent = ExecutionStartEvent | JobUpdateEvent | StepUpdateEvent | LogEvent | ExecutionEndEvent | ExecutionErrorEvent;

class EventBus extends EventEmitter {
  private panels: Set<WebviewPanel> = new Set();

  registerPanel(panel: WebviewPanel): void {
    this.panels.add(panel);
    panel.onDidDispose(() => this.panels.delete(panel));
  }

  emit(event: ActEvent): boolean {
    // Propagar para todos os painéis ativos
    this.panels.forEach((panel) => {
      if (panel.visible) {
        panel.webview.postMessage(event);
      }
    });
    return super.emit(event.type, event.payload);
  }
}

export const eventBus = new EventBus();
```

## Regras Obrigatórias

- **Nunca usar polling** — toda atualização deve fluir via eventos
- **Eventos tipados** — usar discriminated unions TypeScript
- **Ordem garantida** — eventos de um mesmo step devem ser emitidos em ordem
- **Idempotência** — a UI deve tolerar eventos duplicados sem quebrar
- **Secrets fora dos payloads** — nunca incluir valores sensíveis em eventos

## Output
- Comunicação em tempo real sem polling
- UI sempre sincronizada com o estado de execução