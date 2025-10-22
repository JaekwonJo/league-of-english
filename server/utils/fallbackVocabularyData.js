const curated = require('./data/fallback-vocabulary.json');
const vocab2024 = require('./data/wolgo-2024-03-vocabulary.json');
const vocab2022b = require('./data/wolgo-2022-09-vocabulary-set2.json');

module.exports = [
  ...curated,
  ...vocab2024,
  ...vocab2022b
];
