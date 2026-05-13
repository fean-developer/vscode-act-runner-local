# Skill: Parsing de Logs do act

## Objetivo
Extrair eventos estruturados de steps e jobs a partir do output ANSI do CLI `nektos/act`, emitindo eventos tipados para o EventBus.

## Formato do Output do act

O `act` produz output com prefixos identificando job e step:

```
[job-name/step-name]  ⭐ Run step-name
[job-name/step-name]  | linha de log do step
[job-name/step-name]  ✅ Success - step-name
[job-name/step-name]  ❌ Failure - step-name
[job-name/step-name]  ⏭️  Skipping step-name
```

## Expressões Regulares de Parsing

```typescript
const PATTERNS = {
  // Início de step: [job/step]  ⭐ Run Nome
  stepStart:  /^\[([^/]+)\/([^\]]+)\]\s+⭐\s+Run\s+(.+)$/,

  // Sucesso de step: [job/step]  ✅ Success - Nome
  stepSuccess: /^\[([^/]+)\/([^\]]+)\]\s+✅\s+Success\s+-\s+(.+)$/,

  // Falha de step: [job/step]  ❌ Failure - Nome
  stepFailure: /^\[([^/]+)\/([^\]]+)\]\s+❌\s+Failure\s+-\s+(.+)$/,

  // Step pulado: [job/step]  ⏭️  Skipping Nome
  stepSkipped: /^\[([^/]+)\/([^\]]+)\]\s+⏭️\s+Skipping\s+(.+)$/,

  // Linha de log: [job/step]  | conteúdo
  logLine:    /^\[([^/]+)\/([^\]]+)\]\s+\|\s*(.*)$/,

  // Início de job
  jobStart:   /^\[([^\]]+)\]\s+🚀\s+Start image/,
};
```

## Implementação do Parser

```typescript
function parseLine(line: string, executionId: string): ActEvent | null {
  // Remover ANSI escape codes antes de parsear
  const clean = line.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');

  let match: RegExpMatchArray | null;

  if ((match = clean.match(PATTERNS.stepStart))) {
    const [, jobId, stepId, stepName] = match;
    return {
      type: 'step:update',
      payload: { executionId, jobId, stepId, stepName, status: 'running', startedAt: new Date().toISOString() },
    };
  }

  if ((match = clean.match(PATTERNS.stepSuccess))) {
    const [, jobId, stepId, stepName] = match;
    return {
      type: 'step:update',
      payload: { executionId, jobId, stepId, stepName, status: 'success', completedAt: new Date().toISOString() },
    };
  }

  if ((match = clean.match(PATTERNS.stepFailure))) {
    const [, jobId, stepId, stepName] = match;
    return {
      type: 'step:update',
      payload: { executionId, jobId, stepId, stepName, status: 'failed', completedAt: new Date().toISOString() },
    };
  }

  if ((match = clean.match(PATTERNS.logLine))) {
    const [, jobId, stepId, content] = match;
    return {
      type: 'log',
      payload: { executionId, jobId, stepId, line: content, level: 'info', timestamp: new Date().toISOString() },
    };
  }

  return null;
}
```

## Remoção de ANSI Codes

O output do `act` contém códigos de cor ANSI. Remover antes de parsear com regex, mas preservar para exibição no xterm.js:

```typescript
const ANSI_REGEX = /\x1B\[[0-9;]*[mGKHFJK]/g;

function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}
```

## Output
- Eventos tipados `step:update` e `log` emitidos no EventBus
- Tracking preciso de início, sucesso e falha de cada step