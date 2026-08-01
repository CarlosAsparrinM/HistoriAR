import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Docker runtime contract', () => {
  it('usa instalación reproducible, usuario no-root, puerto y healthcheck correctos', async () => {
    const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');

    expect(dockerfile).toContain('FROM node:20.20.2-bookworm-slim');
    expect(dockerfile).toContain('npm ci --omit=dev');
    expect(dockerfile).toContain('USER node');
    expect(dockerfile).toContain('EXPOSE 4000');
    expect(dockerfile).toContain('HEALTHCHECK');
    expect(dockerfile).toContain('CMD ["node", "src/server.js"]');
    expect(dockerfile).not.toContain('RUN npm install');
    expect(dockerfile).not.toContain('EXPOSE 3000');
  });

  it('no copia secretos, pruebas ni documentación a la imagen', async () => {
    const dockerignore = await readFile(new URL('../.dockerignore', import.meta.url), 'utf8');

    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toMatch(/^\.env\.\*$/m);
    expect(dockerignore).toMatch(/^tests$/m);
    expect(dockerignore).toMatch(/^docs$/m);
  });
});
