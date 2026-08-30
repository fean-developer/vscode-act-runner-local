import { execSync } from 'child_process';
import * as vscode from 'vscode';
import { t } from '../i18n/messages';

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
      t('🐳 Docker Desktop alternatives'),
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    panel.webview.html = this.getHtml();
  }

  async warnIfMissing(): Promise<void> {
    if (this.detectRuntime()) return;
    const choice = await vscode.window.showWarningMessage(
      t('⚠️ No container runtime detected. act requires Docker or an alternative.'),
      t('View alternatives guide')
    );
    if (choice) this.showGuide();
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Docker Desktop Alternatives</title>
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
    <h1>🐳 Free Docker Desktop Alternatives</h1>
    <p>Docker Desktop requires a paid license (<strong>Docker Business</strong>) for commercial use by companies with
      more than 250 employees or revenue above $10M. The alternatives below are free and compatible with <code>act</code>.</p>

  <h2>🏆 Rancher Desktop <em>(Recommended)</em></h2>
  <p><a href="https://rancherdesktop.io">rancherdesktop.io</a> — Windows, macOS, Linux — Apache 2.0</p>
    <p>Graphical interface similar to Docker Desktop. Supports <code>containerd</code> and <code>dockerd</code>.
      Integrates <code>kubectl</code> natively. Compatible with <code>act</code> without additional configuration.</p>

  <h2>🦭 Podman Desktop</h2>
  <p><a href="https://podman-desktop.io">podman-desktop.io</a> — Windows, macOS, Linux — Apache 2.0</p>
  <p>Rootless by default (more secure), compatible with the Docker API, and supported by Red Hat.</p>
  <p>Configure with act: <code>export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock</code></p>

  <h2>🍺 Colima (macOS / Linux)</h2>
  <p><a href="https://github.com/abiosoft/colima">github.com/abiosoft/colima</a> — MIT</p>
  <p>Lightweight and easy to use. Install: <code>brew install colima docker &amp;&amp; colima start</code></p>

  <h2>🚀 OrbStack (macOS)</h2>
  <p><a href="https://orbstack.dev">orbstack.dev</a> — Much faster than Docker Desktop on Mac.</p>
  <p>Free for personal use; check the terms for commercial use.</p>

  <h2>Comparison</h2>
  <table>
    <tr><th>Alternative</th><th>Windows</th><th>macOS</th><th>Linux</th><th>Graphical UI</th><th>Rootless</th><th>Free</th></tr>
    <tr><td>Rancher Desktop</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
    <tr><td>Podman Desktop</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
    <tr><td>Colima</td><td>❌</td><td>✅</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td></tr>
    <tr><td>OrbStack</td><td>❌</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td><td>✅*</td></tr>
  </table>
  <p><small>* OrbStack: free for personal use.</small></p>

  <h2>.actrc Configuration</h2>
  <p>After installing one of the alternatives, add this to <code>.actrc</code>:</p>
  <pre><code>-P ubuntu-latest=catthehacker/ubuntu:act-latest</code></pre>
</body>
</html>`;
  }
}

export const dockerGuide = new DockerGuide();
