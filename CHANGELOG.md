# Changelog

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
