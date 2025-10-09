const test = require('node:test');
const assert = require('node:assert/strict');

const { ProblemStatsService } = require('../services/problemStatsService');

class StubStudyService {
  constructor(returnValue = {}) {
    this.returnValue = returnValue;
    this.calls = [];
  }

  async getUserStats(userId) {
    this.calls.push(userId);
    if (this.shouldThrow) {
      throw this.shouldThrow;
    }
    return this.returnValue;
  }
}

function createService(options) {
  return new ProblemStatsService(options);
}

test('ProblemStatsService rejects missing userId', async () => {
  const service = createService();
  await assert.rejects(
    () => service.getUserStats(),
    (error) => {
      assert.equal(error?.status, 400);
      assert.match(error?.message || '', /userId is required/i);
      return true;
    }
  );
});

test('ProblemStatsService delegates to study service', async () => {
  const stub = new StubStudyService({ totals: { total: 10 } });
  const service = createService({ study: stub });

  const result = await service.getUserStats(42);

  assert.deepEqual(result, { totals: { total: 10 } });
  assert.deepEqual(stub.calls, [42]);
});

test('ProblemStatsService returns default payload when study returns null', async () => {
  const stub = new StubStudyService(null);
  const service = createService({ study: stub });

  const result = await service.getUserStats(7);
  assert.deepEqual(result, {
    totalProblems: 0,
    totalCorrect: 0,
    accuracy: 0,
    totalSessions: 0,
    weeklySessions: 0,
    perType: []
  });
});

test('ProblemStatsService rethrows upstream errors', async () => {
  const stub = new StubStudyService();
  stub.shouldThrow = Object.assign(new Error('db unavailable'), { status: 503 });
  const service = createService({ study: stub });

  await assert.rejects(() => service.getUserStats(3), (error) => {
    assert.equal(error.status, 503);
    assert.match(error.message, /db unavailable/);
    return true;
  });
});
