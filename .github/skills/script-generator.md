# Skill: Gerador de Scripts

## Objetivo
Gerar scripts de automação de exemplo em múltiplas linguagens (PowerShell, Bash, Python e Bicep) para acelerar o desenvolvimento e demonstrar boas práticas de automação.

## Linguagens Suportadas

| Linguagem | Extensão | Casos de uso |
|---|---|---|
| Bash | `.sh` | Linux/macOS, CI/CD, Docker |
| PowerShell | `.ps1` | Windows, Azure, automação corporativa |
| Python | `.py` | Cross-platform, APIs, processamento de dados |
| Bicep | `.bicep` | Infraestrutura Azure como código |

## Templates de Scripts

### Bash — Deploy Simples
```bash
#!/usr/bin/env bash
set -euo pipefail

# Script de deploy gerado pelo Act Visual Runner
APP_NAME="${APP_NAME:-minha-app}"
ENV="${DEPLOY_ENV:-staging}"

echo "🚀 Iniciando deploy de $APP_NAME para $ENV"

# Build da aplicação
echo "📦 Fazendo build..."
npm ci && npm run build

# Verificação de testes
echo "✅ Rodando testes..."
npm test

# Deploy
echo "🌐 Fazendo deploy..."
# Adicione seu comando de deploy aqui

echo "✅ Deploy de $APP_NAME para $ENV concluído!"
```

### PowerShell — Deploy Azure
```powershell
#Requires -Version 7.0
<#
.SYNOPSIS
  Script de deploy Azure gerado pelo Act Visual Runner
.PARAMETER AppName
  Nome da aplicação
.PARAMETER Environment
  Ambiente de destino (dev/staging/prod)
#>
param(
  [Parameter(Mandatory=$true)]
  [string]$AppName,

  [Parameter(Mandatory=$false)]
  [ValidateSet('dev', 'staging', 'prod')]
  [string]$Environment = 'staging'
)

$ErrorActionPreference = 'Stop'

Write-Host "🚀 Iniciando deploy de $AppName para $Environment" -ForegroundColor Cyan

try {
  # Login Azure (via service principal no CI)
  Write-Host "🔐 Autenticando no Azure..."
  # az login --service-principal -u $env:AZURE_CLIENT_ID ...

  # Deploy
  Write-Host "📦 Fazendo deploy..."
  # az webapp deployment source config-zip ...

  Write-Host "✅ Deploy concluído!" -ForegroundColor Green
} catch {
  Write-Host "❌ Erro no deploy: $_" -ForegroundColor Red
  exit 1
}
```

### Python — Automação de API
```python
#!/usr/bin/env python3
"""
Script de automação de API gerado pelo Act Visual Runner.
"""

import os
import sys
import json
import logging
from typing import Optional
import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)


def get_env(key: str, required: bool = True) -> Optional[str]:
    """Obter variável de ambiente com validação."""
    value = os.environ.get(key)
    if required and not value:
        raise ValueError(f"Variável de ambiente obrigatória não definida: {key}")
    return value


def main() -> int:
    """Ponto de entrada do script."""
    try:
        api_url = get_env("API_URL")
        api_token = get_env("API_TOKEN")

        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

        logger.info("🚀 Iniciando automação...")

        response = requests.get(f"{api_url}/health", headers=headers, timeout=30)
        response.raise_for_status()

        logger.info("✅ API respondendo: %s", response.json())
        return 0

    except Exception as exc:  # pylint: disable=broad-except
        logger.error("❌ Erro: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
```

### Bicep — App Service Azure
```bicep
// Infraestrutura Azure gerada pelo Act Visual Runner
// Recurso: Azure App Service + App Service Plan

@description('Nome da aplicação')
param appName string

@description('Ambiente de deploy')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Região Azure')
param location string = resourceGroup().location

var planName = '${appName}-plan-${environment}'
var webAppName = '${appName}-${environment}'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  sku: {
    name: environment == 'prod' ? 'P1v3' : 'B1'
    tier: environment == 'prod' ? 'PremiumV3' : 'Basic'
  }
  properties: {
    reserved: true // Linux
  }
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: environment == 'prod'
    }
    httpsOnly: true
  }
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
```

## Implementação do ScriptGenerator

```typescript
interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  language: 'bash' | 'powershell' | 'python' | 'bicep';
  fileName: string;
  content: string;
}

class ScriptGenerator {
  listTemplates(): ScriptTemplate[] {
    return SCRIPT_TEMPLATES;
  }

  async generate(templateId: string, workspaceRoot: string): Promise<string> {
    const template = this.listTemplates().find((t) => t.id === templateId);
    if (!template) throw new Error(`Template não encontrado: ${templateId}`);

    const scriptsDir = path.join(workspaceRoot, 'scripts');
    await fs.mkdir(scriptsDir, { recursive: true });

    const filePath = path.join(scriptsDir, template.fileName);
    await fs.writeFile(filePath, template.content, 'utf-8');

    // Tornar scripts Bash executáveis no Linux/macOS
    if (template.language === 'bash') {
      await fs.chmod(filePath, 0o755);
    }

    return filePath;
  }
}
```

## UI de Geração de Scripts

- Lista de scripts disponíveis com linguagem e descrição
- Preview com syntax highlighting antes de gerar
- Seleção do diretório de destino (padrão: `scripts/`)
- Botão de gerar arquivo
- Abre o arquivo no editor após criação

## Output
- Arquivo de script criado em `scripts/` no workspace
- Arquivo aberto automaticamente no editor VSCode
