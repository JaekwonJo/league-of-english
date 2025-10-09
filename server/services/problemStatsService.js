const studyService = require('./studyService');

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class ProblemStatsService {
  constructor({ study = studyService } = {}) {
    this.study = study;
  }

  async getUserStats(userId) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw createHttpError(400, 'userId is required to fetch study stats.');
    }

    const stats = await this.study.getUserStats(numericUserId);
    if (!stats || typeof stats !== 'object') {
      return {
        totalProblems: 0,
        totalCorrect: 0,
        accuracy: 0,
        totalSessions: 0,
        weeklySessions: 0,
        perType: []
      };
    }
    return stats;
  }
}

const defaultInstance = new ProblemStatsService();

module.exports = {
  ProblemStatsService,
  getUserStats: defaultInstance.getUserStats.bind(defaultInstance),
  problemStatsService: defaultInstance,
};
