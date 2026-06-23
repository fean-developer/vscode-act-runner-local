import path from 'path';
import { workflowParser } from '../core/workflowParser';

const FIXTURES = path.resolve(__dirname, '../__fixtures__');

describe('WorkflowParser', () => {
  describe('parse()', () => {
    it('deve parsear um workflow simples', async () => {
      const wf = await workflowParser.parse(path.join(FIXTURES, 'workflow-simple.yml'));

      expect(wf.name).toBe('CI Node.js');
      expect(wf.jobs).toBeDefined();
      expect(Object.keys(wf.jobs)).toContain('build');
      expect(wf.jobs['build']['runs-on']).toBe('ubuntu-latest');
    });

    it('deve parsear um workflow multi-job', async () => {
      const wf = await workflowParser.parse(path.join(FIXTURES, 'workflow-multi-job.yml'));

      expect(Object.keys(wf.jobs)).toEqual(['lint', 'test', 'build']);
      expect(wf.jobs['test'].needs).toContain('lint');
      expect(wf.jobs['build'].needs).toContain('lint');
      expect(wf.jobs['build'].needs).toContain('test');
    });

    it('deve lançar erro para arquivo inexistente', async () => {
      expect(() => workflowParser.parse('/nao/existe.yml')).toThrow();
    });
  });

  describe('buildGraph()', () => {
    it('deve construir nós e arestas a partir do workflow', async () => {
      const wf = await workflowParser.parse(path.join(FIXTURES, 'workflow-multi-job.yml'));
      const graph = workflowParser.buildGraph(wf);

      // 3 job nodes + step nodes
      const jobNodes = graph.nodes.filter((n) => n.type === 'job');
      expect(jobNodes).toHaveLength(3);

      // lint → test, lint → build, test → build
      expect(graph.edges.length).toBeGreaterThanOrEqual(3);
      expect(graph.edges.some((e) => e.source === 'lint' && e.target === 'test')).toBe(true);
      expect(graph.edges.some((e) => e.source === 'test' && e.target === 'build')).toBe(true);
    });
  });
});
