import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useExecutionStore } from '../store/executionStore';

export function LogPanel({ height }: { height: number }) {
  const logs = useExecutionStore((s) => s.logs);
  const logFilter = useExecutionStore((s) => s.logFilter);
  const setLogFilter = useExecutionStore((s) => s.setLogFilter);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filtra logs pelo job/step selecionado no grafo
  const filteredLogs = logFilter
    ? logs.filter((l) => {
        if (l.jobId !== logFilter.jobId) return false;
        if (!logFilter.stepLabel) return true;
        return (
          l.stepId === logFilter.stepLabel ||
          (l.stepId?.startsWith(logFilter.stepLabel + '/') ?? false)
        );
      })
    : logs;

  // Agrupa linhas entre ::group:: e ::endgroup:: em seções colapsáveis
  type LogLine = typeof filteredLogs[number];
  interface FlatItem   { type: 'line';  log: LogLine }
  interface GroupItem  { type: 'group'; id: string; title: string; lines: LogLine[] }
  type DisplayItem = FlatItem | GroupItem;

  const displayItems = useMemo<DisplayItem[]>(() => {
    const items: DisplayItem[] = [];
    let openGroup: { id: string; title: string; lines: LogLine[] } | null = null;

    filteredLogs.forEach((log, idx) => {
      const groupStart = log.line.match(/::group::(.+)/);
      const groupEnd   = log.line.includes('::endgroup::');

      if (groupStart) {
        // Fechar grupo anterior se ainda estiver aberto
        if (openGroup) {
          const { id, title, lines } = openGroup;
          items.push({ type: 'group', id, title, lines });
        }
        openGroup = { id: `g-${idx}`, title: groupStart[1].trim(), lines: [] };
      } else if (groupEnd) {
        if (openGroup) {
          const { id, title, lines } = openGroup;
          items.push({ type: 'group', id, title, lines });
          openGroup = null;
        }
      } else if (openGroup) {
        openGroup.lines.push(log);
      } else {
        items.push({ type: 'line', log });
      }
    });
    // Grupo não fechado (ex: execução ainda rodando)
    if (openGroup) {
      const { id, title, lines } = openGroup;
      items.push({ type: 'group', id, title, lines });
    }
    return items;
  }, [filteredLogs]);

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Auto-scroll to bottom
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredLogs]);

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', borderTop: '1px solid #21262d', background: '#0d1117', overflow: 'hidden' }}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Logs</span>
        {logFilter ? (
          <span style={styles.breadcrumb}>
            <span style={styles.breadcrumbLabel}>{logFilter.label}</span>
            <button
              style={styles.clearBtn}
              onClick={() => setLogFilter(null)}
              title="Mostrar todos os logs"
            >
              ✕ todos
            </button>
          </span>
        ) : (
          <span style={styles.headerHint}>Clique em um job ou step para filtrar</span>
        )}
      </div>
      <div ref={bodyRef} style={styles.body}>
        {displayItems.length === 0 ? (
          <span style={{ opacity: 0.4 }}>
            {logFilter ? 'Nenhum log para este step.' : 'Aguardando execução...'}
          </span>
        ) : (
          displayItems.map((item) => {
            if (item.type === 'line') {
              const color = item.log.level === 'error' ? '#f85149' : '#c9d1d9';
              return (
                <div key={item.log.id} style={{ color, lineHeight: 1.5 }}>
                  {item.log.line}
                </div>
              );
            }
            // Grupo colapsável (::group:: ... ::endgroup::)
            const isExpanded = expandedGroups.has(item.id);
            return (
              <div key={item.id} style={{ margin: '2px 0' }}>
                <div
                  onClick={() => toggleGroup(item.id)}
                  style={styles.groupHeader}
                >
                  <span style={{ fontSize: 10, color: '#6e7681', marginRight: 4 }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <span style={{ color: '#58a6ff' }}>{item.title}</span>
                  {!isExpanded && item.lines.length > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: '#484f58' }}>
                      {item.lines.length} {item.lines.length === 1 ? 'linha' : 'linhas'}
                    </span>
                  )}
                </div>
                {isExpanded && (
                  <div style={styles.groupBody}>
                    {item.lines.map((l) => (
                      <div key={l.id} style={{ color: l.level === 'error' ? '#f85149' : '#8b949e', lineHeight: 1.5 }}>
                        {l.line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { padding: '4px 12px', fontSize: 11, color: '#8b949e', background: '#161b22', borderBottom: '1px solid #21262d', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: 600, color: '#c9d1d9' },
  headerHint: { color: '#484f58', fontStyle: 'italic' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6 },
  breadcrumbLabel: { color: '#58a6ff', fontWeight: 500 },
  clearBtn: { padding: '1px 7px', border: '1px solid #30363d', borderRadius: 3, background: 'transparent', color: '#6e7681', cursor: 'pointer', fontSize: 10 },
  body: { flex: 1, overflowY: 'auto', padding: '6px 10px', fontFamily: 'monospace', fontSize: 12, color: '#c9d1d9' },
  groupHeader: { display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', padding: '1px 0', borderLeft: '2px solid #21262d', paddingLeft: 6 },
  groupBody: { paddingLeft: 14, borderLeft: '2px solid #21262d', marginLeft: 6 },
};
