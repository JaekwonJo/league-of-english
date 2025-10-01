const tierConfig = require('../config/tierConfig.json');

function getTierInfo(points = 0) {
  const numeric = Number(points) || 0;
  return (
    tierConfig.tiers.find(
      (tier) => numeric >= tier.minLP && (tier.maxLP === -1 || numeric <= tier.maxLP)
    ) || tierConfig.tiers[0]
  );
}

function getNextTier(currentTier) {
  if (!currentTier) return null;
  const index = tierConfig.tiers.findIndex((tier) => tier.id === currentTier.id);
  if (index === -1) return null;
  return tierConfig.tiers[index + 1] || null;
}

function calculateProgress(points = 0, currentTier, nextTier) {
  if (!currentTier) return 0;
  const numeric = Number(points) || 0;
  if (!nextTier) return 100;
  const range = nextTier.minLP - currentTier.minLP;
  if (range <= 0) return 100;
  const progress = numeric - currentTier.minLP;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

module.exports = {
  getTierInfo,
  getNextTier,
  calculateProgress
};
