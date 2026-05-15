# Instruções Copilot — Act Visual Runner (Extensão VSCode)

## 🎯 Objetivo

Construir uma extensão VSCode que integra com `nektos/act` e fornece uma **interface visual de execução de workflows**, similar ao n8n, permitindo que desenvolvedores:

- Executem workflows GitHub Actions localmente
- Visualizem steps sendo executados em tempo real num grafo interativo
- Depurem execuções localmente com rastreamento detalhado
- Gerenciem variáveis de ambiente e secrets com segurança
- Repliquem e simulem execuções passadas
- Simulem eventos webhook com payloads customizados

---

## 🧠 Arquitetura

O projeto segue uma **arquitetura modular orientada a specs**:

- **Extension Host** (Node.js / TypeScript) — lógica principal da extensão
- **Webview UI** (React + React Flow) — interface visual estilo n8n
- **Execution Engine** (act runner + parser) — motor de execução
- **Camada de Comunicação por Eventos** — atualizações em tempo real via EventBus

---

## ⚙️ Componentes Principais

### Backend (Extension Host)
| Arquivo | Responsabilidade |
|---|---|
| `actRunner.ts` | Executa o CLI `act`, streama stdout/stderr |
| `workflowParser.ts` | Faz parse de YAMLs do GitHub Actions |
| `executionEngine.ts` | Orquestra a execução de jobs e steps |
| `eventBus.ts` | Emite eventos de atualização em tempo real |
| `historyService.ts` | Persiste e recupera histórico de execuções |
| `envManager.ts` | Gerencia `.env`, `.secrets`, `.actrc` |
| `webhookSimulator.ts` | Simula eventos webhook com payloads JSON |
| `workflowValidator.ts` | Valida YAML com regras do GitHub Actions |
| `templateEngine.ts` | Gera workflows e scripts a partir de templates |
| `codeLensProvider.ts` | Provê CodeLens nos arquivos YAML de workflow |
| `statusBarController.ts` | Controla a barra de status da extensão |
| `dockerGuide.ts` | Exibe guia de alternativas ao Docker Desktop |

### Frontend (Webview UI)
| Tecnologia | Uso |
|---|---|
| React | Base da interface de usuário |
| React Flow | Grafo visual de nós (estilo n8n) |
| Zustand | Gerenciamento de estado global |
| xterm.js | Terminal embutido para exibição de logs |
| shadcn/ui | Componentes visuais estilizados |

---

## 🚀 Funcionalidades a Implementar

### Execução
- **Execução Rápida de Workflow** — Rodar workflows com um clique
- **Quick Run** — Executar o workflow padrão instantaneamente, sem prompts
- **Seleção de Job** — Executar jobs específicos de um workflow
- **Modo Dry Run** — Pré-visualizar a execução sem rodar de verdade

### Interface Visual
- **Explorador de Workflows** — Navegar todos os workflows na sidebar da IDE
- **Grafo de Execução** — Visualização estilo n8n dos jobs e steps em tempo real
- **Integração com Status Bar** — Acesso rápido via barra de status do VSCode
- **Integração CodeLens** — Botões de execução diretamente nos arquivos YAML

### Configuração e Gerenciamento
- **Gerenciamento de Variáveis de Ambiente** — UI para editar `.env`, `.secrets` e `.actrc`
- **Auto-Detecção do act** — Verifica instalação e guia o setup inicial
- **Configuração via UI** — Editar `.actrc` e `.secrets` pela interface

### Validação
- **Validação de Workflow** — Lint e validação dos arquivos YAML de GitHub Actions

### Simulação e Testes
- **Simulação de Webhook** — Disparar workflows com payloads de eventos customizados

### Histórico e Rastreabilidade
- **Histórico de Execuções** — Rastrear e re-executar execuções passadas com filtros

### Geração de Conteúdo
- **Templates de Workflow** — Início rápido com templates CI/CD pré-construídos
- **Gerador de Scripts** — Criar scripts de automação em PowerShell, Bash, Python e Bicep

### Guias e Segurança
- **Guia de Alternativas Docker** — Alternativas gratuitas ao Docker Desktop para empresas
- **Boas Práticas de Segurança** — Guia completo para gerenciamento seguro de secrets

---

## 🔄 Sistema de Eventos

Toda comunicação em tempo real deve usar eventos via `EventBus`:

| Evento | Payload | Descrição |
|---|---|---|
| `execution:start` | `{ executionId, workflow, jobs }` | Início de uma execução |
| `job:update` | `{ executionId, jobId, status }` | Atualização de status de job |
| `step:update` | `{ executionId, jobId, stepId, status, duration }` | Atualização de status de step |
| `log` | `{ executionId, stepId, line, level }` | Linha de log individual |
| `execution:end` | `{ executionId, status, duration }` | Fim de uma execução |
| `execution:error` | `{ executionId, error }` | Erro crítico na execução |

**Regra:** Nunca usar polling. Todo dado deve fluir via eventos.

---

## 🎨 Requisitos de Interface (UI)

### Grafo de Workflow (n8n style)
- Cada **job** é um nó agrupador
- Cada **step** é um nó filho dentro do job
- **Arestas** representam dependências (`needs`)
- **Animações** de transição entre estados são obrigatórias

### Estados dos Nós
| Estado | Cor | Ícone |
|---|---|---|
| `idle` | Cinza `#6B7280` | ⬜ |
| `running` | Azul `#3B82F6` | 🔄 (animado) |
| `success` | Verde `#10B981` | ✅ |
| `failed` | Vermelho `#EF4444` | ❌ |
| `skipped` | Amarelo `#F59E0B` | ⏭️ |

### Painel de Logs
- Terminal embutido via xterm.js
- Logs em streaming, linha a linha
- Filtro por job e step
- Busca e destaque de texto

---

## 🧩 Princípios de Design

1. **Spec-first** — Definir tipos antes de implementar lógica
2. **Event-driven** — Toda comunicação por eventos, nunca por polling
3. **Separação clara** — Parsing ≠ Execução ≠ UI
4. **Atualizações em tempo real** — Obrigatório, não opcional
5. **UI reativa** — Estado refletido imediatamente na interface
6. **Segurança** — Secrets nunca expostos na UI ou logs

---

## ⚠️ Restrições

- Nunca bloquear a thread de UI
- Sempre fazer streaming de logs (não bufferizar tudo)
- Sempre fazer pre-parse do workflow antes da execução
- Nunca expor secrets em logs ou mensagens de erro
- Sempre validar YAML antes de tentar executar
- Prover fallback claro se `act` não estiver instalado

---

## ✅ Boas Práticas

- Usar **Zod** para validação de schemas em runtime
- Usar **async/streaming** em toda interação com o CLI
- Manter interação com `act` isolada em `actRunner.ts`
- Prover fallback e mensagem de erro se `act` não for encontrado
- Usar `vscode.ExtensionContext.globalState` para persistência de histórico
- Sanitizar todos os inputs antes de passar ao CLI

---

## 📁 Estrutura de Pastas Esperada

```
src/
├── extension.ts              # Entry point
├── core/
│   ├── actRunner.ts
│   ├── executionEngine.ts
│   ├── workflowParser.ts
│   ├── workflowValidator.ts
│   ├── eventBus.ts
│   ├── historyService.ts
│   ├── envManager.ts
│   ├── webhookSimulator.ts
│   ├── templateEngine.ts
│   └── dockerGuide.ts
├── providers/
│   ├── codeLensProvider.ts
│   ├── statusBarController.ts
│   └── workflowExplorer.ts
├── webview/
│   ├── App.tsx
│   ├── components/
│   │   ├── WorkflowGraph.tsx
│   │   ├── StepNode.tsx
│   │   ├── JobNode.tsx
│   │   ├── LogPanel.tsx
│   │   ├── ControlBar.tsx
│   │   ├── EnvEditor.tsx
│   │   ├── WebhookSimulator.tsx
│   │   ├── HistoryPanel.tsx
│   │   └── TemplateSelector.tsx
│   └── store/
│       └── executionStore.ts
└── types/
    ├── workflow.types.ts
    ├── execution.types.ts
    └── events.types.ts
```

---

## 📦 Expectativas de Entrega

- Extensão pronta para produção
- Código modular e testável
- Separação clara de responsabilidades
- Todos os componentes tipados com TypeScript strict
- Cobertura de testes para parsing e execução

---

## 🤖 Regras de Comportamento (Copilot / Agentes)

- Sempre seguir as specs de `/specs` e `/skills`
- Nunca hardcodar lógica de workflow
- Sempre usar modelos tipados (TypeScript interfaces/types)
- Preferir serviços composáveis e reutilizáveis
- Manter UI reativa, nunca imperativa
- Delegar ao agente correto conforme o domínio da tarefa
- Consultar as skills em `.github/skills/` antes de implementar cada funcionalidade

## Comunicação 
 - Todas respostas no chat devem ser em português
 - Sempre usar linguagem clara e objetiva
 - Evitar jargões técnicos sem explicação
 - Fornecer exemplos práticos quando possível
 - Priorizar a simplicidade e legibilidade do código
 - Manter a consistência de estilo em todo o código
 - Documentar funções complexas com comentários claros
 - Validar inputs rigorosamente para evitar erros em runtime
 - Garantir que a extensão seja fácil de usar e configurar para o usuário final