# Skill: Interface Visual com React Flow

## Objetivo
Renderizar o grafo de workflow de forma visual e interativa, estilo n8n, com animações de transição de estado em tempo real.

## Biblioteca
`@xyflow/react` (React Flow v11+)

## Estrutura do Grafo

### Tipos de Nó

#### JobNode (Nó Agrupador)
- Representa um job completo do workflow
- Agrupa visualmente todos os steps do job
- Exibe: nome do job, status, duração total
- Conectado a outros jobs via arestas de dependência (`needs`)

#### StepNode (Nó de Step)
- Representa um step individual dentro de um job
- Exibe: nome do step, status, duração
- Posicionado linearmente dentro do JobNode

### Mapeamento Workflow → Grafo

```typescript
function workflowToGraph(workflow: WorkflowDefinition): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  Object.entries(workflow.jobs).forEach(([jobId, job]) => {
    // Nó do job
    nodes.push({
      id: jobId,
      type: 'jobNode',
      data: { jobId, name: job.name ?? jobId, status: 'idle' },
      position: calculateJobPosition(jobId, workflow.jobs),
    });

    // Nós dos steps
    job.steps.forEach((step, index) => {
      const stepNodeId = `${jobId}/${step.id ?? index}`;
      nodes.push({
        id: stepNodeId,
        type: 'stepNode',
        parentId: jobId,
        data: { stepId: step.id, name: step.name, status: 'idle' },
        position: { x: 20, y: 60 + index * 60 },
      });
    });

    // Arestas de dependência (needs)
    (job.needs ?? []).forEach((dep) => {
      edges.push({
        id: `${dep}->${jobId}`,
        source: dep,
        target: jobId,
        animated: false,
        style: { stroke: '#6B7280' },
      });
    });
  });

  return { nodes, edges };
}
```

## Estados Visuais e Estilos

```typescript
const NODE_STYLES: Record<NodeStatus, React.CSSProperties> = {
  idle:    { borderColor: '#6B7280', background: '#1F2937' },
  running: { borderColor: '#3B82F6', background: '#1E3A5F', animation: 'pulse 1s infinite' },
  success: { borderColor: '#10B981', background: '#064E3B' },
  failed:  { borderColor: '#EF4444', background: '#450A0A' },
  skipped: { borderColor: '#F59E0B', background: '#451A03' },
};

const STATUS_ICONS: Record<NodeStatus, string> = {
  idle:    '⬜',
  running: '🔄',
  success: '✅',
  failed:  '❌',
  skipped: '⏭️',
};
```

## Atualização em Tempo Real

O store Zustand atualiza nós ao receber eventos do backend:

```typescript
// No executionStore.ts
onStepUpdate: (payload: StepUpdatePayload) => {
  set((state) => ({
    nodes: state.nodes.map((node) =>
      node.id === `${payload.jobId}/${payload.stepId}`
        ? { ...node, data: { ...node.data, status: payload.status } }
        : node
    ),
  }));
},
```

## Animação de Arestas

Quando um job está em `running`, ativar `animated: true` nas arestas de entrada:

```typescript
nodes.map((edge) =>
  edge.target === runningJobId
    ? { ...edge, animated: true, style: { stroke: '#3B82F6' } }
    : edge
);
```

## Layout Automático

Usar dagre ou elk para calcular posições automaticamente:

```typescript
import dagre from 'dagre';

function calculateLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 60 });
  nodes.forEach((n) => g.setNode(n.id, { width: 200, height: 80 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x, y: pos.y } };
  });
}
```

## Output
- Grafo interativo e responsivo
- Animações suaves de transição entre estados
- Layout automático respeitando dependências