import React, { useState, useEffect } from 'react';

type Tab = 'env' | 'vars' | 'secrets' | 'actrc';

interface EnvEntry { key: string; value: string }
export function EnvEditor() {
  const [tab, setTab] = useState<Tab>('env');
  const [rows, setRows] = useState<EnvEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [filePath, setFilePath] = useState<string>('');

  // Solicitar dados do arquivo ao Extension Host ao montar e ao trocar de aba
  useEffect(() => {
    setLoading(true);
    setRows([]);
    window.__vscode__?.postMessage({ type: 'command:loadEnv', payload: { tab } });

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === 'state:snapshot' && msg.payload?.envData?.tab === tab) {
        const data = (msg.payload.envData.rows ?? []) as EnvEntry[];
        setRows(data.length > 0 ? data : [{ key: '', value: '' }]);
        setFilePath((msg.payload.envData.filePath as string) ?? '');
        setLoading(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [tab]);

  const save = () =>
    window.__vscode__?.postMessage({ type: 'command:saveEnv', payload: { tab, rows, filePath } });

  const loadCurrentFile = () => {
    setLoading(true);
    window.__vscode__?.postMessage({ type: 'command:loadEnv', payload: { tab, filePath } });
  };

  const selectFile = () => {
    setLoading(true);
    window.__vscode__?.postMessage({ type: 'command:selectEnvFile', payload: { tab } });
  };

  const addRow = () => setRows((r) => [...r, { key: '', value: '' }]);

  const updateRow = (i: number, field: keyof EnvEntry, val: string) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const isSecret = tab === 'secrets';
  const canEditFilePath = tab === 'env' || tab === 'vars' || tab === 'secrets';

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {(['env', 'vars', 'secrets', 'actrc'] as Tab[]).map((t) => (
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

      {canEditFilePath ? (
        <label style={styles.filePathEditor}>
          <span style={styles.filePathLabel}>Arquivo de {FILE_KIND_LABELS[tab]}</span>
          <span style={styles.filePathRow}>
            <input
              style={styles.filePathInput}
              value={filePath}
              placeholder={FILE_PLACEHOLDERS[tab]}
              onChange={(e) => setFilePath(e.target.value)}
            />
            <button style={styles.btnSecondary} onClick={selectFile}>Selecionar</button>
            <button style={styles.btnSecondary} onClick={loadCurrentFile}>Carregar</button>
          </span>
        </label>
      ) : filePath && (
        <div style={styles.filePathHint}>
          📄 {filePath}
        </div>
      )}

      {loading ? (
        <div style={styles.loadingMsg}>Carregando {TAB_LABELS[tab]}…</div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHead}>
            <span style={styles.cell}>{tab === 'actrc' ? 'Argumento' : 'Chave'}</span>
            {tab !== 'actrc' && <span style={styles.cell}>Valor</span>}
            <span style={{ width: 32 }} />
          </div>
          {rows.map((row, i) => (
            <div key={i} style={styles.tableRow}>
              <input style={styles.input} value={row.key} placeholder={tab === 'actrc' ? '--flag ou -P runner=image' : 'KEY'} onChange={(e) => updateRow(i, 'key', e.target.value)} />
              {tab !== 'actrc' && (
                <input
                  style={styles.input}
                  type={isSecret && !visible ? 'password' : 'text'}
                  value={row.value}
                  placeholder="valor"
                  onChange={(e) => updateRow(i, 'value', e.target.value)}
                />
              )}
              <button style={styles.removeBtn} onClick={() => removeRow(i)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={addRow}>+ Adicionar</button>
        <button style={styles.btnPrimary} onClick={save}>💾 Salvar {TAB_LABELS[tab]}</button>
      </div>
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = { env: '.env', vars: '.vars', secrets: '.secrets', actrc: '.actrc' };
const FILE_KIND_LABELS: Record<Tab, string> = { env: 'env', vars: 'vars', secrets: 'secrets', actrc: 'actrc' };
const FILE_PLACEHOLDERS: Record<Tab, string> = { env: '.env ou my.env', vars: '.vars ou my.variables', secrets: '.secrets ou config/local.secrets', actrc: '.actrc' };

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  tabs: { display: 'flex', gap: 4 },
  tab: { padding: '4px 10px', border: '1px solid #30363d', borderRadius: 4, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 12 },
  tabActive: { background: '#21262d', color: '#e6edf3', borderColor: '#484f58' },
  warning: { fontSize: 11, color: '#d29922', background: '#1c1500', border: '1px solid #3d2b00', borderRadius: 4, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 },
  toggleBtn: { marginLeft: 'auto', padding: '2px 6px', border: '1px solid #484f58', borderRadius: 3, background: 'transparent', color: '#c9d1d9', cursor: 'pointer', fontSize: 11 },
  loadingMsg: { color: '#6e7681', fontSize: 12, padding: '16px 4px' },
  filePathHint: { fontSize: 10, color: '#484f58', fontFamily: 'monospace', padding: '2px 4px' },
  filePathEditor: { display: 'flex', flexDirection: 'column', gap: 4 },
  filePathRow: { display: 'flex', gap: 8 },
  filePathLabel: { fontSize: 11, color: '#8b949e' },
  filePathInput: { flex: 1, padding: '6px 8px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, color: '#c9d1d9', fontSize: 12, fontFamily: 'monospace', outline: 'none' },
  table: { border: '1px solid #21262d', borderRadius: 4, overflow: 'hidden' },
  tableHead: { display: 'flex', background: '#0d1117', padding: '4px 8px', fontSize: 11, color: '#6e7681' },
  tableRow: { display: 'flex', borderTop: '1px solid #21262d' },
  cell: { flex: 1, padding: '0 4px' },
  input: { flex: 1, padding: '5px 8px', background: 'transparent', border: 'none', borderRight: '1px solid #21262d', color: '#c9d1d9', fontSize: 12, fontFamily: 'monospace', outline: 'none' },
  removeBtn: { width: 32, border: 'none', background: 'transparent', color: '#6e7681', cursor: 'pointer', fontSize: 12 },
  actions: { display: 'flex', gap: 8 },
  btnPrimary: { padding: '6px 14px', background: '#238636', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 12 },
  btnSecondary: { padding: '4px 10px', background: 'transparent', border: '1px solid #30363d', borderRadius: 4, color: '#8b949e', cursor: 'pointer', fontSize: 11 },
};
