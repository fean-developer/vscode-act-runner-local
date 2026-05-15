# Act Visual Runner — User Guide

## Requisitos

Antes de usar, confirme que você tem:

1. **nektos/act** instalado
2. **Docker** (ou Rancher Desktop / OrbStack / Podman com socket Docker compatível) rodando
3. Um repositório com workflows em `.github/workflows/*.yml`

---

# Guia de instalação do nektos/act

- Para instalar o `act` siga a documentação oficial [act - User Guide | Manual | Docs | Documentation](https://nektosact.com/installation/index.html)

## Primeira execução

### 1. Abrir o painel

Clique no ícone **⏵ ACT Runner** na barra de atividades lateral esquerda do VSCode.

### 2. Selecionar o projeto

Se o workspace tiver múltiplas pastas, use **Act: Selecionar Projeto** para apontar para o repositório correto.

### 3. Executar um workflow

- No **Explorador de Workflows** (painel lateral), expanda a lista de workflows
- Clique no workflow desejado → botão **▶**
- Ou use a paleta de comandos (`Ctrl+Shift+P`) → `Act: Executar Workflow`

O grafo visual abre automaticamente e atualiza em tempo real.

---

## Grafo de execução

O grafo mostra os **jobs** como cards coloridos com a dependência entre eles:

| Cor | Status |
|---|---|
| Cinza | Aguardando |
| Azul pulsando | Em execução |
| Verde | Concluído com sucesso |
| Vermelho | Falhou |
| Amarelo | Ignorado (skipped) |

- **Clique no card** para expandir os steps internos
- **Arraste** para reposicionar os cards no canvas
- Os **conectores** mostram o fluxo de dependências (apenas arestas essenciais — sem redundâncias transitivas)

---

## Configurar secrets e variáveis

Crie os arquivos na raiz do repositório:

**`.secrets`** — secrets passados ao act:
```
GITHUB_TOKEN=ghp_...
SONAR_TOKEN=sqa_...
DOCKER_PASSWORD=...
```

**`.env`** — variáveis de ambiente:
```
ENV=local
APP_URL=http://localhost:3000
```

**`.actrc`** — configuração padrão do act:
```
--platform ubuntu-latest=catthehacker/ubuntu:act-latest
--secret-file .secrets
--env-file .env
```

Ou use a UI: `Ctrl+Shift+P` → **Act: Gerenciar Variáveis de Ambiente**
> [!IMPORTANT]
> ⚠️ Nunca versione o arquivo `.secrets`. Adicione ao `.gitignore`.

---

## Executar um job específico

1. `Ctrl+Shift+P` → **Act: Executar Job**
2. Selecione o workflow e depois o job desejado

---

## Validar workflow

`Ctrl+Shift+P` → **Act: Validar Workflow**

Verifica erros de sintaxe no YAML antes de executar.

Também disponível como **CodeLens** diretamente nos arquivos `.yml` de workflow.

---

## Histórico de execuções

`Ctrl+Shift+P` → **Act: Ver Histórico**

Lista execuções anteriores com status, duração e possibilidade de re-executar.

---

## Configurar caminho do `act`

Se o `act` não estiver no PATH:

1. `Ctrl+,` → Settings → pesquise `actRunner.actPath`
2. Informe o caminho completo, ex.: `/usr/local/bin/act` ou `C:\tools\act.exe`

Ou via `Ctrl+Shift+P` → **Act: Localizar Executável do act**

---

## Problemas comuns

| Problema | Solução |
|---|---|
| `act: command not found` | Configure `actRunner.actPath` ou instale o act |
| `Cannot connect to Docker` | Inicie o Docker Desktop / Rancher Desktop |
| `ERRO: image not found` | Adicione `--pull=missing` no `.actrc` |
| Workflow não aparece no explorador | Confirme que existem arquivos em `.github/workflows/` |
| `Connect Timeout Error` em actions que chamam GitHub API | Adicione `github-token: ${{ github.token \|\| '' }}` na action |
| Grafo não atualiza | Use `Act: Resetar Estado (forçar)` na paleta de comandos |

---

## Alternativas ao Docker Desktop

Para ambientes corporativos que não podem usar Docker Desktop:

`Ctrl+Shift+P` → **Act: Guia Alternativas Docker**

O guia cobre: Rancher Desktop, OrbStack, Podman Desktop e Colima.
