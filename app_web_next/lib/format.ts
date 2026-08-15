export function hasCoordinates(location: { lat?: number; lng?: number }): location is { lat: number; lng: number } {
  return typeof location.lat === 'number'
    && Number.isFinite(location.lat)
    && typeof location.lng === 'number'
    && Number.isFinite(location.lng);
}
