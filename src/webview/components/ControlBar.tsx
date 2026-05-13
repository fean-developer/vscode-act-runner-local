import React from 'react';
import { useExecutionStore } from '../store/executionStore';

/**
 * Barra de controle superior com botões de execução e navegação.
 * Implementação completa: @frontend
 */
export function ControlBar() {
  const { currentView, setView, execution } = useExecutionStore();

  const send = (type: string, payload: Record<string, unknown> = {}) =>
    window.__vscode__?.postMessage({ type, payload });

  // Inclui workflowPath nas execuções iniciadas pelo webview
  const runPayload = execution.workflowPath ? { workflowPath: execution.workflowPath } : {};

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <button style={styles.btn} onClick={() => send('command:run', runPayload)}>▶ Executar</button>
        <button style={styles.btn} onClick={() => send('command:quickRun', runPayload)}>⚡ Quick Run</button>
        <button style={{ ...styles.btn, background: '#374151' }} onClick={() => send('command:run', { ...runPayload, dryRun: true })}>👁 Dry Run</button>
        {execution.status === 'running' && (
          <button style={{ ...styles.btn, background: '#EF4444' }} onClick={() => send('command:stop', {})}>⏹ Parar</button>
        )}
      </div>
      <div style={styles.right}>
        {(['graph', 'history', 'env', 'webhook', 'templates'] as const).map((view) => (
          <button
            key={view}
            style={{ ...styles.tab, ...(currentView === view ? styles.tabActive : {}) }}
            onClick={() => setView(view)}
          >
            {VIEW_LABELS[view]}
          </button>
        ))}
      </div>
    </div>
  );
}

const VIEW_LABELS: Record<string, string> = {
  graph: '🗺 Grafo', history: '📜 Histórico', env: '🔐 Variáveis', webhook: '📡 Webhook', templates: '📝 Templates',
};

const styles: Record<string, React.CSSProperties> = {
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#1F2937', borderBottom: '1px solid #374151', gap: 8, flexWrap: 'wrap' },
  left: { display: 'flex', gap: 6 },
  right: { display: 'flex', gap: 4 },
  btn: { padding: '4px 10px', border: 'none', borderRadius: 4, background: '#3B82F6', color: '#fff', cursor: 'pointer', fontSize: 12 },
  tab: { padding: '3px 8px', border: '1px solid #374151', borderRadius: 4, background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontSize: 11 },
  tabActive: { background: '#374151', color: '#F3F4F6', borderColor: '#6B7280' },
};
