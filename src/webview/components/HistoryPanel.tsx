import React from 'react';
import { useExecutionStore } from '../store/executionStore';

/**
 * Painel de histórico de execuções passadas com re-execução.
 * Implementação completa: @frontend
 */
export function HistoryPanel() {
  const history = useExecutionStore((s) => s.history);

  const rerun = (id: string) =>
    window.__vscode__?.postMessage({ type: 'command:rerun', payload: { executionId: id } });

  if (history.length === 0) {
    return <div style={styles.empty}>Nenhuma execução registrada ainda.</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>Histórico de Execuções</div>
      {/* TODO @frontend: adicionar filtros, paginação e detalhes expandíveis */}
      {history.map((r) => (
        <div key={r.id} style={styles.row}>
          <span style={{ color: statusColor(r.status) }}>{statusIcon(r.status)}</span>
          <span style={styles.name}>{r.workflowName}</span>
          <span style={styles.meta}>{r.jobId ?? 'todos os jobs'}</span>
          <span style={styles.meta}>{new Date(r.startedAt).toLocaleString('pt-BR')}</span>
          <span style={styles.meta}>{r.duration != null ? `${(r.duration / 1000).toFixed(1)}s` : '—'}</span>
          <button style={styles.btn} onClick={() => rerun(r.id)}>↩ Re-executar</button>
        </div>
      ))}
    </div>
  );
}

function statusColor(s: string) {
  return ({ success: '#10B981', failed: '#EF4444', cancelled: '#F59E0B', running: '#3B82F6' } as Record<string, string>)[s] ?? '#6B7280';
}
function statusIcon(s: string) {
  return ({ success: '✅', failed: '❌', cancelled: '⏭️', running: '🔄' } as Record<string, string>)[s] ?? '⬜';
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, overflow: 'auto', padding: 16 },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', padding: 40 },
  header: { fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#F3F4F6' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 12, color: '#D1D5DB' },
  name: { flex: 1, fontWeight: 500 },
  meta: { color: '#6B7280', whiteSpace: 'nowrap' },
  btn: { padding: '3px 8px', border: '1px solid #374151', borderRadius: 4, background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontSize: 11 },
};
