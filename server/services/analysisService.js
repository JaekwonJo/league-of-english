/**
 * Analysis service
 * Encapsulates analysis business logic
 */

const database = require('../models/database');
const DocumentAnalyzer = require('../utils/documentAnalyzer');

class AnalysisService {
  constructor() {
    this.analyzer = new DocumentAnalyzer();
  }

  // List documents available for analysis
  async getDocumentList(userId, userRole) {
    try {
      let documents;
      if (userRole === 'admin') {
        documents = await database.all('SELECT id, title, type, category, school, grade, created_at FROM documents ORDER BY created_at DESC');
      } else {
        const user = await database.get('SELECT school, grade FROM users WHERE id = ?', [userId]);
        const school = user?.school || '';
        const grade = user?.grade || null;
        documents = await database.all(
          `SELECT d.id, d.title, d.type, d.category, d.school, d.grade, d.created_at
           FROM documents d
           WHERE EXISTS (
             SELECT 1 FROM passage_analyses pa
             WHERE pa.document_id = d.id AND pa.published = 1 AND (
               pa.visibility_scope = 'public' OR
               (pa.visibility_scope = 'school' AND (? <> '' AND (d.school = ? OR d.school IS NULL OR d.school = '' OR d.school IN ('전체','all')))) OR
               (pa.visibility_scope = 'grade' AND (? IS NOT NULL AND d.grade = ?)) OR
               (pa.visibility_scope = 'group' AND EXISTS (
                  SELECT 1 FROM analysis_group_permissions agp
                  JOIN user_groups ug ON ug.group_name = agp.group_name AND ug.user_id = ?
                  WHERE agp.analysis_id = pa.id
               ))
             )
           )
           ORDER BY d.created_at DESC`,
          [school, school, grade, grade, userId]
        );
      }

      return { success: true, data: documents, message: `총 ${documents.length}개의 문서가 있습니다.` };
    } catch (error) {
      throw new Error(`문서 목록 조회 실패: ${error.message}`);
    }
  }

  // Get all analyzed passages for a document
  async getAnalyzedPassages(documentId) {
    try {
      const rows = await database.all(
        'SELECT * FROM passage_analyses WHERE document_id = ? ORDER BY passage_number',
        [documentId]
      );

      if (!rows || rows.length === 0) {
        return { success: true, data: [], message: '아직 분석된 지문이 없습니다.' };
      }

      const formatted = rows.map(r => this.formatPassageAnalysis(r));
      return { success: true, data: formatted, total: formatted.length };
    } catch (error) {
      throw new Error(`분석된 지문 조회 실패: ${error.message}`);
    }
  }

  // Analyze a single passage (admin only)
  async analyzePassage(documentId, passageNumber, userRole) {
    try {
      if (userRole !== 'admin') {
        throw new Error('관리자만 분석을 수행할 수 있습니다.');
      }

      // Return cached if exists
      const existing = await this.getPassageAnalysis(documentId, passageNumber);
      if (existing) {
        return { success: true, data: existing, cached: true };
      }

      const document = await database.get(
        'SELECT * FROM documents WHERE id = ?',
        [documentId]
      );
      if (!document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      const passages = this.extractPassages(document.content);
      if (passageNumber < 1 || passageNumber > passages.length) {
        throw new Error(`유효한 지문 번호가 아닙니다. (1-${passages.length})`);
      }

      const passage = passages[passageNumber - 1];
      console.log(`[analysis] analyzing passage ${passageNumber}...`);
      const analysis = await this.analyzer.analyzeIndividualPassage(passage, passageNumber);

      await this.savePassageAnalysis(documentId, passageNumber, passage, analysis);

      return {
        success: true,
        data: analysis,
        message: `지문 ${passageNumber} 분석이 완료되었습니다.`,
        totalPassages: passages.length,
        cached: false
      };
    } catch (error) {
      throw new Error(`지문 분석 실패: ${error.message}`);
    }
  }

  // Get a single passage analysis if present
  async getPassageAnalysis(documentId, passageNumber) {
    try {
      const row = await database.get(
        'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
        [documentId, passageNumber]
      );
      if (!row) return null;
      return this.formatPassageAnalysis(row);
    } catch (error) {
      throw new Error(`지문 분석 조회 실패: ${error.message}`);
    }
  }

  // Extract passages array from stored JSON content
  extractPassages(content) {
    try {
      const parsed = JSON.parse(content);
      return parsed.passages || [];
    } catch {
      throw new Error('문서 형식이 올바르지 않습니다.');
    }
  }

  // Persist a passage analysis
  async savePassageAnalysis(documentId, passageNumber, passage, analysis) {
    const dbData = this.analyzer.formatForDatabase(analysis);
    await database.run(
      `INSERT OR REPLACE INTO passage_analyses 
       (document_id, passage_number, original_passage, summary, key_points, vocabulary, grammar_points, study_guide, comprehension_questions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        passageNumber,
        passage,
        dbData.summary,
        dbData.key_points,
        dbData.vocabulary,
        dbData.grammar_points,
        dbData.study_guide,
        dbData.comprehension_questions
      ]
    );
    console.log(`[analysis] passage ${passageNumber} analysis saved`);
  }

  // Convert DB row to API shape used by frontend
  formatPassageAnalysis(dbAnalysis) {
    return {
      passageNumber: dbAnalysis.passage_number,
      originalPassage: dbAnalysis.original_passage,
      sentenceAnalysis: JSON.parse(dbAnalysis.key_points || '[]'),
      deepAnalysis: JSON.parse(dbAnalysis.grammar_points || '{}'),
      keyExpressions: JSON.parse(dbAnalysis.vocabulary || '[]'),
      examplesAndBackground: JSON.parse(dbAnalysis.study_guide || '{}'),
      comprehensive: JSON.parse(dbAnalysis.comprehension_questions || '{}'),
      createdAt: dbAnalysis.created_at
    };
  }

  // Get existing analyses or create them for all passages
  async getOrCreateAnalysis(documentId) {
    try {
      // Prefer returning passage-level analyses if present
      const existing = await this.getAnalyzedPassages(documentId);
      if (existing.data && existing.data.length > 0) {
        return { success: true, data: existing.data, cached: true };
      }

      const document = await database.get(
        'SELECT * FROM documents WHERE id = ?',
        [documentId]
      );
      if (!document) throw new Error('문서를 찾을 수 없습니다.');

      console.log('[analysis] running analysis for all passages...');
      const results = await this.analyzer.analyzeIndividualPassages(document.content);

      const saved = [];
      for (const item of results) {
        await this.savePassageAnalysis(documentId, item.passageNumber, item.originalPassage, item);
        saved.push(item);
      }

      return {
        success: true,
        data: saved,
        message: `총 ${saved.length}개 지문을 분석했습니다.`,
        cached: false
      };
    } catch (error) {
      throw new Error(`문서 분석 실패: ${error.message}`);
    }
  }
}

module.exports = new AnalysisService();
