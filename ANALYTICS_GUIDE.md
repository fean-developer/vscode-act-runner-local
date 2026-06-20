# Analytics - Act Visual Runner

Esta tela consolida dados do histórico de execuções locais do Act Visual Runner. Ela ajuda a entender tempo de execução, frequência de falhas, consumo estimado de minutos e quais jobs estão impactando mais a duração dos workflows.

## Filtros

### Timeframe

Define o período analisado: últimos 7 dias, últimos 30 dias, últimos 90 dias ou todo o histórico disponível.

### Workflow

Filtra os dados por workflow. Use quando quiser comparar apenas uma pipeline específica, por exemplo `CI/CD Pipeline`.

### Job

Filtra os dados por um job específico. Isso permite investigar tempos e falhas de uma etapa isolada do workflow, como build, tests ou deploy.

### Status

Filtra execuções por resultado: sucesso, falha ou cancelamento.

### Clear All Filters

Remove os filtros de workflow, job e status, voltando para uma visão agregada do período selecionado.

## Overview

### Average Duration

Tempo médio de duração dos jobs ou execuções consideradas pelos filtros atuais. Serve para identificar se a pipeline está ficando mais lenta ao longo do tempo.

### Average Failure Rate

Percentual médio de execuções com falha dentro do conjunto filtrado. Também mostra a contagem de falhas sobre o total analisado.

### Total Minutes

Soma dos minutos executados localmente no período filtrado. É útil para entender o volume total de processamento gasto nos workflows.

### Billable Minutes

Representa os minutos que seriam comparáveis a minutos cobrados em execução hospedada. No contexto local, é uma estimativa para comparação operacional.

### Est. Time Saved

Estimativa de tempo economizado em relação a uma execução hospedada. O cálculo usa uma aproximação baseada no total de minutos registrados.

### Est. Cost Savings

Estimativa de economia financeira baseada no tempo economizado. O valor é aproximado e serve como indicador de tendência, não como cobrança real.

## Charts

### Builds Over Time

Mostra a quantidade de execuções por dia no período selecionado. Barras verdes representam execuções com sucesso e barras vermelhas indicam falhas. Ajuda a visualizar volume de uso e dias com maior incidência de erro.

### Minutes Over Time

Mostra os minutos consumidos por dia. É útil para identificar picos de uso, workflows mais pesados e períodos em que a execução local consumiu mais tempo.

### Success & Errors

Resumo lateral dos gráficos. Exibe o total de execuções bem-sucedidas e com erro, ou o volume agregado relacionado ao gráfico selecionado.

## Job Duration Distribution

Agrupa jobs por faixas de duração, como `0-1m`, `1-5m`, `5-10m` e assim por diante. Essa distribuição ajuda a entender se a maioria dos jobs é rápida ou se existe concentração em faixas mais longas.

## Top 5 Slowest Jobs

Lista os cinco jobs com maior duração média. Use essa seção para priorizar otimizações, como cache de dependências, paralelização, redução de steps ou ajustes em imagens Docker.

## Observações Sobre os Dados

Os dados vêm do histórico local salvo pela extensão. Se não houver histórico suficiente, alguns gráficos podem aparecer vazios ou com valores baixos. Quanto mais execuções forem registradas, mais útil fica a análise de tendência.