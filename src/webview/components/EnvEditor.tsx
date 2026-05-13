import React, { useState } from 'react';

/**
 * Editor de variáveis de ambiente para .env, .secrets e .actrc.
 * Secrets são mascarados por padrão. Implementação completa: @frontend
 */

type Tab = 'env' | 'secrets' | 'actrc';

interface EnvEntry { key: string; value: string }

const SECRET_KEY_PATTERN = /token|password|secret|key|auth|credential/i;

export function EnvEditor() {
  const [tab, setTab] = useState<Tab>('env');
  const [rows, setRows] = useState<EnvEntry[]>([{ key: '', value: '' }]);
  const [visible, setVisible] = useState(false);

  const save = () =>
    window.__vscode__?.postMessage({ type: 'command:saveEnv', payload: { tab, rows } });

  const addRow = () => setRows((r) => [...r, { key: '', value: '' }]);

  const updateRow = (i: number, field: keyof EnvEntry, val: string) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const isSecret = tab === 'secrets';

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {(['env', 'secrets', 'actrc'] as Tab[]).map((t) => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isSecret && (
        <div style={styles.warning}>
          ⚠️ Secrets nunca devem ser commitados. Verifique se .secrets está no .gitignore.
          <button style={styles.toggleBtn} onClick={() => setVisible(!visible)}>
            {visible ? '🙈 Ocultar' : '👁 Mostrar'} valores
          </button>
        </div>
      )}

      <div style={styles.table}>
        <div style={styles.tableHead}>
          <span style={styles.cell}>Chave</span>
          <span style={styles.cell}>Valor</span>
          <span style={{ width: 32 }} />
        </div>
        {rows.map((row, i) => (
          <div key={i} style={styles.tableRow}>
            <input style={styles.input} value={row.key} placeholder="KEY" onChange={(e) => updateRow(i, 'key', e.target.value)} />
            <input
              style={styles.input}
              type={(isSecret && !visible && SECRET_KEY_PATTERN.test(row.key)) ? 'password' : 'text'}
              value={row.value}
              placeholder="valor"
              onChange={(e) => updateRow(i, 'value', e.target.value)}
            />
            <button style={styles.removeBtn} onClick={() => removeRow(i)}>✕</button>
          </div>
        ))}
      </div>

      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={addRow}>+ Adicionar</button>
        <button style={styles.btnPrimary} onClick={save}>💾 Salvar {TAB_LABELS[tab]}</button>
      </div>
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = { env: '.env', secrets: '.secrets', actrc: '.actrc' };

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  tabs: { display: 'flex', gap: 4 },
  tab: { padding: '4px 10px', border: '1px solid #374151', borderRadius: 4, background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontSize: 12 },
  tabActive: { background: '#374151', color: '#F3F4F6', borderColor: '#6B7280' },
  warning: { fontSize: 11, color: '#F59E0B', background: '#1C1A0C', border: '1px solid #451A03', borderRadius: 4, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 },
  toggleBtn: { marginLeft: 'auto', padding: '2px 6px', border: '1px solid #6B7280', borderRadius: 3, background: 'transparent', color: '#D1D5DB', cursor: 'pointer', fontSize: 11 },
  table: { border: '1px solid #374151', borderRadius: 4, overflow: 'hidden' },
  tableHead: { display: 'flex', background: '#161B22', padding: '4px 8px', fontSize: 11, color: '#6B7280' },
  tableRow: { display: 'flex', borderTop: '1px solid #374151' },
  cell: { flex: 1, padding: '0 4px' },
  input: { flex: 1, padding: '5px 8px', background: 'transparent', border: 'none', borderRight: '1px solid #374151', color: '#D1D5DB', fontSize: 12, fontFamily: 'monospace', outline: 'none' },
  removeBtn: { width: 32, border: 'none', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: 12 },
  actions: { display: 'flex', gap: 8 },
  btnPrimary: { padding: '6px 14px', background: '#3B82F6', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 12 },
  btnSecondary: { padding: '4px 10px', background: 'transparent', border: '1px solid #374151', borderRadius: 4, color: '#9CA3AF', cursor: 'pointer', fontSize: 11 },
};
