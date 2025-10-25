/**
 * Analysis service
 * Encapsulates analysis business logic
 */

const database = require('../models/database');
const DocumentAnalyzer = require('../utils/documentAnalyzer');
const { MAX_VARIANTS_PER_PASSAGE } = require('../utils/documentAnalyzer');

const FEEDBACK_ACTIONS = {
  HELPFUL: 'helpful',
  REPORT: 'report'
};

const FEEDBACK_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
};

class AnalysisService {
  constructor() {
    this.analyzer = new DocumentAnalyzer();
  }

  // List documents available for analysis
  async getDocumentList(userId, userRole) {
    try {
      let documents;
      if (userRole === 'admin') {
        documents = await database.all(
          `SELECT id, title, type, category, school, grade, created_at
           FROM documents
           WHERE LOWER(COALESCE(type, '')) <> 'vocabulary'
           ORDER BY created_at DESC`
        );
      } else {
        const user = await database.get('SELECT school, grade FROM users WHERE id = ?', [userId]);
        const school = user?.school || '';
        const grade = user?.grade || null;
        // 학생/일반 사용자에게는 다음 조건의 문서 노출(어휘 제외):
        // - 관리자 작성 문서
        // - 문서가 공개/발행 상태
        // - 학교가 전체/내 학교
        // - 분석 데이터가 존재하는 문서(공개 여부 무관, 온보딩 편의)
        documents = await database.all(
          `SELECT d.id, d.title, d.type, d.category, d.school, d.grade, d.created_at
             FROM documents d
            WHERE LOWER(COALESCE(d.type, '')) <> 'vocabulary'
              AND (
                    d.created_by IN (SELECT id FROM users WHERE role = 'admin')
                 OR COALESCE(d.published, 0) = 1
                 OR LOWER(COALESCE(d.visibility_scope, '')) IN ('public','전체','all')
                 OR COALESCE(d.school, '') IN ('', '전체', 'all', ?)
                 OR EXISTS (SELECT 1 FROM passage_analyses pa WHERE pa.document_id = d.id)
              )
            ORDER BY d.created_at DESC`,
          [school]
        );
      }

      return { success: true, data: documents, message: `총 ${documents.length}개의 문서가 있습니다.` };
    } catch (error) {
      throw new Error(`문서 목록 조회 실패: ${error.message}`);
    }
  }

  // Get all analyzed passages for a document
  async getAnalyzedPassages(documentId, userId = null) {
    try {
      const rows = await database.all(
        'SELECT * FROM passage_analyses WHERE document_id = ? ORDER BY passage_number',
        [documentId]
      );

      if (!rows || rows.length === 0) {
        return { success: true, data: [], message: '아직 분석된 지문이 없습니다.' };
      }

      const formatted = [];
      for (const row of rows) {
        const base = this.formatPassageAnalysis(row);
        const enriched = await this._attachFeedbackMetadata(documentId, base.passageNumber, base.variants, userId);
        formatted.push({ ...base, variants: enriched });
      }
      return { success: true, data: formatted, total: formatted.length };
    } catch (error) {
      throw new Error(`분석된 지문 조회 실패: ${error.message}`);
    }
  }

  async getPassageList(documentId) {
    const document = await database.get('SELECT id, content FROM documents WHERE id = ?', [documentId]);
    if (!document) {
      throw new Error('문서를 찾을 수 없습니다.');
    }

    const passages = this.extractPassages(document.content);
    const existingRows = await database.all(
      'SELECT passage_number, variants, updated_at FROM passage_analyses WHERE document_id = ?',
      [documentId]
    );

    const existingMap = new Map();
    existingRows.forEach((row) => {
      try {
        const formatted = this.analyzer.formatFromDatabase(row);
        const variants = Array.isArray(formatted?.variants) ? formatted.variants : [];
        existingMap.set(row.passage_number, {
          variantCount: variants.length,
          updatedAt: row.updated_at,
          variants
        });
      } catch (error) {
        console.warn('[analysis] failed to parse existing variants:', error?.message || error);
        existingMap.set(row.passage_number, {
          variantCount: 0,
          updatedAt: row.updated_at,
          variants: []
        });
      }
    });

    const list = passages.map((text, index) => {
      const passageNumber = index + 1;
      const existing = existingMap.get(passageNumber) || null;
      const clean = String(text || '');
      const wordCount = clean.trim().length
        ? clean.trim().split(/\s+/).filter(Boolean).length
        : 0;
      return {
        passageNumber,
        excerpt: this._buildExcerpt(text),
        text: clean,
        wordCount,
        charCount: clean.length,
        analyzed: Boolean(existing),
        variantCount: existing?.variantCount || 0,
        variants: existing?.variants || [],
        updatedAt: existing?.updatedAt || null,
        remainingSlots: Math.max(0, MAX_VARIANTS_PER_PASSAGE - (existing?.variantCount || 0))
      };
    });

    return {
      success: true,
      total: list.length,
      data: list
    };
  }

  // Analyze a single passage (admin only)
  async analyzePassage(documentId, passageNumber, userRole) {
    try {
      if (userRole !== 'admin' && userRole !== 'teacher') {
        throw new Error('분석 생성을 수행하려면 교사 이상 권한이 필요합니다.');
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

      const existing = await this.getPassageAnalysis(documentId, passageNumber);
      if (existing?.variants?.length >= MAX_VARIANTS_PER_PASSAGE) {
        return {
          success: true,
          data: existing,
          cached: true,
          message: '이미 두 개의 분석본이 준비되어 있어요.'
        };
      }

      console.log(`[analysis] analyzing passage ${passageNumber}...`);
      const analysis = await this.analyzer.analyzeIndividualPassage(passage, passageNumber);

      const { allVariants } = await this.appendVariants(documentId, passageNumber, passage, [analysis]);
      const enrichedVariants = await this._attachFeedbackMetadata(documentId, passageNumber, allVariants, null);

      return {
        success: true,
        data: {
          passageNumber,
          originalPassage: passage,
          variants: enrichedVariants
        },
        message: `지문 ${passageNumber} 분석이 완료되었습니다.`,
        totalPassages: passages.length,
        cached: false
      };
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('OpenAI not configured')) {
        const friendly = 'OpenAI API 키가 아직 설정되지 않아서 분석본을 만들 수 없어요. 환경 변수 OPENAI_API_KEY를 확인해 주세요.';
        const err = new Error(friendly);
        err.code = 'OPENAI_MISSING';
        throw err;
      }
      throw new Error(`지문 분석 실패: ${message}`);
    }
  }

  async analyzePassages(documentId, passageNumbers = [], userRole, userId) {
    if (userRole !== 'admin' && userRole !== 'teacher') {
      throw new Error('분석 생성을 수행하려면 교사 이상 권한이 필요합니다.');
    }

    if (!Array.isArray(passageNumbers) || passageNumbers.length === 0) {
      throw new Error('분석할 지문을 선택해 주세요.');
    }

    const uniqueNumbers = [...new Set(passageNumbers
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1))];

    if (!uniqueNumbers.length) {
      throw new Error('유효한 지문 번호가 없습니다.');
    }

    if (uniqueNumbers.length > 3) {
      throw new Error('한 번에 최대 3개의 지문만 분석할 수 있어요.');
    }

    const outcomes = [];
    const failures = [];

    for (const passageNumber of uniqueNumbers) {
      try {
        const result = await this.generateVariants(documentId, passageNumber, 1, userRole, userId);
        const generatedCount = Array.isArray(result.generated) ? result.generated.length : 0;
        outcomes.push({
          passageNumber,
          generatedCount,
          message: result.message,
          data: result.data
        });
      } catch (error) {
        failures.push({
          passageNumber,
          message: String(error?.message || error)
        });
      }
    }

    return {
      success: outcomes.length > 0,
      requested: uniqueNumbers.length,
      outcomes,
      failures
    };
  }

  async generateVariants(documentId, passageNumber, count = 1, userRole, userId) {
    if (userRole !== 'admin' && userRole !== 'teacher') {
      throw new Error('분석 생성을 수행하려면 교사 이상 권한이 필요합니다.');
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
    const existing = await this.getPassageAnalysis(documentId, passageNumber);
    const existingCount = existing?.variants?.length || 0;
    if (existingCount >= MAX_VARIANTS_PER_PASSAGE) {
      return {
        success: true,
        data: existing,
        generated: [],
        message: '이미 두 개의 분석본이 있어서 더 이상 생성할 필요가 없어요.'
      };
    }

    const sanitizedCount = Math.min(Math.max(Number(count) || 1, 1), MAX_VARIANTS_PER_PASSAGE - existingCount);
    const generated = [];

    for (let i = 0; i < sanitizedCount; i += 1) {
      console.log(`[analysis] generating variant ${existingCount + i + 1}/${MAX_VARIANTS_PER_PASSAGE} for passage ${passageNumber}`);
      const analysis = await this.analyzer.analyzeIndividualPassage(passage, passageNumber);
      generated.push(analysis);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    const { allVariants } = await this.appendVariants(documentId, passageNumber, passage, generated);
    const enrichedVariants = await this._attachFeedbackMetadata(documentId, passageNumber, allVariants, userId || null);

    return {
      success: true,
      data: {
        passageNumber,
        originalPassage: passage,
        variants: enrichedVariants
      },
      generated,
      message: `${generated.length}개의 분석본을 새로 만들었어요.`
    };
  }

  // Get a single passage analysis if present
  async getPassageAnalysis(documentId, passageNumber, userId = null) {
    try {
      const row = await database.get(
        'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
        [documentId, passageNumber]
      );
      if (!row) return null;
      const base = this.formatPassageAnalysis(row);
      const variants = await this._attachFeedbackMetadata(documentId, passageNumber, base.variants, userId);
      return { ...base, variants };
    } catch (error) {
      throw new Error(`지문 분석 조회 실패: ${error.message}`);
    }
  }

  async getPassageVariants(documentId, passageNumber) {
    return this.getPassageAnalysis(documentId, passageNumber);
  }

  async recordAnalysisView(userId, documentId, passageNumber) {
    const user = await database.get('SELECT membership, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    const membership = String(user.membership || 'free').toLowerCase();
    const role = String(user.role || 'student').toLowerCase();

    const isUnlimited = role === 'admin' || role === 'teacher' || membership === 'premium' || membership === 'pro';
    if (!isUnlimited) {
      const row = await database.get(
        `SELECT COUNT(*) AS count
         FROM view_logs
         WHERE user_id = ?
           AND resource_type = 'analysis-view'
           AND DATE(created_at) = DATE('now')`,
        [userId]
      );
      const viewedToday = Number(row?.count || 0);
      if (viewedToday >= 10) {
        throw Object.assign(new Error('무료 회원은 하루 10개의 분석본만 열람할 수 있어요. 프리미엄으로 업그레이드하면 무제한으로 볼 수 있습니다! ✨'), {
          code: 'ANALYSIS_VIEW_LIMIT'
        });
      }
    }

    await database.run(
      `INSERT INTO view_logs (user_id, resource_type, resource_id, document_id, passage_number)
       VALUES (?, 'analysis-view', ?, ?, ?)`,
      [userId, `${documentId}-${passageNumber}`, documentId, passageNumber]
    );
  }

  async removeVariant(documentId, passageNumber, variantIndex, userRole, userId = null) {
    if (userRole !== 'admin') {
      throw new Error('분석본 삭제는 관리자만 할 수 있어요.');
    }

    const targetIndex = Number(variantIndex);
    if (!Number.isInteger(targetIndex) || targetIndex < 1) {
      throw new Error('삭제할 분석본 번호가 올바르지 않습니다.');
    }

    const row = await database.get(
      'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
      [documentId, passageNumber]
    );

    if (!row) {
      throw new Error('삭제할 분석본을 찾을 수 없습니다.');
    }

    const formatted = this.analyzer.formatFromDatabase(row);
    const variants = Array.isArray(formatted?.variants) ? [...formatted.variants] : [];
    if (!variants.length) {
      throw new Error('등록된 분석본이 없습니다.');
    }

    if (targetIndex > variants.length) {
      throw new Error(`분석본 ${targetIndex}번을 찾지 못했어요.`);
    }

    variants.splice(targetIndex - 1, 1);
    const reindexed = variants.map((variant, idx) => ({
      ...variant,
      variantIndex: idx + 1
    }));

    await database.run(
      'DELETE FROM analysis_feedback WHERE document_id = ? AND passage_number = ? AND variant_index = ?',
      [documentId, passageNumber, targetIndex]
    );

    if (reindexed.length === 0) {
      await database.run('DELETE FROM analysis_feedback WHERE document_id = ? AND passage_number = ?', [documentId, passageNumber]);
      await database.run('DELETE FROM analysis_group_permissions WHERE analysis_id = ?', [row.id]);
      await database.run('DELETE FROM passage_analyses WHERE id = ?', [row.id]);
      return {
        success: true,
        data: {
          passageNumber,
          originalPassage: formatted.originalPassage,
          variants: []
        },
        message: '분석본을 삭제했고, 더 남은 분석본이 없어서 기록을 정리했습니다.'
      };
    }

    await database.run(
      'UPDATE analysis_feedback SET variant_index = variant_index - 1 WHERE document_id = ? AND passage_number = ? AND variant_index > ?',
      [documentId, passageNumber, targetIndex]
    );

    const dbPayload = this.analyzer.formatForDatabase(reindexed);
    await database.run(
      `UPDATE passage_analyses
         SET original_passage = ?, summary = ?, key_points = ?, vocabulary = ?, grammar_points = ?, study_guide = ?, comprehension_questions = ?, variants = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        formatted.originalPassage,
        dbPayload.summary,
        dbPayload.key_points,
        dbPayload.vocabulary,
        dbPayload.grammar_points,
        dbPayload.study_guide,
        dbPayload.comprehension_questions,
        dbPayload.variants,
        row.id
      ]
    );

    const enriched = await this._attachFeedbackMetadata(documentId, passageNumber, reindexed, userId);
    return {
      success: true,
      data: {
        passageNumber,
        originalPassage: formatted.originalPassage,
        variants: enriched
      },
      message: `분석본 ${targetIndex}번을 삭제했어요.`
    };
  }

  async submitFeedback({ documentId, passageNumber, variantIndex, userId, action, reason }) {
    if (!Number.isInteger(variantIndex) || variantIndex < 1) {
      throw new Error('어떤 분석본에 대한 의견인지 알 수 없어요. 다시 시도해 주세요.');
    }

    if (action === FEEDBACK_ACTIONS.HELPFUL) {
      const existing = await database.get(
        `SELECT id FROM analysis_feedback
         WHERE document_id = ? AND passage_number = ? AND variant_index = ? AND user_id = ? AND action = ?`,
        [documentId, passageNumber, variantIndex, userId, FEEDBACK_ACTIONS.HELPFUL]
      );

      if (existing) {
        await database.run('DELETE FROM analysis_feedback WHERE id = ?', [existing.id]);
      } else {
        await database.run(
          `INSERT INTO analysis_feedback (document_id, passage_number, variant_index, user_id, action, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [documentId, passageNumber, variantIndex, userId, FEEDBACK_ACTIONS.HELPFUL, 'active']
        );
      }
    } else if (action === FEEDBACK_ACTIONS.REPORT) {
      const trimmedReason = String(reason || '').trim();
      if (!trimmedReason) {
        throw new Error('신고 사유를 입력해 주세요.');
      }

      const existing = await database.get(
        `SELECT id FROM analysis_feedback
         WHERE document_id = ? AND passage_number = ? AND variant_index = ? AND user_id = ? AND action = ?`,
        [documentId, passageNumber, variantIndex, userId, FEEDBACK_ACTIONS.REPORT]
      );

      if (existing) {
        await database.run(
          `UPDATE analysis_feedback
             SET reason = ?, status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [trimmedReason, FEEDBACK_STATUS.PENDING, existing.id]
        );
      } else {
        await database.run(
          `INSERT INTO analysis_feedback (document_id, passage_number, variant_index, user_id, action, reason, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [documentId, passageNumber, variantIndex, userId, FEEDBACK_ACTIONS.REPORT, trimmedReason, FEEDBACK_STATUS.PENDING]
        );
      }
    } else {
      throw new Error('지원하지 않는 피드백 종류입니다.');
    }

    const refreshed = await this.getPassageAnalysis(documentId, passageNumber, userId);
    return {
      success: true,
      data: refreshed
    };
  }

  async listPendingFeedback() {
    const rows = await database.all(
      `SELECT f.id, f.document_id, f.passage_number, f.variant_index, f.user_id, f.reason, f.status, f.created_at,
              d.title AS documentTitle
         FROM analysis_feedback f
         LEFT JOIN documents d ON d.id = f.document_id
        WHERE f.action = ? AND f.status = ?
        ORDER BY f.created_at DESC
        LIMIT 100`,
      [FEEDBACK_ACTIONS.REPORT, FEEDBACK_STATUS.PENDING]
    );
    return {
      success: true,
      data: rows || []
    };
  }

  async updateFeedbackStatus(feedbackId, status = FEEDBACK_STATUS.RESOLVED) {
    const normalized = String(status || '').toLowerCase();
    if (!Object.values(FEEDBACK_STATUS).includes(normalized)) {
      throw new Error('지원하지 않는 상태값입니다.');
    }

    const result = await database.run(
      `UPDATE analysis_feedback
         SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND action = ?`,
      [normalized, feedbackId, FEEDBACK_ACTIONS.REPORT]
    );

    if (!result?.changes) {
      throw new Error('해당 신고를 찾을 수 없습니다.');
    }

    return { success: true };
  }

  async _attachFeedbackMetadata(documentId, passageNumber, variants = [], userId = null) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return [];
    }

    const summaryMap = await this._loadFeedbackSummary(documentId, passageNumber);
    const userMap = userId ? await this._loadUserFeedback(documentId, passageNumber, userId) : new Map();

    return variants.map((variant) => {
      const idx = variant.variantIndex;
      const stats = summaryMap.get(idx) || { helpfulCount: 0, reportCount: 0 };
      const user = userMap.get(idx) || { helpful: false, report: null };
      return {
        ...variant,
        stats,
        user
      };
    });
  }

  async _loadFeedbackSummary(documentId, passageNumber) {
    const rows = await database.all(
      `SELECT variant_index, action, status, COUNT(*) AS count
         FROM analysis_feedback
        WHERE document_id = ? AND passage_number = ?
        GROUP BY variant_index, action, status`,
      [documentId, passageNumber]
    );

    const map = new Map();
    rows.forEach((row) => {
      const idx = Number(row.variant_index);
      if (!Number.isInteger(idx)) return;
      const entry = map.get(idx) || { helpfulCount: 0, reportCount: 0 };
      if (row.action === FEEDBACK_ACTIONS.HELPFUL) {
        entry.helpfulCount += Number(row.count || 0);
      } else if (row.action === FEEDBACK_ACTIONS.REPORT && row.status !== FEEDBACK_STATUS.DISMISSED) {
        entry.reportCount += Number(row.count || 0);
      }
      map.set(idx, entry);
    });
    return map;
  }

  async _loadUserFeedback(documentId, passageNumber, userId) {
    const rows = await database.all(
      `SELECT id, variant_index, action, reason, status
         FROM analysis_feedback
        WHERE document_id = ? AND passage_number = ? AND user_id = ?`,
      [documentId, passageNumber, userId]
    );

    const map = new Map();
    rows.forEach((row) => {
      const idx = Number(row.variant_index);
      if (!Number.isInteger(idx)) return;
      const entry = map.get(idx) || { helpful: false, report: null };
      if (row.action === FEEDBACK_ACTIONS.HELPFUL) {
        entry.helpful = true;
      } else if (row.action === FEEDBACK_ACTIONS.REPORT) {
        entry.report = {
          id: row.id,
          status: row.status,
          reason: row.reason || ''
        };
      }
      map.set(idx, entry);
    });
    return map;
  }

  // Extract passages array from stored JSON content
  extractPassages(content) {
    if (!content) {
      throw new Error('문서에 저장된 내용이 없습니다.');
    }

    // 최신 문서는 JSON 구조를 사용합니다.
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.passages) && parsed.passages.length > 0) {
        return parsed.passages.map((passage) => String(passage || '').trim()).filter(Boolean);
      }
    } catch (jsonError) {
      // fall through to legacy handling
    }

    // 과거 문서는 순수 텍스트로 저장된 경우가 있어요. 문단 단위로 분리해 사용합니다.
    const text = String(content || '').trim();
    if (!text) {
      throw new Error('문서에 저장된 내용이 없습니다.');
    }

    const segments = text
      .split(/\n{2,}/)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    if (segments.length > 0) {
      return segments;
    }

    // 문단 단위로 나누지 못하면 전체 텍스트를 단일 지문으로 사용합니다.
    return [text];
  }

  _buildExcerpt(passage) {
    const clean = String(passage || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean.length <= 120) {
      return clean;
    }
    return `${clean.slice(0, 120)}…`;
  }

  // Persist variants for a passage (up to 2 slots)
  async appendVariants(documentId, passageNumber, passage, variants = []) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return { newVariants: [], allVariants: [] };
    }

    const existingRow = await database.get(
      'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
      [documentId, passageNumber]
    );

    let existingVariants = [];
    if (existingRow) {
      const formatted = this.analyzer.formatFromDatabase(existingRow);
      existingVariants = Array.isArray(formatted.variants) ? formatted.variants : [];
    }

    const availableSlots = MAX_VARIANTS_PER_PASSAGE - existingVariants.length;
    if (availableSlots <= 0) {
      return { newVariants: [], allVariants: existingVariants };
    }

    const normalizedIncoming = variants
      .slice(0, availableSlots)
      .map((variant, index) => ({
        ...variant,
        variantIndex: existingVariants.length + index + 1,
        generatedAt: variant.generatedAt || new Date().toISOString(),
        generator: variant.generator || 'openai'
      }));

    const mergedVariants = [...existingVariants, ...normalizedIncoming];
    const dbPayload = this.analyzer.formatForDatabase(mergedVariants);

    if (existingRow) {
      await database.run(
        `UPDATE passage_analyses
         SET original_passage = ?, summary = ?, key_points = ?, vocabulary = ?, grammar_points = ?, study_guide = ?, comprehension_questions = ?, variants = ?, updated_at = CURRENT_TIMESTAMP
         WHERE document_id = ? AND passage_number = ?`,
        [
          passage,
          dbPayload.summary,
          dbPayload.key_points,
          dbPayload.vocabulary,
          dbPayload.grammar_points,
          dbPayload.study_guide,
          dbPayload.comprehension_questions,
          dbPayload.variants,
          documentId,
          passageNumber
        ]
      );
    } else {
      await database.run(
        `INSERT INTO passage_analyses
         (document_id, passage_number, original_passage, summary, key_points, vocabulary, grammar_points, study_guide, comprehension_questions, variants)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          passageNumber,
          passage,
          dbPayload.summary,
          dbPayload.key_points,
          dbPayload.vocabulary,
          dbPayload.grammar_points,
          dbPayload.study_guide,
          dbPayload.comprehension_questions,
          dbPayload.variants
        ]
      );
    }

    console.log(`[analysis] passage ${passageNumber} variants saved (${mergedVariants.length}/${MAX_VARIANTS_PER_PASSAGE})`);

    return {
      newVariants: normalizedIncoming,
      allVariants: mergedVariants
    };
  }

  // Convert DB row to API shape used by frontend
  formatPassageAnalysis(dbAnalysis) {
    const formatted = this.analyzer.formatFromDatabase(dbAnalysis);
    return {
      passageNumber: formatted.passageNumber,
      originalPassage: formatted.originalPassage,
      variants: formatted.variants,
      createdAt: formatted.createdAt
    };
  }

  // Get existing analyses or create them for all passages
  async getOrCreateAnalysis(documentId, userId = null) {
    try {
      const existing = await this.getAnalyzedPassages(documentId, userId);
      if (existing.data && existing.data.length > 0) {
        return { success: true, data: existing.data, cached: true };
      }

      const document = await database.get(
        'SELECT * FROM documents WHERE id = ?',
        [documentId]
      );
      if (!document) throw new Error('문서를 찾을 수 없습니다.');

      console.log('[analysis] running analysis for all passages...');
      const passages = this.extractPassages(document.content);
      const saved = [];

      for (let index = 0; index < passages.length; index += 1) {
        const passage = passages[index];
        const analysis = await this.analyzer.analyzeIndividualPassage(passage, index + 1);
        const { allVariants } = await this.appendVariants(documentId, index + 1, passage, [analysis]);
        const enriched = await this._attachFeedbackMetadata(documentId, index + 1, allVariants, userId);
        saved.push({
          passageNumber: index + 1,
          originalPassage: passage,
          variants: enriched
        });
      }

      return {
        success: true,
        data: saved,
        message: `총 ${saved.length}개 지문을 분석했습니다.`,
        cached: false
      };
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('OpenAI not configured')) {
        const friendly = 'OpenAI API 키가 아직 설정되지 않아서 분석본을 만들 수 없어요. 환경 변수 OPENAI_API_KEY를 확인해 주세요.';
        const err = new Error(friendly);
        err.code = 'OPENAI_MISSING';
        throw err;
      }
      throw new Error(`문서 분석 실패: ${message}`);
    }
  }
}

module.exports = new AnalysisService();
