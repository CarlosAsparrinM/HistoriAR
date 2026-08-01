function parseBooleanFlag(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function toNullableInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Los anios del periodo deben ser numericos.');
  return Math.trunc(parsed);
}

export function normalizeMonumentPayload(payload) {
  const normalized = { ...payload };
  const shouldNormalizeCultures = Object.prototype.hasOwnProperty.call(normalized, 'cultures')
    || Object.prototype.hasOwnProperty.call(normalized, 'culture');

  if (shouldNormalizeCultures) {
    const rawCultures = [
      ...(Array.isArray(normalized.cultures) ? normalized.cultures : []),
      ...(typeof normalized.culture === 'string' && normalized.culture.trim() ? [normalized.culture.trim()] : []),
    ];
    const seen = new Set();
    normalized.cultures = rawCultures
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .filter((culture) => {
        const identifier = culture.toLowerCase();
        if (seen.has(identifier)) return false;
        seen.add(identifier);
        return true;
      });
    normalized.culture = normalized.cultures[0] || '';
  }

  if (normalized.period && typeof normalized.period === 'object') {
    const period = { ...normalized.period };
    const isIdentified = parseBooleanFlag(period.isIdentified, true);
    const startYear = toNullableInteger(period.startYear);
    const endYear = toNullableInteger(period.endYear);
    if (isIdentified && startYear === null) {
      throw new Error('Debe ingresar al menos el anio de inicio o marcarlo como no identificado.');
    }
    if (isIdentified && startYear !== null && endYear !== null && endYear < startYear) {
      throw new Error('El anio de fin no puede ser menor al anio de inicio.');
    }
    normalized.period = {
      ...period,
      isIdentified,
      startYear: isIdentified ? startYear : null,
      endYear: isIdentified ? endYear : null,
    };
  }

  if (normalized.discovery && typeof normalized.discovery === 'object') {
    const discovery = { ...normalized.discovery };
    const isDiscovererKnown = parseBooleanFlag(discovery.isDiscovererKnown, false);
    const allowedPrecisions = new Set(['exact', 'month', 'year', 'unknown']);
    const requestedPrecision = String(
      discovery.datePrecision || (parseBooleanFlag(discovery.isDateKnown, false) ? 'exact' : 'unknown'),
    ).toLowerCase();
    const datePrecision = allowedPrecisions.has(requestedPrecision)
      ? requestedPrecision
      : 'unknown';

    discovery.datePrecision = datePrecision;
    discovery.isDateKnown = datePrecision !== 'unknown';
    discovery.isDiscovererKnown = isDiscovererKnown;
    if (datePrecision === 'unknown') {
      discovery.discoveredAt = null;
      discovery.discoveredYear = null;
      discovery.discoveredMonth = null;
    } else if (datePrecision === 'exact') {
      const parsedDate = new Date(discovery.discoveredAt);
      if (!discovery.discoveredAt || Number.isNaN(parsedDate.getTime())) {
        throw new Error('Debe ingresar la fecha exacta de descubrimiento.');
      }
      discovery.discoveredAt = parsedDate;
      discovery.discoveredYear = parsedDate.getUTCFullYear();
      discovery.discoveredMonth = parsedDate.getUTCMonth() + 1;
    } else if (datePrecision === 'month') {
      const year = toNullableInteger(discovery.discoveredYear);
      const month = toNullableInteger(discovery.discoveredMonth);
      if (year === null || month === null || month < 1 || month > 12) {
        throw new Error('Debe ingresar un mes y anio de descubrimiento validos.');
      }
      discovery.discoveredYear = year;
      discovery.discoveredMonth = month;
      discovery.discoveredAt = new Date(Date.UTC(year, month - 1, 1));
    } else {
      const year = toNullableInteger(discovery.discoveredYear);
      if (year === null) throw new Error('Debe ingresar el anio de descubrimiento.');
      discovery.discoveredYear = year;
      discovery.discoveredMonth = null;
      discovery.discoveredAt = new Date(Date.UTC(year, 0, 1));
    }

    if (isDiscovererKnown) {
      const name = String(discovery.discovererName || '').trim();
      if (!name) throw new Error('Debe ingresar el nombre del descubridor o marcarlo como desconocido.');
      discovery.discovererName = name;
    } else {
      discovery.discovererName = null;
    }
    normalized.discovery = discovery;
  }
  return normalized;
}
