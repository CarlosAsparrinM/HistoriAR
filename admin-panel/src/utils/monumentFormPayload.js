function toNullableNumber(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

export function buildMonumentPayload(formData, sanitizeYearInput) {
  const precision = formData.discovery.datePrecision;
  return {
    ...formData,
    culture: formData.cultures[0] || null,
    cultures: formData.cultures,
    period: {
      ...formData.period,
      isIdentified: Boolean(formData.period.isIdentified),
      startYear: formData.period.isIdentified ? sanitizeYearInput(formData.period.startYear) : null,
      endYear: formData.period.isIdentified ? sanitizeYearInput(formData.period.endYear) : null,
    },
    discovery: {
      ...formData.discovery,
      isDateKnown: precision !== 'unknown',
      datePrecision: precision,
      discoveredAt: precision === 'exact'
        ? formData.discovery.discoveredAt
        : precision === 'month'
          ? `${String(formData.discovery.discoveredYear).padStart(4, '0')}-${String(formData.discovery.discoveredMonth).padStart(2, '0')}-01`
          : precision === 'year'
            ? `${String(formData.discovery.discoveredYear).padStart(4, '0')}-01-01`
            : null,
      discoveredYear: precision === 'unknown' ? null : toNullableNumber(formData.discovery.discoveredYear),
      discoveredMonth: precision === 'month' ? toNullableNumber(formData.discovery.discoveredMonth) : null,
      isDiscovererKnown: Boolean(formData.discovery.isDiscovererKnown),
      discovererName: formData.discovery.isDiscovererKnown
        ? formData.discovery.discovererName.trim()
        : null,
    },
  };
}
