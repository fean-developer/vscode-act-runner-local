# Skill: Integração CodeLens

## Objetivo
Prover botões de ação inline diretamente nos arquivos YAML de workflow do GitHub Actions, permitindo execução com um clique sem sair do editor.

## Comportamento

Para cada arquivo `.github/workflows/*.yml`, o CodeLens exibe:
- **▶ Executar Workflow** — no topo do arquivo (acima de `name:`)
- **⚡ Quick Run** — no topo do arquivo (execução imediata)
- **👁 Dry Run** — no topo do arquivo (pré-visualização)
- **▶ Executar Job** — acima de cada bloco `jobs.<jobId>:`
- **✅ Validar** — no topo do arquivo

## Exemplo Visual no Editor

```yaml
▶ Executar Workflow  ⚡ Quick Run  👁 Dry Run  ✅ Validar    ← CodeLens no topo
name: CI Pipeline
on: [push]

jobs:
  ▶ Executar Job: build                                      ← CodeLens por job
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci

  ▶ Executar Job: test
  test:
    needs: build
```

## Implementação do CodeLensProvider

```typescript
import * as vscode from 'vscode';
import { WorkflowParser } from '../core/workflowParser';
import { ExecutionEngine } from '../core/executionEngine';

export class WorkflowCodeLensProvider implements vscode.CodeLensProvider {
  private parser: WorkflowParser;

  constructor(parser: WorkflowParser) {
    this.parser = parser;
  }

  async provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    // Apenas para arquivos de workflow
    if (!this.isWorkflowFile(document.uri.fsPath)) return [];

    const lenses: vscode.CodeLens[] = [];

    try {
      const workflow = await this.parser.parse(document.uri.fsPath);
      const topRange = new vscode.Range(0, 0, 0, 0);

      // Lenses no topo do arquivo
      lenses.push(
        new vscode.CodeLens(topRange, {
          title: '▶ Executar Workflow',
          command: 'actRunner.runWorkflow',
          arguments: [document.uri.fsPath],
        }),
        new vscode.CodeLens(topRange, {
          title: '⚡ Quick Run',
          command: 'actRunner.quickRun',
          arguments: [document.uri.fsPath],
        }),
        new vscode.CodeLens(topRange, {
          title: '👁 Dry Run',
          command: 'actRunner.dryRun',
          arguments: [document.uri.fsPath],
        }),
        new vscode.CodeLens(topRange, {
          title: '✅ Validar',
          command: 'actRunner.validateWorkflow',
          arguments: [document.uri.fsPath],
        })
      );

      // Lens por job — encontrar posição de cada job no YAML
      const text = document.getText();
      const lines = text.split('\n');

      Object.keys(workflow.jobs).forEach((jobId) => {
        const lineIndex = lines.findIndex((l) => l.match(new RegExp(`^\\s{2}${jobId}:`)));
        if (lineIndex >= 0) {
          const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
          lenses.push(
            new vscode.CodeLens(range, {
              title: `▶ Executar Job: ${jobId}`,
              command: 'actRunner.runJob',
              arguments: [document.uri.fsPath, jobId],
            })
          );
        }
      });
    } catch {
      // YAML inválido — não exibir lenses de job, apenas validar
      const topRange = new vscode.Range(0, 0, 0, 0);
      lenses.push(
        new vscode.CodeLens(topRange, {
          title: '✅ Validar (YAML com erros)',
          command: 'actRunner.validateWorkflow',
          arguments: [document.uri.fsPath],
        })
      );
    }

    return lenses;
  }

  private isWorkflowFile(filePath: string): boolean {
    return /\.github[/\\]workflows[/\\].+\.ya?ml$/.test(filePath);
  }
}
```

## Registro do Provider

```typescript
// Em extension.ts
export function activate(context: vscode.ExtensionContext) {
  const codeLensProvider = new WorkflowCodeLensProvider(parser);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'yaml', pattern: '**/.github/workflows/*.{yml,yaml}' },
      codeLensProvider
    )
  );
}
```

## Configuração (package.json)

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "actRunner.enableCodeLens": {
          "type": "boolean",
          "default": true,
          "description": "Exibir botões CodeLens nos arquivos de workflow"
        }
      }
    }
  }
}
```

## Output
- Botões de ação visíveis diretamente nos arquivos YAML
- Execução com um clique sem abrir menu ou paleta de comandos
