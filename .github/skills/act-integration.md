# Skill: Integração com act CLI

## Objetivo
Executar GitHub Actions localmente usando o CLI `nektos/act`, integrando com a extensão via streaming de stdout/stderr.

## Pré-requisitos
- `act` instalado (verificar com `act --version`)
- Runtime Docker disponível (Docker Desktop, Rancher Desktop, Podman, etc.)
- Arquivo `.actrc` configurado (opcional, mas recomendado)

## Comandos Suportados

### Executar workflow completo
```bash
act -W .github/workflows/ci.yml
```

### Executar job específico
```bash
act -j nome-do-job
```

### Dry run (sem execução real)
```bash
act -n
```

### Simular evento webhook
```bash
act push -e evento.json
act pull_request -e pr-payload.json
act workflow_dispatch
```

### Listar jobs disponíveis
```bash
act --list
```

### Configurar imagem Docker
```bash
# Usar imagem menor para desenvolvimento
act -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

## Detecção de Instalação

```typescript
import { execSync } from 'child_process';

function isActInstalled(): boolean {
  try {
    execSync('act --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
```

## Streaming de Output

```typescript
import { spawn } from 'child_process';

function runAct(args: string[]): void {
  const process = spawn('act', args, {
    cwd: workspaceRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  process.stdout.on('data', (chunk: Buffer) => {
    chunk.toString().split('\n').forEach((line) => {
      if (line.trim()) eventBus.emit('log', { line, level: 'info' });
    });
  });

  process.stderr.on('data', (chunk: Buffer) => {
    chunk.toString().split('\n').forEach((line) => {
      if (line.trim()) eventBus.emit('log', { line, level: 'error' });
    });
  });

  process.on('close', (code) => {
    eventBus.emit('execution:end', { status: code === 0 ? 'success' : 'failed' });
  });
}
```

## Sanitização de Inputs

Todos os inputs devem ser sanitizados antes de passar ao CLI:
```typescript
function sanitizeArg(arg: string): string {
  // Remover caracteres que poderiam injetar comandos shell
  return arg.replace(/[;&|`$<>(){}\[\]\\]/g, '');
}
```

## Fallback quando act não está instalado

- Exibir notificação com instruções de instalação
- Mostrar link para `https://github.com/nektos/act`
- Desabilitar comandos de execução até que `act` seja detectado

## Output
- Stream de execução linha a linha
- Eventos tipados emitidos via EventBus
- Logs estruturados no painel de logs da Webview