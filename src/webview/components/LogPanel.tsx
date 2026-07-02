import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useExecutionStore } from '../store/executionStore';

const ANSI_SGR_RE = /\x1b\[([0-9;]*)m/g;
const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

const ALLOWED_HTML_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'br', 'span', 'div', 'p', 'code', 'pre', 'small',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'color', 'font-weight', 'font-style', 'text-decoration', 'background-color',
]);

interface AnsiStyleState {
  color?: string;
  fontWeight?: React.CSSProperties['fontWeight'];
}

interface AnsiSegment {
  text: string;
  style: AnsiStyleState;
}

const ANSI_COLOR_MAP: Record<number, string> = {
  30: '#4b5563',
  31: '#f85149',
  32: '#3fb950',
  33: '#d29922',
  34: '#58a6ff',
  35: '#bc8cff',
  36: '#39c5cf',
  37: '#c9d1d9',
  90: '#6e7681',
  91: '#ff7b72',
  92: '#56d364',
  93: '#e3b341',
  94: '#79c0ff',
  95: '#d2a8ff',
  96: '#56d4dd',
  97: '#f0f6fc',
};

function normalizeAnsiEscapes(text: string): string {
  return text
    .replace(/\\033\[/g, '\x1b[')
    .replace(/\\x1b\[/gi, '\x1b[')
    .replace(/\\u001b\[/gi, '\x1b[');
}

function stripAnsi(text: string): string {
  return normalizeAnsiEscapes(text).replace(/\x1b\[[0-9;]*m/g, '');
}

function parseAnsiSegments(text: string): AnsiSegment[] {
  const normalized = normalizeAnsiEscapes(text);
  const segments: AnsiSegment[] = [];
  let style: AnsiStyleState = {};
  let cursor = 0;

  normalized.replace(ANSI_SGR_RE, (full, rawCodes, offset) => {
    if (offset > cursor) {
      segments.push({ text: normalized.slice(cursor, offset), style: { ...style } });
    }

    const codes = rawCodes
      .split(';')
      .filter((n: string) => n.length > 0)
      .map((n: string) => Number(n))
      .filter((n: number) => Number.isFinite(n));

    if (codes.length === 0) {
      style = {};
    } else {
      for (const code of codes) {
        if (code === 0) {
          style = {};
        } else if (code === 1) {
          style = { ...style, fontWeight: 600 };
        } else if (code === 22) {
          style = { ...style, fontWeight: undefined };
        } else if (code === 39) {
          style = { ...style, color: undefined };
        } else if (ANSI_COLOR_MAP[code]) {
          style = { ...style, color: ANSI_COLOR_MAP[code] };
        }
      }
    }

    cursor = offset + full.length;
    return full;
  });

  if (cursor < normalized.length) {
    segments.push({ text: normalized.slice(cursor), style: { ...style } });
  }

  if (segments.length === 0) {
    return [{ text: normalized, style: {} }];
  }

  return segments;
}

function sanitizeStyle(styleValue: string): string {
  const declarations = styleValue
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean);

  const safe: string[] = [];
  for (const declaration of declarations) {
    const sep = declaration.indexOf(':');
    if (sep <= 0) continue;
    const property = declaration.slice(0, sep).trim().toLowerCase();
    const value = declaration.slice(sep + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(property)) continue;
    if (!/^[#(),.%\s\w-]+$/.test(value)) continue;
    safe.push(`${property}:${value}`);
  }
  return safe.join('; ');
}

function sanitizeHtml(input: string): string {
  if (!HTML_TAG_RE.test(input)) return input;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${input}</div>`, 'text/html');
  const container = parsed.body.firstElementChild as HTMLElement | null;
  if (!container) return input;

  const sanitizeNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (!ALLOWED_HTML_TAGS.has(tag)) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
      return;
    }

    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }
      if (name === 'style') {
        const safeStyle = sanitizeStyle(attr.value);
        if (safeStyle) {
          el.setAttribute('style', safeStyle);
        } else {
          el.removeAttribute('style');
        }
        return;
      }
      el.removeAttribute(attr.name);
    });

    Array.from(el.childNodes).forEach(sanitizeNode);
  };

  Array.from(container.childNodes).forEach(sanitizeNode);
  return container.innerHTML;
}

function renderLogText(text: string, defaultColor: string): React.ReactNode {
  const normalized = normalizeAnsiEscapes(text);
  if (!normalized.includes('\x1b[')) {
    if (HTML_TAG_RE.test(normalized)) {
      return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalized) }} />;
    }
    return normalized;
  }
  const segments = parseAnsiSegments(normalized);
  return segments.map((segment, idx) => {
    const color = segment.style.color ?? defaultColor;
    const fontWeight = segment.style.fontWeight;
    return (
      <span key={`ansi-${idx}`} style={{ color, ...(fontWeight ? { fontWeight } : {}) }}>
        {segment.text}
      </span>
    );
  });
}

function levelColor(level: 'info' | 'warn' | 'error' | 'debug' | 'notice'): string {
  if (level === 'error') return '#f85149';
  if (level === 'warn') return '#d29922';
  if (level === 'notice') return '#58a6ff';
  if (level === 'debug') return '#8b949e';
  return '#c9d1d9';
}

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
      const logWithoutAnsi = stripAnsi(log.line);
      const groupStart = logWithoutAnsi.match(/::group::(.+)/);
      const groupEnd   = logWithoutAnsi.includes('::endgroup::');

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
              const color = levelColor(item.log.level);
              return (
                <div key={item.log.id} style={{ color, lineHeight: 1.5 }}>
                  {renderLogText(item.log.line, color)}
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
                      <div key={l.id} style={{ color: levelColor(l.level), lineHeight: 1.5 }}>
                        {renderLogText(l.line, levelColor(l.level))}
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
