CREATE TABLE IF NOT EXISTS exam_problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  exam_title TEXT,
  question_number INTEGER,
  question_type TEXT,
  question_text TEXT,
  passage TEXT,
  options_json TEXT,
  answer TEXT,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_problems_doc_id ON exam_problems(document_id);
