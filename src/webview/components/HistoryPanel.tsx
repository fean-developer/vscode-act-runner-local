import React, { useMemo, useState } from 'react';
import { useExecutionStore } from '../store/executionStore';

const PAGE_SIZE = 20;

export function HistoryPanel() {
  const history = useExecutionStore((s) => s.history);
  const historyLogs = useExecutionStore((s) => s.historyLogs);
  const graphSnapshotsByExecutionId = useExecutionStore((s) => s.graphSnapshotsByExecutionId);
  const restoreGraphForExecution = useExecutionStore((s) => s.restoreGraphForExecution);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const rerun = (id: string) =>
    window.__vscode__?.postMessage({ type: 'command:rerun', payload: { executionId: id } });

  const deleteEntry = (id: string) =>
    window.__vscode__?.postMessage({ type: 'command:deleteHistory', payload: { executionId: id } });

  const restoreExecution = (id: string) => {
    window.__vscode__?.postMessage({ type: 'command:restoreHistoryRepository', payload: { executionId: id } });
    restoreGraphForExecution(id);
  };

  const filteredHistory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return history;
    return history.filter((record) => [
      record.workflowName,
      record.workflowPath,
      record.workflowRef,
      record.jobId,
      record.status,
      record.trigger,
      new Date(record.startedAt).toLocaleString('pt-BR'),
    ].some((value) => String(value ?? '').toLowerCase().includes(needle)));
  }, [history, query]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedHistory = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    setOpenMenuId(null);
  };

  if (history.length === 0) {
    return <div style={styles.empty}>Nenhuma execução registrada ainda.</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div>
          <div style={styles.title}>All workflow runs</div>
          <div style={styles.subtitle}>Showing runs from all workflows</div>
        </div>
        <input
          style={styles.search}
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Filter workflow runs"
        />
      </div>

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span>{filteredHistory.length} workflow {filteredHistory.length === 1 ? 'run' : 'runs'}</span>
          <span style={styles.headerColumns}>Workflow · Event · Status · Branch · Action</span>
        </div>

      {pagedHistory.map((r) => {
        const isExpanded = expandedId === r.id;
        const logs = historyLogs[r.id];
        const hasLogs = logs && logs.length > 0;
        const canRestoreGraph = !!graphSnapshotsByExecutionId[r.id];
        // fallback: logSummary do ExecutionRecord (execuções de sessões anteriores)
        const logFallback = !hasLogs && r.logSummary ? r.logSummary : null;
        const canExpand = hasLogs || !!logFallback;
        const branch = formatBranch(r.workflowRef);
        const menuOpen = openMenuId === r.id;

        return (
          <div key={r.id}>
            <div
              style={{ ...styles.row, ...(canRestoreGraph ? styles.clickableRow : {}) }}
              onClick={canRestoreGraph ? () => restoreExecution(r.id) : undefined}
              title={canRestoreGraph ? 'Abrir grafo desta execução' : 'Grafo detalhado disponível para execuções feitas nesta sessão'}
            >
              <span style={{ color: statusColor(r.status), fontSize: 14 }}>{statusIcon(r.status)}</span>
              <div style={styles.runMain}>
                <div style={styles.runTitle}>{r.workflowName}</div>
                <div style={styles.runSubline}>{eventLabel(r)} · {r.jobId ?? 'todos os jobs'} · {r.trigger}</div>
              </div>
              <span style={styles.statusText}>{capitalize(r.status)}</span>
              <span style={styles.branchPill}>{branch}</span>
              <span style={styles.metaBlock}>{new Date(r.startedAt).toLocaleString('pt-BR')}<br />{r.duration != null ? `${(r.duration / 1000).toFixed(1)}s` : '—'}</span>
              <div style={styles.menuWrap}>
                <button
                  style={styles.kebabButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuId(menuOpen ? null : r.id);
                  }}
                  title="Ações"
                >
                  ...
                </button>
                {menuOpen && (
                  <div style={styles.menu} onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      style={{ ...styles.menuItem, ...(!canExpand ? styles.menuItemDisabled : {}) }}
                      disabled={!canExpand}
                      onClick={() => {
                        setExpandedId(isExpanded ? null : r.id);
                        setOpenMenuId(null);
                      }}
                    >
                      {isExpanded ? 'Ocultar log' : 'Ver log'}
                    </button>
                    <button type="button" style={styles.menuItem} onClick={() => { rerun(r.id); setOpenMenuId(null); }}>Reexecutar</button>
                    <button type="button" style={{ ...styles.menuItem, ...styles.dangerItem }} onClick={() => { deleteEntry(r.id); setOpenMenuId(null); }}>Deletar</button>
                  </div>
                )}
              </div>
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
      {pagedHistory.length === 0 && <div style={styles.noResults}>Nenhuma execução encontrada para este filtro.</div>}
      </div>

      <div style={styles.pagination}>
        <button style={styles.pageButton} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
        <button style={styles.pageButton} disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
      </div>
    </div>
  );
}

function formatBranch(ref?: string) {
  if (!ref) return 'main';
  return ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, 'tag:');
}

function eventLabel(record: { workflowRef?: string; trigger: string }) {
  return record.trigger === 'replay' ? 'Re-run' : record.workflowRef ? 'workflow_dispatch' : 'manual';
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusColor(s: string) {
  return ({ success: '#3fb950', failed: '#f85149', cancelled: '#d29922', running: '#58a6ff' } as Record<string, string>)[s] ?? '#6e7681';
}
function statusIcon(s: string) {
  return ({ success: '✓', failed: '✗', cancelled: '⊘', running: '◉' } as Record<string, string>)[s] ?? '○';
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, overflow: 'auto', padding: 20, background: '#0d1117' },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e7681', padding: 40 },
  topBar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 16 },
  title: { color: '#e6edf3', fontSize: 20, fontWeight: 600 },
  subtitle: { color: '#8b949e', fontSize: 12, marginTop: 3 },
  search: { width: 280, padding: '7px 12px', border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', color: '#c9d1d9', fontSize: 12 },
  table: { border: '1px solid #30363d', borderRadius: 6, overflow: 'visible', background: '#0d1117' },
  tableHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #30363d', background: '#161b22', color: '#c9d1d9', fontSize: 12, fontWeight: 600 },
  headerColumns: { color: '#8b949e', fontWeight: 500 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #21262d', fontSize: 12, color: '#c9d1d9', position: 'relative' },
  clickableRow: { cursor: 'pointer' },
  runMain: { flex: 1, minWidth: 220 },
  runTitle: { fontSize: 13, color: '#e6edf3', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  runSubline: { color: '#8b949e', fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusText: { width: 80, color: '#8b949e', fontSize: 12 },
  branchPill: { maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px 7px', borderRadius: 10, background: '#0d2d57', color: '#79c0ff', fontSize: 11, fontWeight: 600 },
  metaBlock: { width: 160, color: '#8b949e', whiteSpace: 'nowrap', fontSize: 11, lineHeight: 1.45 },
  menuWrap: { position: 'relative', width: 34, display: 'flex', justifyContent: 'flex-end' },
  kebabButton: { width: 28, height: 28, border: '1px solid transparent', borderRadius: 6, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontWeight: 700, lineHeight: 1 },
  menu: { position: 'absolute', right: 0, top: 31, zIndex: 20, minWidth: 150, border: '1px solid #30363d', borderRadius: 6, background: '#161b22', boxShadow: '0 12px 28px rgba(0,0,0,0.45)', padding: '6px 0' },
  menuItem: { width: '100%', display: 'block', padding: '7px 12px', border: 0, background: 'transparent', color: '#c9d1d9', textAlign: 'left', cursor: 'pointer', fontSize: 12 },
  menuItemDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  dangerItem: { color: '#f85149' },
  noResults: { padding: 24, color: '#8b949e', textAlign: 'center', fontSize: 12 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 0' },
  pageButton: { padding: '5px 12px', border: '1px solid #30363d', borderRadius: 6, background: '#161b22', color: '#c9d1d9', cursor: 'pointer', fontSize: 12 },
  pageInfo: { color: '#8b949e', fontSize: 12 },
  logPanel: { background: '#010409', borderBottom: '1px solid #21262d', padding: '10px 16px', maxHeight: 320, overflow: 'auto' },
  logLine: { fontFamily: 'monospace', fontSize: 11, color: '#8b949e', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 },
};
