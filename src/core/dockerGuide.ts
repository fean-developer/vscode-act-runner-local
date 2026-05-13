import { execSync } from 'child_process';
import * as vscode from 'vscode';

export class DockerGuide {
  detectRuntime(): string | null {
    for (const runtime of ['docker', 'podman', 'nerdctl']) {
      try {
        execSync(`${runtime} info`, { stdio: 'ignore' });
        return runtime;
      } catch {
        continue;
      }
    }
    return null;
  }

  showGuide(): void {
    const panel = vscode.window.createWebviewPanel(
      'actRunnerDockerGuide',
      '🐳 Alternativas ao Docker Desktop',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    panel.webview.html = this.getHtml();
  }

  async warnIfMissing(): Promise<void> {
    if (this.detectRuntime()) return;
    const choice = await vscode.window.showWarningMessage(
      '⚠️ Nenhum runtime de containers detectado. O act requer Docker ou uma alternativa.',
      'Ver Guia de Alternativas'
    );
    if (choice) this.showGuide();
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alternativas ao Docker Desktop</title>
  <style>
    body { font-family: var(--vscode-font-family, sans-serif); padding: 24px; max-width: 860px; margin: 0 auto; color: var(--vscode-foreground); }
    h1 { color: var(--vscode-textLink-foreground); }
    h2 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 6px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 8px 14px; border: 1px solid var(--vscode-panel-border); text-align: left; }
    th { background: var(--vscode-editor-lineHighlightBackground); }
    code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px; }
    a { color: var(--vscode-textLink-foreground); }
  </style>
</head>
<body>
  <h1>🐳 Alternativas Gratuitas ao Docker Desktop</h1>
  <p>O Docker Desktop exige licença paga (<strong>Docker Business</strong>) para uso comercial em empresas com
     mais de 250 funcionários ou receita acima de $10M. Abaixo estão alternativas gratuitas compatíveis com <code>act</code>.</p>

  <h2>🏆 Rancher Desktop <em>(Recomendado)</em></h2>
  <p><a href="https://rancherdesktop.io">rancherdesktop.io</a> — Windows, macOS, Linux — Apache 2.0</p>
  <p>Interface gráfica similar ao Docker Desktop. Suporta <code>containerd</code> e <code>dockerd</code>.
     Integra <code>kubectl</code> nativamente. Compatível com <code>act</code> sem configuração adicional.</p>

  <h2>🦭 Podman Desktop</h2>
  <p><a href="https://podman-desktop.io">podman-desktop.io</a> — Windows, macOS, Linux — Apache 2.0</p>
  <p>Rootless por padrão (mais seguro), compatível com API Docker, suportado pela Red Hat.</p>
  <p>Configuração com act: <code>export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock</code></p>

  <h2>🍺 Colima (macOS / Linux)</h2>
  <p><a href="https://github.com/abiosoft/colima">github.com/abiosoft/colima</a> — MIT</p>
  <p>Leve e fácil. Instalar: <code>brew install colima docker &amp;&amp; colima start</code></p>

  <h2>🚀 OrbStack (macOS)</h2>
  <p><a href="https://orbstack.dev">orbstack.dev</a> — Muito mais rápido que Docker Desktop no Mac.</p>
  <p>Gratuito para uso pessoal — verificar termos para uso comercial.</p>

  <h2>Comparativo</h2>
  <table>
    <tr><th>Alternativa</th><th>Windows</th><th>macOS</th><th>Linux</th><th>UI Gráfica</th><th>Rootless</th><th>Gratuito</th></tr>
    <tr><td>Rancher Desktop</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
    <tr><td>Podman Desktop</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
    <tr><td>Colima</td><td>❌</td><td>✅</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td></tr>
    <tr><td>OrbStack</td><td>❌</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td><td>✅*</td></tr>
  </table>
  <p><small>* OrbStack: gratuito para uso pessoal.</small></p>

  <h2>Configuração no .actrc</h2>
  <p>Após instalar uma das alternativas, adicione ao <code>.actrc</code>:</p>
  <pre><code>-P ubuntu-latest=catthehacker/ubuntu:act-latest</code></pre>
</body>
</html>`;
  }
}

export const dockerGuide = new DockerGuide();
