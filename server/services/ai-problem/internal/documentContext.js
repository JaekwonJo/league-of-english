async function getDocumentContext(database, documentId) {
  const doc = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
  if (!doc) {
    throw new Error('Document not found');
  }

  let passages = [];
  let parsedContent = null;

  try {
    parsedContent = JSON.parse(doc.content);
    if (Array.isArray(parsedContent?.passages) && parsedContent.passages.length > 0) {
      passages = parsedContent.passages
        .map((value) => String(value || '').trim())
        .filter((value) => value.length > 0);
    }
  } catch (error) {
    parsedContent = null;
  }

  if (!passages.length) {
    passages = String(doc.content || '')
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 40);
  }

  if (!passages.length && doc.content) {
    passages = [String(doc.content)];
  }

  return { document: doc, passages, parsedContent };
}

module.exports = {
  getDocumentContext
};
