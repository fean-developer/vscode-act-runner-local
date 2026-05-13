# Skill: Guia de Alternativas ao Docker Desktop

## Objetivo
Apresentar alternativas gratuitas ao Docker Desktop para desenvolvedores em ambientes corporativos onde o Docker Desktop exige licença paga (empresas com mais de 250 funcionários ou receita > $10M).

## Contexto

O Docker Desktop passou a exigir licença paga (Docker Business) para uso comercial em empresas. O `nektos/act` requer um runtime de containers — mas não necessariamente o Docker Desktop.

## Alternativas Gratuitas

### 1. Rancher Desktop (Recomendado)
- **Plataforma:** Windows, macOS, Linux
- **Licença:** Open Source (Apache 2.0)
- **URL:** https://rancherdesktop.io
- **Vantagens:**
  - Interface gráfica similar ao Docker Desktop
  - Suporta tanto `containerd` quanto `dockerd`
  - Integra com `kubectl` nativamente
  - Compatível com `act` sem configuração adicional
- **Configuração com act:**
  ```bash
  # Garantir que docker CLI está no PATH após instalar Rancher Desktop
  act --container-daemon-socket /var/run/docker.sock
  ```

### 2. Podman Desktop
- **Plataforma:** Windows, macOS, Linux
- **Licença:** Open Source (Apache 2.0)
- **URL:** https://podman-desktop.io
- **Vantagens:**
  - Rootless por padrão (mais seguro)
  - Compatível com API Docker
  - Suportado pela Red Hat
- **Configuração com act:**
  ```bash
  # Habilitar socket compatível com Docker
  podman system service --time=0 &
  export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
  act
  ```

### 3. Colima (macOS / Linux)
- **Plataforma:** macOS, Linux
- **Licença:** Open Source (MIT)
- **URL:** https://github.com/abiosoft/colima
- **Vantagens:**
  - Leve e de baixo consumo de recursos
  - Instalação simples via Homebrew
  - Funciona perfeitamente com act
- **Configuração:**
  ```bash
  brew install colima docker
  colima start
  act  # funciona automaticamente
  ```

### 4. OrbStack (macOS)
- **Plataforma:** macOS
- **Licença:** Gratuito para uso pessoal
- **URL:** https://orbstack.dev
- **Vantagens:**
  - Muito mais rápido que Docker Desktop no Mac
  - Compatível com Docker CLI
  - Suporte nativo a containers Linux
- **Nota:** Verificar termos de uso para uso comercial

### 5. Lima (macOS / Linux)
- **Plataforma:** macOS, Linux
- **Licença:** Open Source (Apache 2.0)
- **URL:** https://github.com/lima-vm/lima
- **Vantagens:**
  - Base do Colima e Rancher Desktop
  - Altamente configurável
- **Configuração:**
  ```bash
  brew install lima docker
  limactl start template://docker
  docker context use lima-docker
  act
  ```

### 6. Minikube (apenas containers, sem UI)
- **Plataforma:** Windows, macOS, Linux
- **Licença:** Open Source (Apache 2.0)
- **Uso com act:**
  ```bash
  minikube start --driver=docker
  eval $(minikube docker-env)
  act
  ```

## Comparativo

| Alternativa | Windows | macOS | Linux | UI Gráfica | Rootless | Gratuito |
|---|---|---|---|---|---|---|
| Rancher Desktop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Podman Desktop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Colima | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| OrbStack | ❌ | ✅ | ❌ | ✅ | ✅ | ✅* |
| Lima | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |

*OrbStack: gratuito para uso pessoal, verificar para uso comercial

## Verificação de Runtime no act

```typescript
async function detectContainerRuntime(): Promise<string | null> {
  const runtimes = ['docker', 'podman', 'nerdctl'];
  for (const runtime of runtimes) {
    try {
      execSync(`${runtime} info`, { stdio: 'ignore' });
      return runtime;
    } catch {
      continue;
    }
  }
  return null;
}
```

## Configuração no .actrc para Alternativas

```bash
# Para Podman
--container-daemon-socket /run/user/1000/podman/podman.sock

# Para Colima/Lima
--container-daemon-socket /var/run/docker.sock

# Usar imagem menor para desenvolvimento local
-P ubuntu-latest=catthehacker/ubuntu:act-latest
```

## Implementação do DockerGuide

```typescript
class DockerGuide {
  showGuide(context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
      'actRunnerDockerGuide',
      '🐳 Alternativas ao Docker Desktop',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    panel.webview.html = this.getGuideHtml();
  }

  async detectAndSuggest(): Promise<void> {
    const runtime = await detectContainerRuntime();
    if (!runtime) {
      vscode.window.showWarningMessage(
        'Nenhum runtime de containers detectado. O act requer Docker ou alternativa.',
        'Ver Guia'
      ).then((choice) => {
        if (choice === 'Ver Guia') this.showGuide(context);
      });
    }
  }
}
```

## Output
- Desenvolvedor configurado com alternativa gratuita ao Docker Desktop
- Runtime de containers funcional para uso com `act`
