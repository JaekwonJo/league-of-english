const database = require('./server/models/database');

(async () => {
  await database.connect();
  const docs = await database.all("SELECT id, title FROM documents");
  console.log('All Documents:', docs);
  process.exit(0);
})();
