# Changelog

## v2.10.23

### Adicionado

- Tela Summary agora exibe uma seção **Artifacts** no estilo GitHub Actions, abaixo do grafo da execução.
- A seção suporta múltiplos artefatos por execução, exibindo nome, tamanho e ação de download.

## v2.10.22

### Adicionado

- Busca no log atual com contador de ocorrências, navegação anterior/próxima e destaque da linha encontrada.
- Busca dentro do log expandido no Histórico, também com contador, navegação e destaque da ocorrência ativa.

## v2.10.21

### Corrigido

- Secrets e variáveis com valores multilinha entre aspas agora são carregados e salvos sem quebrar o formulário de edição.
- Conteúdo de uma private key multilinha não é mais interpretado como novas secrets vazias.
- Tela de Analytics alinhada ao visual escuro GitHub-like usado nas demais telas.

### Adicionado

- Histórico agora lista artefatos gerados pelo `actions/upload-artifact` quando o `act` usa `--artifact-server-path`.
- Cada artefato pode ser mostrado no sistema de arquivos ou baixado/copiado para outro destino pela extensão.

## v2.10.20

### Segurança

- Corrigidas 3 vulnerabilidades identificadas pelo Dependabot via `npm audit fix`:
  - **HIGH** `ws` ≤8.20.1 — Memory exhaustion DoS from tiny fragments (GHSA-96hv-2xvq-fx4p)
  - **MODERATE** `js-yaml` ≤4.1.1 — Quadratic-complexity DoS via repeated aliases (GHSA-h67p-54hq-rp68)
  - **LOW** `@babel/core` ≤7.29.0 — Arbitrary File Read via sourceMappingURL (GHSA-4x5r-pxfx-6jf8)
- 19 pacotes atualizados; todos os 39 testes continuam passando

## v2.10.19

### Alterado

- Settings redesenhado com sidebar lateral estilo GitHub Settings:
  - Sidebar esquerda com item **Actions** (expansível no futuro)
  - 3 abas principais: **Secrets** | **Variables** | **Args do ACT**
  - Aba **Variables** possui sub-abas pill: **.vars** e **.env** — ao selecionar carrega o arquivo correspondente
  - Toda funcionalidade de CRUD preservada (adicionar, editar, deletar, salvar arquivo)

## v2.10.18

### Alterado

- Tela de Settings completamente redesenhada para ser idêntica à página "Actions secrets and variables" do GitHub:
  - Header com título e descrição explicativa igual ao GitHub
  - Abas de navegação: **Secrets**, **Variables**, **.env**, **.actrc** com sublinhado laranja no estilo GitHub
  - Seção com título e botão **"New repository secret/variable"** no canto direito
  - Lista com ícone de cadeado (secrets), nome em azul, valor mascarado ou visível
  - Botões de editar (✏️) e deletar (🗑️) inline em cada linha
  - Formulário de adição/edição abre inline na mesma tela (sem modal)
  - Estado vazio com mensagem e botão para adicionar
  - Seletor de arquivo de origem agora é colapsável

## v2.10.17

### Alterado

- A tela de variáveis e secrets (Settings) foi redesenhada com estilo GitHub, incluindo:
  - Navegação em abas com ícones e estilo GitHub-like
  - Tabela com grid layout mais limpo e espaçamento consistente
  - Ações inline com ícones (remover/deletar)
  - Estado vazio com mensagem descritiva
  - Melhor feedback visual com transições suaves
- Menu "Variáveis" foi renomeado para "⚙️ Settings" na barra de controle superior
- Funcionalidade mantida: todas as operações (adicionar, editar, salvar, carregar arquivos) continuam funcionando

## v2.10.16

### Adicionado

- A tela de Histórico agora segue o layout do GitHub Actions, com busca no topo, linhas de execução, branch visível e menu de ações `...`.
- Adicionada paginação no Histórico com limite de 20 execuções por página.
- O menu `...` de cada execução agora concentra as ações **Ver log**, **Reexecutar** e **Deletar**.

### Corrigido

- A branch/ref usada no `workflow_dispatch` agora é salva no registro de histórico e exibida na lista.

## v2.10.15

### Corrigido

- Ao abrir uma execução pelo Histórico, o repositório selecionado agora volta para o projeto em que aquela execução foi feita.
- Re-execuções vindas do Histórico agora usam o root do workflow original para resolver workflows, variáveis e secrets.

## v2.10.14

### Adicionado

- O modal **Run workflow** agora permite escolher a branch usada no evento `workflow_dispatch`.
- A branch selecionada é enviada no payload do `act` como `ref`, em vez de usar sempre `refs/heads/main`.

## v2.10.13

### Corrigido

- Os snapshots do grafo agora são persistidos no histórico da extensão, permitindo reabrir o painel e continuar acessando o grafo final e a timeline de logs da execução.
- Corrigida a perda do link de restauração no Histórico quando a webview era fechada e aberta novamente.

## v2.10.12

### Adicionado

- Adicionado histórico visual do grafo por linha de log: ao clicar em uma linha, o grafo volta para o estado daquela execução naquele momento.
- Adicionado botão para retornar ao estado mais recente do grafo após navegar por um ponto anterior do log.
- Execuções concluídas nesta sessão agora podem ser reabertas pelo painel Histórico para restaurar o grafo final daquela execução.

## v2.10.11

### Alterado

- O modal **Run workflow** agora preserva os últimos valores informados por workflow ao fechar e abrir novamente.
- Os cards de job no grafo agora mantêm fundo cinza, usando a cor de status apenas em bordas e indicadores visuais.

## v2.10.10

### Adicionado

- Adicionado suporte para renderizar HTML diretamente no painel de logs.

### Segurança

- A renderização HTML no log agora aplica sanitização com allowlist de tags e estilos para bloquear scripts, handlers inline e atributos não permitidos.

### Alterado

- Linhas de log com HTML (ex.: `<div style="color:red">...<br>...</div>`) passam a ser exibidas formatadas, enquanto logs ANSI e texto puro continuam funcionando normalmente.

## v2.10.9

### Adicionado

- Adicionado controle de colapsar/expandir para a sidebar de workflows (lado esquerdo), iniciando aberta por padrão.

### Alterado

- A sidebar de execução agora inicia com jobs/steps colapsados em cada nova execução, sem auto-expansão automática.

## v2.10.8

### Corrigido

- Corrigida a detecção de anotações do GitHub Actions em variações de saída do `act` com separador não estritamente `::` após atributos (ex.: `title=...:mensagem`).
- Corrigida a falha residual onde linhas com `?::notice ...` podiam permanecer como `info` em vez de `notice`.

## v2.10.7

### Corrigido

- Corrigida a classificação de comandos oficiais do GitHub Actions quando o `act` prefixa a linha com ícones/símbolos (ex.: `❓ ::notice ...`).
- Corrigida a renderização sem cor para logs textuais com prefixo de nível (`[INFO]`, `[DEBUG]`, `[WARN]`, `[ERROR]`), agora mapeados para níveis visuais da UI.

### Alterado

- O parser de anotação oficial (`::notice::`, `::warning::`, `::error::`, `::debug::`) agora detecta o comando mesmo quando não está no início absoluto da linha.

## v2.10.6

### Alterado

- O parser de nível de log não depende mais de prefixos customizados como `logger::info` ou `[INFO]`.
- A classificação de nível especial agora fica restrita aos comandos oficiais do GitHub Actions (`::notice::`, `::warning::`, `::error::`, `::debug::`).

### Corrigido

- Corrigida a renderização de cores quando o workflow emite escapes ANSI em formato textual (`\\033[`, `\\x1b[`, `\\u001b[`) além do escape real.
- Corrigido o acoplamento a formatos de logger customizados, permitindo que qualquer função interna baseada em ANSI funcione sem regra específica no parser.

## v2.10.5

### Adicionado

- Adicionado suporte para nível de log `notice` no pipeline de eventos e na UI de logs.
- Adicionada renderização de sequências ANSI (`\x1b[...m`) no painel de logs para exibir cores reais emitidas pelo workflow.
- Adicionados testes de regressão cobrindo parse de `::notice::`, `::error::` e `[INFO]`.

### Alterado

- O parser de logs agora interpreta comandos do GitHub Actions (`::notice::`, `::warning::`, `::error::`, `::debug::`) e remove o prefixo técnico da mensagem exibida.
- Logs com prefixo `logger::info` e `[INFO]` agora são tratados como `notice` para visualização em azul no painel.

### Corrigido

- Corrigida a exibição de mensagens `::notice::` e `::error::` que antes apareciam como texto cru sem coloração contextual.
- Corrigida a perda de cores de linhas com ANSI no webview, que antes eram mostradas sempre em cor neutra.

## v2.10.3

### Adicionado

- Adicionada seleção via diálogo de arquivo para `.env`, `.vars` e `.secrets`.
- Adicionada persistência do caminho escolhido por projeto ao reabrir a tela **Variáveis**.
- Adicionados testes para garantir que arquivos selecionados sejam recuperados corretamente após troca ou reabertura da tela.

### Alterado

- A tela **Variáveis** agora deixa o campo de arquivo vazio quando nenhum arquivo existente ou selecionado foi encontrado.
- O salvamento de `.env`, `.vars` e `.secrets` agora exige um arquivo selecionado quando nenhum caminho válido foi encontrado.

## v2.10.2

### Adicionado

- Adicionado seletor/editável de caminho também para arquivos `.env` e `.secrets` na tela **Variáveis**.

### Alterado

- A execução agora resolve `--var-file` a partir do projeto selecionado, mesmo quando o `act` roda a partir de um diretório pai.
- A execução agora detecta e passa automaticamente `--secret-file` a partir do projeto selecionado, mesmo quando o `act` roda a partir de um diretório pai.

### Corrigido

- Corrigido erro ao salvar `.vars` ou arquivos selecionados quando a configuração `actRunner.varFile` ainda não estava registrada na sessão ativa do VS Code.
- Corrigido mascaramento parcial na aba `.secrets`; agora todos os valores ficam ocultos por padrão.

## v2.10.1

### Adicionado

- Adicionada aba **.vars** na tela **Variáveis** para gerenciar variáveis do contexto `${{ vars.* }}` do GitHub Actions.
- Adicionado suporte a arquivo de vars customizado, compatível com `act --var-file my.variables`.
- Adicionada configuração `actRunner.varFile` para persistir o arquivo de vars usado nas execuções locais.
- Adicionado botão **Carregar** na aba `.vars` para ler arquivos como `.vars`, `my.variables` ou outro caminho informado pelo usuário.
- Adicionados testes de regressão para garantir que `.env`, `.vars` e arquivos customizados sejam enviados corretamente ao `act`.

### Alterado

- A execução agora usa o arquivo configurado em `actRunner.varFile` como `--var-file` quando ele existe.
- A tela **Variáveis** agora diferencia variáveis de ambiente (`.env`) das variáveis do contexto `vars` (`.vars`).
- O arquivo `.env` continua sendo usado como fallback para `--var-file` quando `.vars` ou o arquivo configurado não existem.

### Corrigido

- Corrigido o caso em que workflows com `runs-on: ${{ vars.RUNNER || vars.DEFAULT_RUNNER }}` não reconheciam valores definidos localmente.
- Corrigida a ausência de variáveis do arquivo `.vars` na interface de gerenciamento de variáveis.

## v2.10.0

### Adicionado

- Adicionada uma view dedicada **Summary** para a saída de `GITHUB_STEP_SUMMARY`.
- Adicionada detecção em tempo de execução do conteúdo de summary emitido pelos logs do `act`, com suporte aos formatos `Summary - ...` e `◎ Summary - ...`.
- Adicionado layout do Summary inspirado no GitHub Actions, com sidebar, metadados da execução, visualização do workflow e card de job summary.
- Adicionado suporte para renderizar o conteúdo do summary como Markdown, texto puro e HTML sanitizado.
- Adicionado um cabeçalho compartilhado de resumo da execução com status, duração total, contagem de jobs e indicador de artifacts.
- Adicionada a view **Analytics** com:
  - Filtro de período.
  - Filtros por workflow, job e status.
  - Cards de métricas gerais.
  - Gráfico de builds ao longo do tempo.
  - Gráfico de minutos ao longo do tempo.
  - Distribuição de duração dos jobs.
  - Top 5 jobs mais lentos.
- Adicionado `ANALYTICS_GUIDE.md` explicando a tela de Analytics e cada métrica/gráfico.
- Adicionada uma sidebar interna de workflows na UI do webview.
- Adicionada seleção de repositório dentro da UI do webview.
- Adicionado envio da lista de workflows do extension host para o webview.
- Adicionado comportamento de executar workflow ao clicar em um item da sidebar interna.
- Adicionada abertura automática da UI principal do Act Visual Runner ao selecionar a extensão na Activity Bar.
- Adicionado suporte a `workflow_dispatch.inputs` antes da execução do workflow.
- Adicionado modal **Run workflow** para preencher inputs do workflow no estilo do GitHub Actions.
- Adicionado suporte a inputs dos tipos `string`, `number`, `boolean`, `choice` e `environment`.
- Adicionado envio de payload temporário `workflow_dispatch` para o `act` com os valores informados na UI.

### Alterado

- O webview principal agora abre na coluna principal do editor para uma experiência de UI mais expandida.
- A sidebar nativa do VS Code é fechada ao abrir a UI do Act Visual Runner pela Activity Bar.
- A view de grafo do workflow agora inclui o cabeçalho compartilhado de resumo da execução.
- A view Summary agora reutiliza o mesmo componente de grafo da view Grafo, preservando o layout de jobs paralelos.
- O botão Executar agora usa o workflow selecionado na sidebar interna quando não há execução ativa.
- O botão Executar agora abre o modal de inputs quando o workflow selecionado possui `workflow_dispatch.inputs`.

### Corrigido

- Corrigida a ausência de fluxo visual para informar inputs obrigatórios antes de executar workflows manuais.
