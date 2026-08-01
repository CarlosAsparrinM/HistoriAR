import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/models/User.js', () => ({
  default: { countDocuments: vi.fn() },
}));
vi.mock('../../src/models/Visit.js', () => ({
  default: { countDocuments: vi.fn(), aggregate: vi.fn() },
}));

const User = (await import('../../src/models/User.js')).default;
const Visit = (await import('../../src/models/Visit.js')).default;
const { getDashboardStats } = await import('../../src/controllers/statsController.js');

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('dashboard AR metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    User.countDocuments.mockResolvedValue(12);
    Visit.countDocuments.mockResolvedValueOnce(8).mockResolvedValueOnce(3);
    Visit.aggregate.mockResolvedValue([{ avgDuration: 4.25 }]);
  });

  it('cuenta solo visitas clasificadas como experiencia AR', async () => {
    const res = mockRes();

    await getDashboardStats({ query: { period: 'week' } }, res);

    expect(Visit.countDocuments).toHaveBeenNthCalledWith(2, {
      date: expect.objectContaining({ $gte: expect.any(Date), $lte: expect.any(Date) }),
      experienceType: 'ar',
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      metrics: expect.objectContaining({ arSessions: 3, avgSessionTime: 4.3 }),
    }));
  });
});
