import * as vscode from 'vscode';
import { actRunner } from './core/actRunner';
import { executionEngine } from './core/executionEngine';
import { historyService } from './core/historyService';
import { envManager } from './core/envManager';
import { webhookSimulator } from './core/webhookSimulator';
import { templateEngine } from './core/templateEngine';
import { dockerGuide } from './core/dockerGuide';
import { workflowParser } from './core/workflowParser';
import { workflowValidator } from './core/workflowValidator';
import { eventBus } from './core/eventBus';
import { workflowExplorer } from './providers/workflowExplorer';
import { workflowCodeLensProvider } from './providers/codeLensProvider';
import { StatusBarController } from './providers/statusBarController';
import type { WebviewCommand } from './types/events.types';
import type { ExecutionOptions } from './types/execution.types';

let webviewPanel: vscode.WebviewPanel | undefined;
/** Execução pendente: inicia quando o webview enviar state:request (React montado) */
let pendingExecution: (() => void) | undefined;

export function activate(context: vscode.ExtensionContext): void {
  historyService.initialize(context);

  // Status bar
  const statusBar = new StatusBarController();
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  // Workflow explorer (TreeView na sidebar)
  const treeView = vscode.window.createTreeView('actRunner.workflowExplorer', {
    treeDataProvider: workflowExplorer,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // CodeLens nos arquivos YAML
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'yaml', pattern: '**/.github/workflows/*.{yml,yaml}' },
      workflowCodeLensProvider
    )
  );

  // Watcher para atualizar o explorer ao mudar workflows
  const watcher = vscode.workspace.createFileSystemWatcher('**/.github/workflows/*.{yml,yaml}');
  watcher.onDidCreate(() => workflowExplorer.refresh());
  watcher.onDidDelete(() => workflowExplorer.refresh());
  watcher.onDidChange(() => workflowExplorer.refresh());
  context.subscriptions.push(watcher);

  // --- Registro de Comandos ---
  context.subscriptions.push(
    vscode.commands.registerCommand('actRunner.showMenu', () => showMainMenu()),

    vscode.commands.registerCommand('actRunner.runWorkflow', async (arg?: unknown) => {
      const wfPath = extractPath(arg) ?? (await pickWorkflow());
      if (!wfPath) return;
      const opts: ExecutionOptions = { workflowPath: wfPath, trigger: 'manual', workspaceRoot: workspaceRoot() };
      openWebviewPanel(context, 'graph', () => safeRun(() => executionEngine.run(opts)));
    }),

    vscode.commands.registerCommand('actRunner.quickRun', async () => {
      const root = workspaceRoot();
      if (!root) { vscode.window.showErrorMessage('Selecione um projeto primeiro (botão 📂 na sidebar).'); return; }
      const paths = workflowParser.discoverWorkflows(root);
      const wfPath = paths[0];
      if (!wfPath) { vscode.window.showErrorMessage('Nenhum workflow encontrado em .github/workflows/'); return; }
      const opts: ExecutionOptions = { workflowPath: wfPath, trigger: 'quick-run', workspaceRoot: root };
      openWebviewPanel(context, 'graph', () => safeRun(() => executionEngine.run(opts)));
    }),

    vscode.commands.registerCommand('actRunner.runJob', async (arg?: unknown, jobId?: string) => {
      const wfPath = extractPath(arg) ?? (await pickWorkflow());
      if (!wfPath) return;
      const job = (arg && typeof (arg as any).jobId === 'string' ? (arg as any).jobId : undefined)
        ?? jobId
        ?? (await pickJob(wfPath));
      if (!job) return;
      const opts: ExecutionOptions = { workflowPath: wfPath, jobId: job, trigger: 'manual', workspaceRoot: workspaceRoot() };
      openWebviewPanel(context, 'graph', () => safeRun(() => executionEngine.run(opts)));
    }),

    vscode.commands.registerCommand('actRunner.dryRun', async (arg?: unknown) => {
      const wfPath = extractPath(arg) ?? (await pickWorkflow());
      if (!wfPath) return;
      const opts: ExecutionOptions = { workflowPath: wfPath, dryRun: true, trigger: 'manual', workspaceRoot: workspaceRoot() };
      openWebviewPanel(context, 'graph', () => safeRun(() => executionEngine.run(opts)));
    }),

    vscode.commands.registerCommand('actRunner.listJobs', async () => {
      const wfPath = await pickWorkflow();
      if (!wfPath) return;
      try {
        const wf = workflowParser.parse(wfPath);
        const items = Object.values(wf.jobs).map((j) => ({
          label: j.name ?? j.id,
          description: `${j.steps.length} steps`,
          detail: j.needs?.length ? `needs: ${j.needs.join(', ')}` : undefined,
        }));
        await vscode.window.showQuickPick(items, { placeHolder: 'Jobs disponíveis (somente leitura)' });
      } catch (e) {
        vscode.window.showErrorMessage(`Erro ao listar jobs: ${e instanceof Error ? e.message : e}`);
      }
    }),

    vscode.commands.registerCommand('actRunner.stopExecution', () => {
      executionEngine.stop();
    }),

    vscode.commands.registerCommand('actRunner.forceReset', () => {
      executionEngine.forceReset();
      vscode.window.showInformationMessage('✅ Estado da execução resetado.');
    }),

    vscode.commands.registerCommand('actRunner.validateWorkflow', async (arg?: unknown) => {
      const wfPath = extractPath(arg) ?? (await pickWorkflow());
      if (!wfPath) return;
      try {
        const wf = workflowParser.parse(wfPath);
        const result = workflowValidator.validate(wf);
        if (result.valid) {
          vscode.window.showInformationMessage('✅ Workflow válido!');
        } else {
          vscode.window.showErrorMessage(`❌ Erros de validação:\n${result.errors.join('\n')}`);
        }
      } catch (e) {
        vscode.window.showErrorMessage(`Erro ao parsear YAML: ${e instanceof Error ? e.message : e}`);
      }
    }),

    vscode.commands.registerCommand('actRunner.manageEnv', () => openWebviewPanel(context, 'env')),
    vscode.commands.registerCommand('actRunner.simulateWebhook', () => openWebviewPanel(context, 'webhook')),
    vscode.commands.registerCommand('actRunner.viewHistory', () => openWebviewPanel(context, 'history')),
    vscode.commands.registerCommand('actRunner.createWorkflow', () => openWebviewPanel(context, 'templates')),

    vscode.commands.registerCommand('actRunner.createScript', async () => {
      const templates = templateEngine.listScriptTemplates();
      const pick = await vscode.window.showQuickPick(
        templates.map((t) => ({ label: t.name, description: t.description, id: t.id })),
        { placeHolder: 'Selecione o tipo de script a gerar' }
      );
      if (!pick) return;
      const template = templates.find((t) => t.id === pick.id)!;
      try {
        const dest = await templateEngine.generateScript(template, workspaceRoot());
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(dest));
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`✅ Script gerado: ${dest}`);
      } catch (e) {
        vscode.window.showErrorMessage(`Erro ao gerar script: ${e instanceof Error ? e.message : e}`);
      }
    }),

    vscode.commands.registerCommand('actRunner.dockerGuide', () => dockerGuide.showGuide()),

    vscode.commands.registerCommand('actRunner.securityGuide', () => {
      vscode.env.openExternal(
        vscode.Uri.parse('https://docs.github.com/en/actions/security-guides/encrypted-secrets')
      );
    }),

    vscode.commands.registerCommand('actRunner.configure', async () => {
      const root = workspaceRoot();
      const choice = await vscode.window.showQuickPick(
        [
          { label: '⚙️ Editar .actrc', path: envManager.getActrcFilePath(root) },
          { label: '🔐 Editar .secrets', path: envManager.getSecretsFilePath(root) },
          { label: '📄 Editar .env', path: envManager.getEnvFilePath(root) },
        ],
        { placeHolder: 'Qual arquivo configurar?' }
      );
      if (!choice) return;
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(choice.path));
      await vscode.window.showTextDocument(doc);
    }),

    vscode.commands.registerCommand('actRunner.refreshExplorer', () => workflowExplorer.refresh()),

    vscode.commands.registerCommand('actRunner.selectProject', async () => {
      // Começar no workspace atual ou no home
      const startDir =
        vscode.workspace.workspaceFolders?.[0]?.uri ??
        vscode.Uri.file(require('os').homedir());

      const uris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Selecionar pasta raiz do projeto',
        title: 'Selecione a pasta que contém .github/workflows/',
        defaultUri: startDir,
      });
      if (!uris || uris.length === 0) return;
      const root = uris[0].fsPath;
      workflowExplorer.setProjectRoot(root);
      envManager.ensureSecretsIgnored(root);

      // Verificar se tem workflows no caminho selecionado
      const found = workflowParser.discoverWorkflows(root);
      if (found.length === 0) {
        vscode.window.showWarningMessage(
          `⚠️ Nenhum workflow encontrado em ${root}/.github/workflows/`,
          'Selecionar outra pasta'
        ).then((c) => { if (c) vscode.commands.executeCommand('actRunner.selectProject'); });
      } else {
        vscode.window.showInformationMessage(`✅ Projeto selecionado: ${root} (${found.length} workflow(s))`);
      }
    }),

    vscode.commands.registerCommand('actRunner.locateAct', async () => {
      // Tentar auto-detect antes de pedir ao usuário
      const autoFound = await actRunner.autoDetect();
      if (autoFound) {
        vscode.window.showInformationMessage(`✅ act detectado automaticamente: ${autoFound}`);
        return;
      }

      // Pedir o path manualmente
      const uris = await vscode.window.showOpenDialog({
        canSelectFolders: false,
        canSelectFiles: true,
        canSelectMany: false,
        openLabel: 'Selecionar o executável do act',
        title: 'Localizar o binário do act (ex: /home/user/.act/act)',
        filters: { 'Executável': ['*'] },
      });
      if (!uris || uris.length === 0) return;
      const actPath = uris[0].fsPath;
      const cfg = vscode.workspace.getConfiguration('actRunner');
      await cfg.update('actPath', actPath, vscode.ConfigurationTarget.Global);
      const ok = await actRunner.isActInstalled(actPath);
      if (ok) {
        vscode.window.showInformationMessage(`✅ act configurado: ${actPath}`);
      } else {
        vscode.window.showErrorMessage(`❌ Não foi possível executar: ${actPath}`);
      }
    }),
  );

  dockerGuide.warnIfMissing();

  // Auto-detectar act na ativação (não bloqueia)
  actRunner.autoDetect().then((found) => {
    if (found) {
      // Encontrado — mostrar apenas se era necessário detectar automaticamente
      const configured = vscode.workspace.getConfiguration('actRunner').get<string>('actPath', 'act');
      if (configured !== found) {
        vscode.window.showInformationMessage(`✅ act detectado automaticamente: ${found}`);
      }
    } else {
      vscode.window
        .showWarningMessage(
          '⚠️ "act" não foi encontrado automaticamente. Informe onde está o executável.',
          'Localizar act',
          'Ver instalação'
        )
        .then((choice) => {
          if (choice === 'Localizar act') vscode.commands.executeCommand('actRunner.locateAct');
          if (choice === 'Ver instalação') vscode.env.openExternal(vscode.Uri.parse('https://github.com/nektos/act#installation'));
        });
    }
  });

  const root = workspaceRoot();
  if (root) envManager.ensureSecretsIgnored(root);
}

export function deactivate(): void {
  webviewPanel?.dispose();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function workspaceRoot(): string {
  // Prefere o projeto selecionado manualmente no explorer
  return (
    workflowExplorer.getProjectRoot() ??
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ??
    ''
  );
}

async function showMainMenu(): Promise<void> {
  const isRunning = executionEngine.isRunning();
  const items = [
    { label: '▶ Executar Workflow',                command: 'actRunner.runWorkflow' },
    { label: '⚡ Quick Run',                        command: 'actRunner.quickRun' },
    { label: '📋 Executar Job',                    command: 'actRunner.runJob' },
    { label: '👁 Dry Run',                         command: 'actRunner.dryRun' },
    { label: '📋 Listar Jobs',                     command: 'actRunner.listJobs' },
    ...(isRunning ? [
      { label: '⏹ Parar Execução',          command: 'actRunner.stopExecution' },
      { label: '🔄 Resetar estado (forçar)', command: 'actRunner.forceReset' },
    ] : []),
    { label: '✅ Validar Workflow',                command: 'actRunner.validateWorkflow' },
    { label: '🔐 Gerenciar Variáveis de Ambiente', command: 'actRunner.manageEnv' },
    { label: '📡 Simular Webhook',                 command: 'actRunner.simulateWebhook' },
    { label: '📜 Ver Histórico',                   command: 'actRunner.viewHistory' },
    { label: '📝 Criar Workflow (Templates)',       command: 'actRunner.createWorkflow' },
    { label: '💻 Gerar Script',                    command: 'actRunner.createScript' },
    { label: '🐳 Alternativas ao Docker Desktop',  command: 'actRunner.dockerGuide' },
    { label: '🔒 Boas Práticas de Segurança',      command: 'actRunner.securityGuide' },
    { label: '⚙️ Configurar (.actrc / .secrets)',  command: 'actRunner.configure' },
  ];
  const pick = await vscode.window.showQuickPick(items, { placeHolder: '⚡ Act Visual Runner' });
  if (pick) vscode.commands.executeCommand(pick.command);
}

/**
 * Extrai o caminho do arquivo de um argumento que pode ser:
 * - string (path direto)
 * - WorkflowTreeItem (passado quando clicado via botão inline na tree view)
 * - undefined (nenhum argumento passado)
 */
function extractPath(arg: unknown): string | undefined {
  if (typeof arg === 'string' && arg.length > 0) return arg;
  if (arg && typeof (arg as { workflowPath?: string }).workflowPath === 'string') {
    return (arg as { workflowPath: string }).workflowPath;
  }
  return undefined;
}

async function pickWorkflow(): Promise<string | undefined> {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Selecione um projeto primeiro (botão 📂 na sidebar do Act Runner).');
    return;
  }
  const paths = workflowParser.discoverWorkflows(root);
  if (paths.length === 0) {
    vscode.window.showErrorMessage('Nenhum workflow encontrado em .github/workflows/');
    return;
  }
  if (paths.length === 1) return paths[0];
  const items = paths.map((p) => ({ label: require('path').basename(p), description: p, _path: p }));
  const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Selecione o workflow' });
  return pick?._path;
}

async function pickJob(wfPath: string): Promise<string | undefined> {
  try {
    const wf = workflowParser.parse(wfPath);
    const jobs = Object.keys(wf.jobs);
    if (jobs.length === 1) return jobs[0];
    return vscode.window.showQuickPick(jobs, { placeHolder: 'Selecione o job' });
  } catch {
    return undefined;
  }
}

async function safeRun(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    vscode.window.showErrorMessage(`Erro: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function openWebviewPanel(context: vscode.ExtensionContext, initialView: string, onReady?: () => void): void {
  if (webviewPanel) {
    // Painel já existe: revelar e iniciar execução diretamente (webview já está montado)
    webviewPanel.reveal();
    webviewPanel.webview.postMessage({ type: 'navigate', payload: { view: initialView } });
    if (onReady) onReady();
    return;
  }
  // Armazena o callback para ser chamado quando o React enviar state:request
  pendingExecution = onReady;

  webviewPanel = vscode.window.createWebviewPanel(
    'actVisualRunner',
    'Act Visual Runner',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
      retainContextWhenHidden: true,
    }
  );

  eventBus.registerPanel(webviewPanel);

  webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewCommand) => {
    switch (msg.type) {
      case 'command:run': {
        const opts = msg.payload as Partial<ExecutionOptions>;
        const workflowPath = opts.workflowPath ?? (await pickWorkflow());
        if (!workflowPath) break;
        await safeRun(() => executionEngine.run({ ...opts, workflowPath, workspaceRoot: workspaceRoot() }));
        break;
      }
      case 'command:quickRun': {
        const root = workspaceRoot();
        const paths = workflowParser.discoverWorkflows(root);
        const workflowPath = (msg.payload as Partial<ExecutionOptions>).workflowPath ?? paths[0];
        if (!workflowPath) { vscode.window.showErrorMessage('Nenhum workflow encontrado.'); break; }
        await safeRun(() => executionEngine.run({ workflowPath, trigger: 'quick-run', workspaceRoot: root }));
        break;
      }
      case 'command:stop':
        executionEngine.stop();
        break;
      case 'command:rerun': {
        const record = historyService.getById(msg.payload.executionId);
        if (record) {
          await safeRun(() =>
            executionEngine.run({
              workflowPath: record.workflowPath,
              jobId: record.jobId,
              dryRun: record.dryRun,
              trigger: 'replay',
            })
          );
        }
        break;
      }
      case 'state:request':
        webviewPanel?.webview.postMessage({
          type: 'state:snapshot',
          payload: { history: historyService.getAll() },
        });
        // Webview está pronto (React montou): disparar execução pendente, se houver
        if (pendingExecution) {
          const exec = pendingExecution;
          pendingExecution = undefined;
          exec();
        }
        break;
    }
  });

  webviewPanel.onDidDispose(() => {
    webviewPanel = undefined;
  });

  const scriptUri = webviewPanel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview', 'webview.js')
  );

  const csp = webviewPanel.webview.cspSource;
  const nonce = Array.from({ length: 32 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
      Math.floor(Math.random() * 62)
    )
  ).join('');

  webviewPanel.webview.html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}' ${csp}; style-src ${csp} 'unsafe-inline'; font-src ${csp}; img-src ${csp} data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Act Visual Runner</title>
</head>
<body style="padding:0;margin:0;overflow:hidden;background:#111827;color:#F9FAFB;">
  <div id="root"></div>
  <script nonce="${nonce}">
    window.__INITIAL_VIEW__ = '${initialView}';
    const vscode = acquireVsCodeApi();
    window.__vscode__ = vscode;
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
