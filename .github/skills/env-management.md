# Skill: Gerenciamento de Variáveis de Ambiente

## Objetivo
Gerenciar com segurança as variáveis de ambiente, secrets e configurações do `act`, expondo uma UI amigável sem jamais vazar valores sensíveis.

## Arquivos Gerenciados

| Arquivo | Conteúdo | Sensibilidade |
|---|---|---|
| `.env` | Variáveis de ambiente não-secretas | Baixa |
| `.secrets` | Secrets e tokens de acesso | Alta |
| `.actrc` | Configurações do CLI `act` | Média |

## Formato dos Arquivos

### .env
```bash
NODE_ENV=development
API_URL=https://api.exemplo.com
DEBUG=true
```

### .secrets
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
DOCKER_PASSWORD=senha_segura
NPM_TOKEN=npm_xxxxxxxxxxxx
```

### .actrc
```bash
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--secret-file .secrets
--env-file .env
```

## Implementação do EnvManager

```typescript
import * as fs from 'fs';
import * as path from 'path';

class EnvManager {
  // Ler arquivo de environment como mapa chave-valor
  readEnvFile(filePath: string): Map<string, string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const map = new Map<string, string>();
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        map.set(key.trim(), valueParts.join('=').trim());
      }
    });
    return map;
  }

  // Escrever mapa de volta ao arquivo
  writeEnvFile(filePath: string, vars: Map<string, string>): void {
    const content = Array.from(vars.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
```

## Regras de Segurança

- **Nunca** serializar valores do `.secrets` para o estado da Webview
- **Nunca** logar valores de secrets em qualquer canal de output
- **Sempre** mascarar campos de secrets na UI com `type="password"`
- **Nunca** incluir `.secrets` em commits (garantir que está no `.gitignore`)
- Valores de secrets devem ser passados ao CLI via `--secret-file`, nunca via argumentos inline

## UI de Edição (EnvEditor.tsx)

- Tabela editável com colunas: Chave | Valor | Ações
- Campos de secrets com máscara (`***`), revelação opcional sob demanda
- Botão de adicionar variável
- Botão de remover variável
- Validação de formato (sem espaços na chave, sem caracteres inválidos)
- Botão de salvar com confirmação para `.secrets`

## Output
- Configuração de ambiente segura e persistida
- Secrets nunca expostos na UI ou nos logs