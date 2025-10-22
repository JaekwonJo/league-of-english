const base2022 = require('./data/wolgo-2022-09-grammar.json');
const base2022b = require('./data/wolgo-2022-09-grammar-set2.json');
const march2024 = require('./data/wolgo-2024-03-grammar.json');

module.exports = [
  ...base2022,
  ...base2022b,
  ...march2024
];
