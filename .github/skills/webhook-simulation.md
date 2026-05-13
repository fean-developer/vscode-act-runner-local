# Skill: Simulação de Webhook

## Objetivo
Simular eventos webhook do GitHub Actions com payloads JSON customizados, permitindo testar workflows acionados por eventos sem precisar de push real ao repositório.

## Eventos Suportados

| Evento | Trigger act | Descrição |
|---|---|---|
| `push` | `act push` | Push de código em branch |
| `pull_request` | `act pull_request` | Abertura/atualização de PR |
| `workflow_dispatch` | `act workflow_dispatch` | Disparo manual |
| `release` | `act release` | Criação de release/tag |
| `schedule` | `act schedule` | Agendamento cron |
| `issues` | `act issues` | Criação/atualização de issue |

## Payloads de Exemplo

### push
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "full_name": "usuario/repositorio",
    "default_branch": "main"
  },
  "pusher": {
    "name": "usuario",
    "email": "usuario@exemplo.com"
  },
  "commits": [
    {
      "id": "abc123",
      "message": "feat: nova funcionalidade",
      "author": { "name": "Usuario", "email": "usuario@exemplo.com" }
    }
  ]
}
```

### pull_request
```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "title": "feat: nova feature",
    "body": "Descrição da PR",
    "head": { "ref": "feature/nova", "sha": "abc123" },
    "base": { "ref": "main", "sha": "def456" },
    "user": { "login": "usuario" }
  },
  "repository": { "full_name": "usuario/repositorio" }
}
```

### workflow_dispatch
```json
{
  "inputs": {
    "environment": "staging",
    "version": "1.2.3"
  },
  "ref": "refs/heads/main",
  "repository": { "full_name": "usuario/repositorio" }
}
```

## Implementação do WebhookSimulator

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

class WebhookSimulator {
  // Gerar arquivo temporário de payload para passar ao act
  async createPayloadFile(eventType: string, payload: Record<string, unknown>): Promise<string> {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `act-event-${Date.now()}.json`);

    // Validar que payload não contém valores de secrets
    const safePayload = this.sanitizePayload(payload);
    fs.writeFileSync(filePath, JSON.stringify(safePayload, null, 2), 'utf-8');
    return filePath;
  }

  // Construir argumentos do act para simulação de evento
  buildActArgs(eventType: string, payloadPath: string, workflowPath?: string): string[] {
    const args = [eventType, '-e', payloadPath];
    if (workflowPath) args.push('-W', workflowPath);
    return args;
  }

  // Templates de payload por tipo de evento
  getTemplate(eventType: string): Record<string, unknown> {
    const templates: Record<string, Record<string, unknown>> = {
      push: { ref: 'refs/heads/main', repository: { full_name: 'owner/repo' } },
      pull_request: { action: 'opened', number: 1, pull_request: { title: 'PR title' } },
      workflow_dispatch: { inputs: {}, ref: 'refs/heads/main' },
      release: { action: 'published', release: { tag_name: 'v1.0.0' } },
    };
    return templates[eventType] ?? {};
  }

  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    // Remover quaisquer campos que pareçam secrets
    const dangerous = ['token', 'password', 'secret', 'key', 'auth'];
    return Object.fromEntries(
      Object.entries(payload).filter(([k]) => !dangerous.some((d) => k.toLowerCase().includes(d)))
    );
  }

  // Limpar arquivo temporário após uso
  cleanup(filePath: string): void {
    try { fs.unlinkSync(filePath); } catch { /* ignora */ }
  }
}
```

## UI do Simulador de Webhook (WebhookSimulator.tsx)

- Dropdown para seleção do tipo de evento
- Editor JSON com syntax highlighting para o payload
- Botão "Carregar Template" para popular payload com exemplo
- Botão "Simular Evento" para disparar a execução
- Validação de JSON inline (realtime)
- Histórico dos últimos 5 payloads usados

## Regras de Segurança

- **Nunca** incluir secrets reais em payloads de simulação
- Arquivos temporários de payload devem ser deletados após a execução
- Validar que o JSON é válido antes de passar ao act

## Output
- Execução do workflow acionada pelo evento simulado
- Resultado visível no grafo de execução em tempo real
