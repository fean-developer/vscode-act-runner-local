# Changelog

## Não Lançado

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

### Alterado

- O webview principal agora abre na coluna principal do editor para uma experiência de UI mais expandida.
- A sidebar nativa do VS Code é fechada ao abrir a UI do Act Visual Runner pela Activity Bar.
- A view de grafo do workflow agora inclui o cabeçalho compartilhado de resumo da execução.
- A view Summary agora reutiliza o mesmo componente de grafo da view Grafo, preservando o layout de jobs paralelos.
- O botão Executar agora usa o workflow selecionado na sidebar interna quando não há execução ativa.
