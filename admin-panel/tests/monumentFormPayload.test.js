import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMonumentPayload } from '../src/utils/monumentFormPayload.js';

const formData = {
  cultures: ['Inca'],
  period: { isIdentified: true, startYear: '1200', endYear: '1532' },
  discovery: {
    datePrecision: 'month',
    discoveredAt: '',
    discoveredYear: '1910',
    discoveredMonth: '6',
    isDiscovererKnown: false,
    discovererName: 'No debe enviarse',
  },
};

test('buildMonumentPayload normaliza periodo y descubrimiento antes de guardar', () => {
  const payload = buildMonumentPayload(formData, (value) => Number(value));

  assert.equal(payload.culture, 'Inca');
  assert.deepEqual(payload.cultures, ['Inca']);
  assert.deepEqual(payload.period, { isIdentified: true, startYear: 1200, endYear: 1532 });
  assert.equal(payload.discovery.discoveredAt, '1910-06-01');
  assert.equal(payload.discovery.discoveredYear, 1910);
  assert.equal(payload.discovery.discoveredMonth, 6);
  assert.equal(payload.discovery.discovererName, null);
});
