import React from 'react';
import { useExecutionStore } from '../store/executionStore';

/**
 * Painel de logs em streaming com xterm.js.
 * Implementação completa: @frontend
 */
export function LogPanel() {
  const logs = useExecutionStore((s) => s.logs);

  return (
    <div style={styles.container}>
      <div style={styles.header}>Logs</div>
      <div style={styles.body}>
        {/* TODO @frontend: substituir por xterm.js */}
        {logs.length === 0 ? (
          <span style={{ opacity: 0.4 }}>Aguardando execução...</span>
        ) : (
          logs.map((l) => (
            <div key={l.id} style={{ color: l.level === 'error' ? '#EF4444' : '#D1D5DB' }}>
              {l.line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { height: 200, display: 'flex', flexDirection: 'column', borderTop: '1px solid #374151', background: '#0D1117' },
  header: { padding: '4px 12px', fontSize: 11, color: '#6B7280', background: '#161B22', borderBottom: '1px solid #374151' },
  body: { flex: 1, overflow: 'auto', padding: 8, fontFamily: 'monospace', fontSize: 12, color: '#D1D5DB' },
};
