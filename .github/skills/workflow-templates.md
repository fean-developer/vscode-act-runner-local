# Skill: Templates de Workflow

## Objetivo
Prover templates pré-construídos de workflows GitHub Actions para início rápido, permitindo que o desenvolvedor escolha um template e aplique diretamente no workspace.

## Templates Disponíveis

### 1. CI Node.js
```yaml
name: CI Node.js
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - name: Instalar dependências
        run: npm ci
      - name: Build
        run: npm run build
      - name: Testes
        run: npm test
```

### 2. CI Python
```yaml
name: CI Python
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - name: Instalar dependências
        run: pip install -r requirements.txt
      - name: Testes
        run: pytest
```

### 3. Deploy Docker
```yaml
name: Build e Deploy Docker
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login no Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build e Push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
```

### 4. Release Automático
```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Criar Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

### 5. Lint e Formatação
```yaml
name: Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: ESLint
        run: npm run lint
      - name: Prettier
        run: npm run format:check
```

### 6. Deploy Azure
```yaml
name: Deploy Azure
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Deploy Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: minha-app
          package: .
```

## Implementação do TemplateEngine

```typescript
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ci' | 'cd' | 'release' | 'lint' | 'security';
  tags: string[];
  content: string;          // YAML do template
  previewImage?: string;    // Screenshot ou ícone
}

class TemplateEngine {
  // Listar todos os templates disponíveis
  listTemplates(): WorkflowTemplate[] {
    return BUILT_IN_TEMPLATES;
  }

  // Aplicar template no workspace
  async applyTemplate(template: WorkflowTemplate, workspaceRoot: string): Promise<string> {
    const workflowsDir = path.join(workspaceRoot, '.github', 'workflows');
    await fs.mkdir(workflowsDir, { recursive: true });

    const fileName = `${template.id}.yml`;
    const filePath = path.join(workflowsDir, fileName);

    // Não sobrescrever sem confirmar
    if (fs.existsSync(filePath)) {
      throw new Error(`Arquivo já existe: ${fileName}. Renomeie ou remova antes de aplicar o template.`);
    }

    await fs.writeFile(filePath, template.content, 'utf-8');
    return filePath;
  }

  // Filtrar templates por categoria ou tag
  filterTemplates(filter: { category?: string; tag?: string }): WorkflowTemplate[] {
    return this.listTemplates().filter((t) => {
      if (filter.category && t.category !== filter.category) return false;
      if (filter.tag && !t.tags.includes(filter.tag)) return false;
      return true;
    });
  }
}
```

## UI do Seletor de Templates (TemplateSelector.tsx)

- Grade de cards com ícone, nome e descrição de cada template
- Filtros por categoria: CI, CD, Release, Lint, Security
- Preview do YAML ao clicar em um card
- Botão "Aplicar no Workspace" com confirmação
- Indicador de templates já aplicados no projeto

## Output
- Arquivo `.github/workflows/*.yml` criado no workspace
- Workflow pronto para execução imediata com o act
