# Analytics - Act Visual Runner

[English](ANALYTICS_GUIDE.md) | **Português (Brasil)**

Este painel consolida o histórico de execuções locais do Act Visual Runner. Ele ajuda a entender o tempo de execução, a frequência de falhas, os minutos estimados e quais jobs têm maior impacto na duração dos workflows.

## Filtros

### Período

Define o período analisado: últimos 7, 30 ou 90 dias, ou todo o histórico disponível.

### Workflow

Filtra os dados por workflow. Use para comparar uma única pipeline, como `CI/CD Pipeline`.

### Job

Filtra os dados por um job específico. Isso ajuda a investigar o tempo e as falhas de uma etapa individual do workflow, como build, tests ou deploy.

### Status

Filtra as execuções por resultado: sucesso, falha ou cancelamento.

### Limpar todos os filtros

Remove os filtros de workflow, job e status e retorna à visão agregada do período selecionado.

## Visão geral

### Duração média

Duração média dos jobs ou execuções selecionados pelos filtros atuais. Use para identificar se uma pipeline está ficando mais lenta ao longo do tempo.

### Taxa média de falhas

Percentual médio de execuções com falha no conjunto filtrado. Também exibe a quantidade de falhas em relação ao total analisado.

### Minutos totais

Total de minutos executados localmente durante o período filtrado. Isso ajuda a visualizar o volume total de processamento gasto nos workflows.

### Minutos faturáveis

Representa minutos comparáveis aos minutos cobrados em uma execução hospedada. No contexto local, é uma estimativa operacional.

### Tempo estimado economizado

Tempo estimado economizado em comparação com uma execução hospedada. O cálculo é uma aproximação baseada no total de minutos registrados.

### Economia estimada

Economia financeira estimada com base no tempo economizado. Esse valor aproximado é um indicador de tendência, não uma cobrança real.

## Gráficos

### Builds ao longo do tempo

Exibe a quantidade de execuções por dia no período selecionado. Barras verdes representam execuções bem-sucedidas e barras vermelhas representam falhas.

### Minutos ao longo do tempo

Exibe os minutos consumidos por dia. Use para identificar picos de uso, workflows mais pesados e períodos em que a execução local demorou mais.

### Sucessos e erros

Resumo lateral dos gráficos. Exibe os totais de execuções bem-sucedidas e com falha, ou o volume agregado relacionado ao gráfico selecionado.

## Distribuição da duração dos jobs

Agrupa os jobs em faixas de duração, como `0-1m`, `1-5m` e `5-10m`. Essa distribuição mostra se a maioria dos jobs é rápida ou se está concentrada em faixas mais longas.

## 5 jobs mais lentos

Lista os cinco jobs com maior duração média. Use esta seção para priorizar otimizações, como cache de dependências, paralelização, redução de steps ou ajustes nas imagens Docker.

## Observações sobre os dados

Os dados vêm do histórico local salvo pela extensão. Se não houver histórico suficiente, alguns gráficos podem ficar vazios ou apresentar valores baixos. Quanto mais execuções forem registradas, mais útil será a análise de tendências.
