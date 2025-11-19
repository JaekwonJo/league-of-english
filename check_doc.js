const database = require('./server/models/database');

(async () => {
  await database.connect();
  const doc = await database.get("SELECT id, title FROM documents WHERE title LIKE '%2-24-10%' OR code LIKE '%2-24-10%'");
  if (doc) {
    console.log(`Found document: ID ${doc.id}, Title: ${doc.title}`);
  } else {
    console.log('Document 2-24-10 not found. You might need to upload it first or specify another ID.');
    // Fallback: List all docs to pick one
    const all = await database.all("SELECT id, title FROM documents LIMIT 5");
    console.log('Available documents:', all);
  }
  process.exit(0);
})();
