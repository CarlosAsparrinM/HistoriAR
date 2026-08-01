const RESOURCE_RULES = Object.freeze({
  'monument-image': {
    prefix: 'images/monuments',
    maxBytes: 5 * 1024 * 1024,
    contentTypes: {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.webp': ['image/webp'],
    },
  },
  'institution-image': {
    prefix: 'images/institutions',
    maxBytes: 5 * 1024 * 1024,
    contentTypes: {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.webp': ['image/webp'],
    },
  },
  'monument-model': {
    prefix: 'models/monuments',
    maxBytes: 50 * 1024 * 1024,
    contentTypes: {
      '.glb': ['model/gltf-binary', 'application/octet-stream'],
      '.gltf': ['model/gltf+json', 'application/json'],
    },
  },
});

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const MANAGED_FILE_NAME = String.raw`[^/\\\u0000-\u001F]{1,181}`;
const MANAGED_KEY_PATTERNS = [
  // Compatibilidad de solo lectura/eliminación con imágenes creadas antes de
  // corregir las rutas que omitían el ID del recurso.
  new RegExp(`^images/monuments/${MANAGED_FILE_NAME}$`, 'i'),
  new RegExp(`^images/institutions/${MANAGED_FILE_NAME}$`, 'i'),
  new RegExp(`^images/monuments/[a-f\\d]{24}/(?:historical/)?${MANAGED_FILE_NAME}$`, 'i'),
  new RegExp(`^images/institutions/[a-f\\d]{24}/${MANAGED_FILE_NAME}$`, 'i'),
  new RegExp(`^models/monuments/[a-f\\d]{24}/${MANAGED_FILE_NAME}$`, 'i'),
];

export const MAX_SIGNED_URL_EXPIRY_SECONDS = 15 * 60;

export class StorageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageValidationError';
  }
}

export function normalizeSignedExpiry(value, defaultValue = MAX_SIGNED_URL_EXPIRY_SECONDS) {
  const parsed = Number(value ?? defaultValue);
  if (!Number.isInteger(parsed) || parsed < 60) {
    throw new StorageValidationError('expiresIn debe ser un entero entre 60 y 900 segundos');
  }
  return Math.min(parsed, MAX_SIGNED_URL_EXPIRY_SECONDS);
}

export function sanitizeStorageFileName(fileName) {
  const raw = String(fileName || '').trim();
  if (!raw || raw.includes('/') || raw.includes('\\') || raw.includes('\0')) {
    throw new StorageValidationError('Nombre de archivo inválido');
  }

  const sanitized = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 160);

  if (!sanitized || sanitized.includes('..')) {
    throw new StorageValidationError('Nombre de archivo inválido');
  }
  return sanitized;
}

export function getUploadRule(resourceType) {
  const rule = RESOURCE_RULES[resourceType];
  if (!rule) throw new StorageValidationError('Tipo de recurso de almacenamiento no permitido');
  return rule;
}

export function validateUploadMetadata({ resourceType, resourceId, fileName, contentType, fileSize }) {
  const rule = getUploadRule(resourceType);
  if (!OBJECT_ID_PATTERN.test(String(resourceId || ''))) {
    throw new StorageValidationError('resourceId inválido');
  }

  const safeFileName = sanitizeStorageFileName(fileName);
  const extensionIndex = safeFileName.lastIndexOf('.');
  const extension = extensionIndex >= 0
    ? safeFileName.slice(extensionIndex).toLowerCase()
    : '';
  const allowedTypes = rule.contentTypes[extension];
  if (!allowedTypes || !allowedTypes.includes(contentType)) {
    throw new StorageValidationError('La extensión y el tipo de contenido no están permitidos');
  }

  if (fileSize !== undefined) {
    const normalizedSize = Number(fileSize);
    if (!Number.isInteger(normalizedSize) || normalizedSize <= 0 || normalizedSize > rule.maxBytes) {
      throw new StorageValidationError('Tamaño de archivo inválido');
    }
  }

  return { rule, safeFileName };
}

export function validateUploadedFileSignature({ buffer, contentType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    throw new StorageValidationError('El contenido del archivo no es válido');
  }

  const startsWith = (...bytes) => bytes.every((byte, index) => buffer[index] === byte);
  let valid = false;
  if (contentType === 'image/jpeg') {
    valid = startsWith(0xff, 0xd8, 0xff);
  } else if (contentType === 'image/png') {
    valid = startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  } else if (contentType === 'image/webp') {
    valid = buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  } else if (contentType === 'model/gltf-binary'
      || contentType === 'application/octet-stream') {
    valid = buffer.subarray(0, 4).toString('ascii') === 'glTF';
  } else if (contentType === 'model/gltf+json' || contentType === 'application/json') {
    const firstCharacter = buffer.toString('utf8', 0, Math.min(buffer.length, 256)).trimStart()[0];
    valid = firstCharacter === '{';
  }

  if (!valid) {
    throw new StorageValidationError('La firma real del archivo no coincide con el tipo declarado');
  }
  return true;
}

export function buildManagedUploadKey({
  resourceType,
  resourceId,
  fileName,
  contentType,
  fileSize,
  now = Date.now(),
}) {
  const { rule, safeFileName } = validateUploadMetadata({
    resourceType,
    resourceId,
    fileName,
    contentType,
    fileSize,
  });
  return `${rule.prefix}/${resourceId}/${now}_${safeFileName}`;
}

export function isManagedStorageKey(key) {
  if (typeof key !== 'string' || key.length > 255 || key.includes('..')) return false;
  return MANAGED_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function assertManagedStorageKey(key) {
  if (!isManagedStorageKey(key)) throw new StorageValidationError('Clave de almacenamiento no permitida');
  return key;
}

export function assertResourceStorageKey({ key, resourceType, resourceId }) {
  const rule = getUploadRule(resourceType);
  assertManagedStorageKey(key);
  const expectedPrefix = `${rule.prefix}/${resourceId}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new StorageValidationError('La clave no pertenece al recurso indicado');
  }
  return key;
}
