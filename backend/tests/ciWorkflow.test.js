import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const workflowPath = fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url));
const workflow = readFileSync(workflowPath, 'utf8');

describe('CI workflow contract', () => {
  it('ejecuta las verificaciones bloqueadas de los tres clientes', () => {
    expect(workflow).toContain('node-version: 20.20.2');
    expect(workflow).toContain('flutter-version: 3.44.0');
    expect(workflow).toContain('run: npm test');
    expect(workflow).toContain('run: npm run lint');
    expect(workflow).toContain('run: npm run build');
    expect(workflow).toContain('run: flutter analyze --no-pub');
    expect(workflow).toContain('run: flutter test --no-pub');
  });

  it('mantiene permisos minimos y no contiene pasos operativos', () => {
    expect(workflow).toMatch(/permissions:\s+contents: read/);
    expect(workflow.match(/persist-credentials: false/g)).toHaveLength(3);
    expect(workflow).not.toMatch(/\b(deploy|migrate)\b|secrets\./i);
  });
});
