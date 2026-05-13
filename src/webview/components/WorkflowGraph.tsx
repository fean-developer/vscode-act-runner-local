import React from 'react';
import { useExecutionStore } from '../store/executionStore';

/**
 * Grafo visual de execução estilo n8n.
 * Renderiza jobs (JobNode) e steps (StepNode) com React Flow.
 * Implementação completa: @frontend
 */
export function WorkflowGraph() {
  const { nodes, edges, execution } = useExecutionStore();

  if (nodes.length === 0) {
    return (
      <div style={styles.empty}>
        <p>⚡ Nenhum workflow em execução.</p>
        <p style={{ fontSize: 12, opacity: 0.6 }}>
          Execute um workflow para ver o grafo aqui.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* TODO @frontend: substituir pelo React Flow graph com JobNode e StepNode */}
      <div style={styles.placeholder}>
        <strong>{execution.workflowName}</strong>
        <span style={{ marginLeft: 12, opacity: 0.6 }}>
          {nodes.filter((n) => n.type === 'job').length} jobs ·{' '}
          {nodes.filter((n) => n.type === 'step').length} steps
        </span>
        <div style={{ marginTop: 12 }}>
          {nodes
            .filter((n) => n.type === 'job')
            .map((n) => (
              <div key={n.id} style={{ ...styles.jobCard, borderColor: statusColor(n.status) }}>
                <span>{statusIcon(n.status)} {n.label}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    idle: '#6B7280', running: '#3B82F6', success: '#10B981', failed: '#EF4444', skipped: '#F59E0B',
  };
  return colors[status] ?? '#6B7280';
}

function statusIcon(status: string): string {
  const icons: Record<string, string> = {
    idle: '⬜', running: '🔄', success: '✅', failed: '❌', skipped: '⏭️',
  };
  return icons[status] ?? '⬜';
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, overflow: 'hidden', background: '#111827' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' },
  placeholder: { padding: 20, color: '#F3F4F6' },
  jobCard: { padding: '8px 14px', marginBottom: 8, border: '1px solid', borderRadius: 6, background: '#1F2937' },
};
