import React, { useState } from 'react';
import { useExecutionStore } from '../store/executionStore';

export function HistoryPanel() {
  const history = useExecutionStore((s) => s.history);
  const historyLogs = useExecutionStore((s) => s.historyLogs);
  const graphSnapshotsByExecutionId = useExecutionStore((s) => s.graphSnapshotsByExecutionId);
  const restoreGraphForExecution = useExecutionStore((s) => s.restoreGraphForExecution);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rerun = (id: string) =>
    window.__vscode__?.postMessage({ type: 'command:rerun', payload: { executionId: id } });

  const deleteEntry = (id: string) =>
    window.__vscode__?.postMessage({ type: 'command:deleteHistory', payload: { executionId: id } });

  const restoreExecution = (id: string) => {
    window.__vscode__?.postMessage({ type: 'command:restoreHistoryRepository', payload: { executionId: id } });
    restoreGraphForExecution(id);
  };

  if (history.length === 0) {
    return <div style={styles.empty}>Nenhuma execução registrada ainda.</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>Histórico de Execuções</div>
      {history.map((r) => {
        const isExpanded = expandedId === r.id;
        const logs = historyLogs[r.id];
        const hasLogs = logs && logs.length > 0;
        const canRestoreGraph = !!graphSnapshotsByExecutionId[r.id];
        // fallback: logSummary do ExecutionRecord (execuções de sessões anteriores)
        const logFallback = !hasLogs && r.logSummary ? r.logSummary : null;
        const canExpand = hasLogs || !!logFallback;

        return (
          <div key={r.id}>
            <div
              style={{ ...styles.row, ...(canRestoreGraph ? styles.clickableRow : {}) }}
              onClick={canRestoreGraph ? () => restoreExecution(r.id) : undefined}
              title={canRestoreGraph ? 'Abrir grafo desta execução' : 'Grafo detalhado disponível para execuções feitas nesta sessão'}
            >
              <span style={{ color: statusColor(r.status), fontSize: 14 }}>{statusIcon(r.status)}</span>
              <span style={styles.name}>{r.workflowName}</span>
              <span style={styles.meta}>{r.jobId ?? 'todos os jobs'}</span>
              <span style={styles.meta}>{new Date(r.startedAt).toLocaleString('pt-BR')}</span>
              <span style={styles.meta}>{r.duration != null ? `${(r.duration / 1000).toFixed(1)}s` : '—'}</span>
              {canExpand && (
                <button
                  style={styles.btn}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedId(isExpanded ? null : r.id);
                  }}
                >
                  {isExpanded ? '▲ Logs' : '▼ Logs'}
                </button>
              )}
              <button style={styles.btn} onClick={(event) => { event.stopPropagation(); rerun(r.id); }}>↩ Re-executar</button>
              <button
                style={{ ...styles.btn, color: '#f85149', borderColor: '#f8514933' }}
                onClick={(event) => { event.stopPropagation(); deleteEntry(r.id); }}
                title="Excluir do histórico"
              >🗑</button>
            </div>
            {isExpanded && (
              <div style={styles.logPanel}>
                {hasLogs
                  ? logs.map((line, i) => (
                      <div key={i} style={styles.logLine}>{line}</div>
                    ))
                  : <pre style={styles.logLine}>{logFallback}</pre>
                }
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function statusColor(s: string) {
  return ({ success: '#3fb950', failed: '#f85149', cancelled: '#d29922', running: '#58a6ff' } as Record<string, string>)[s] ?? '#6e7681';
}
function statusIcon(s: string) {
  return ({ success: '✓', failed: '✗', cancelled: '⊘', running: '◉' } as Record<string, string>)[s] ?? '○';
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, overflow: 'auto', padding: 16 },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e7681', padding: 40 },
  header: { fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#e6edf3' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #21262d', fontSize: 12, color: '#c9d1d9' },
  clickableRow: { cursor: 'pointer' },
  name: { flex: 1, fontWeight: 500 },
  meta: { color: '#6e7681', whiteSpace: 'nowrap', fontSize: 11 },
  btn: { padding: '2px 8px', border: '1px solid #30363d', borderRadius: 4, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 11 },
  logPanel: { background: '#0d1117', border: '1px solid #21262d', borderRadius: 4, padding: '8px 12px', marginBottom: 4, maxHeight: 300, overflow: 'auto' },
  logLine: { fontFamily: 'monospace', fontSize: 11, color: '#8b949e', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 },
};
