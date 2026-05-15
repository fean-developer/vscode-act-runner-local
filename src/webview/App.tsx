import React, { useEffect, useCallback, useState } from 'react';
import { useExecutionStore, type AppView } from './store/executionStore';
import type { ActEvent, WebviewMessage } from '../types/events.types';

// Views — implementadas pelo @frontend
import { WorkflowGraph } from './components/WorkflowGraph';
import { HistoryPanel } from './components/HistoryPanel';
import { EnvEditor } from './components/EnvEditor';
import { ControlBar } from './components/ControlBar';
import { LogPanel } from './components/LogPanel';
import { ExecutionSidebar } from './components/ExecutionSidebar';

declare global {
  interface Window {
    __INITIAL_VIEW__?: string;
    __vscode__?: {
      postMessage: (msg: unknown) => void;
    };
  }
}

export function App() {
  const { currentView, setView, handleEvent, setHistory } = useExecutionStore();
  const [logHeight, setLogHeight] = useState(200);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = logHeight;
    const onMove = (ev: MouseEvent) => {
      // dragging up increases log height
      const delta = startY - ev.clientY;
      setLogHeight(Math.max(60, Math.min(window.innerHeight - 120, startH + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [logHeight]);

  // Definir view inicial vinda do Extension Host
  useEffect(() => {
    const initial = window.__INITIAL_VIEW__;
    if (initial) setView(initial as AppView);
  }, []);

  // Escutar eventos do Extension Host
  useEffect(() => {
    const handler = (event: MessageEvent<WebviewMessage>) => {
      const msg = event.data;
      if (!msg?.type) return;

      if (msg.type === 'navigate') {
        setView(msg.payload.view as Parameters<typeof setView>[0]);
        return;
      }

      if (msg.type === 'state:snapshot') {
        if (msg.payload.history) {
          setHistory(msg.payload.history as Parameters<typeof setHistory>[0]);
        }
        return;
      }

      // Repassar eventos de execução para o store
      handleEvent(msg as ActEvent);
    };

    window.addEventListener('message', handler);

    // Solicitar estado inicial ao Extension Host
    window.__vscode__?.postMessage({ type: 'state:request', payload: {} });

    return () => window.removeEventListener('message', handler);
  }, [handleEvent, setHistory, setView]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ControlBar />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentView === 'graph' && (
          <>
            {/* Área principal: sidebar (navigator) + grafo (status) */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              <ExecutionSidebar />
              <WorkflowGraph />
            </div>
            {/* Drag handle */}
            <div
              onMouseDown={startResize}
              style={{
                height: 5,
                cursor: 'row-resize',
                background: '#21262d',
                borderTop: '1px solid #30363d',
                borderBottom: '1px solid #30363d',
                flexShrink: 0,
                userSelect: 'none',
              }}
            />
            <LogPanel height={logHeight} />
          </>
        )}
        {currentView === 'history' && <HistoryPanel />}
        {currentView === 'env' && <EnvEditor />}
      </div>
    </div>
  );
}
