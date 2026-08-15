import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { isCreateConfirmationAccepted } from '../../src/seeds/seedAdmin.js';

const seedFiles = [
  new URL('../../src/seeds/seedAdmin.js', import.meta.url),
  new URL('../../src/seeds/seedUsers.js', import.meta.url),
  new URL('../../src/seeds/seedAll.js', import.meta.url),
];

describe('admin seed security', () => {
  it('acepta la confirmación CREAR sin distinguir mayúsculas', () => {
    expect(isCreateConfirmationAccepted('CREAR')).toBe(true);
    expect(isCreateConfirmationAccepted('crear')).toBe(true);
    expect(isCreateConfirmationAccepted('Crear')).toBe(true);
    expect(isCreateConfirmationAccepted('  cReAr  ')).toBe(true);
    expect(isCreateConfirmationAccepted('continuar')).toBe(false);
  });

  it('no contiene credenciales administrativas predeterminadas', async () => {
    const sources = await Promise.all(seedFiles.map((file) => readFile(file, 'utf8')));
    const source = sources.join('\n');
    const adminSource = [sources[0], sources[2]].join('\n');

    expect(source).not.toMatch(/bcrypt\.hash\(\s*['"]/i);
    expect(adminSource).not.toMatch(/email\s*:\s*['"][^'"]+@/i);
    expect(source).not.toMatch(/console\.log\([^\n]*(password|contraseña)/i);
  });

  it('expone un comando explícito para crear administradores', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(packageJson.scripts['admin:create']).toBe('node src/seeds/seedAdmin.js');
  });
});
