import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TEMPLATES: Record<string, Record<string, unknown>> = {
  push: {
    ref: 'refs/heads/main',
    repository: { full_name: 'owner/repo', default_branch: 'main' },
    pusher: { name: 'user', email: 'user@example.com' },
    commits: [{ id: 'abc123', message: 'chore: update', author: { name: 'User' } }],
  },
  pull_request: {
    action: 'opened',
    number: 1,
    pull_request: {
      title: 'feat: new feature',
      body: '',
      head: { ref: 'feature/new', sha: 'abc123' },
      base: { ref: 'main', sha: 'def456' },
      user: { login: 'user' },
    },
    repository: { full_name: 'owner/repo' },
  },
  workflow_dispatch: {
    inputs: {},
    ref: 'refs/heads/main',
    repository: { full_name: 'owner/repo' },
  },
  release: {
    action: 'published',
    release: { tag_name: 'v1.0.0', name: 'Release v1.0.0', draft: false, prerelease: false },
    repository: { full_name: 'owner/repo' },
  },
  schedule: {
    repository: { full_name: 'owner/repo' },
  },
  issues: {
    action: 'opened',
    issue: { number: 1, title: 'Bug report', body: '', user: { login: 'user' } },
    repository: { full_name: 'owner/repo' },
  },
};

const SENSITIVE_KEYS = ['token', 'password', 'secret', 'key', 'auth', 'credential', 'passwd'];

export class WebhookSimulator {
  getSupportedEvents(): string[] {
    return Object.keys(TEMPLATES);
  }

  getTemplate(eventType: string): Record<string, unknown> {
    return JSON.parse(JSON.stringify(TEMPLATES[eventType] ?? {}));
  }

  async createPayloadFile(payload: Record<string, unknown>): Promise<string> {
    const safe = this.sanitizePayload(payload);
    const filePath = path.join(os.tmpdir(), `act-event-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf-8');
    return filePath;
  }

  cleanup(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignora — arquivo já pode ter sido removido
    }
  }

  private sanitizePayload(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sanitizePayload(item));
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([k]) => !SENSITIVE_KEYS.some((d) => k.toLowerCase().includes(d)))
        .map(([k, v]) => [k, this.sanitizePayload(v)])
    );
  }
}

export const webhookSimulator = new WebhookSimulator();
