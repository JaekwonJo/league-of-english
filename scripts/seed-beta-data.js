#!/usr/bin/env node

/**
 * Seed script for beta QA data
 * - Creates demo teacher/student accounts with tiers
 * - Inserts a sample document and generates fallback analyses
 * - Seeds vocabulary problems tagged with metadata.seedTag
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const database = require('../server/models/database');
const config = require('../server/config/server.config.json');
const { getTierInfo } = require('../server/utils/tierUtils');
const analysisService = require('../server/services/analysisService');
const { buildVocabularyFallbackProblems, warmupWordnet } = require('../server/utils/documentProblemFallback');
const fallbackVocabularyBank = require('../server/utils/data/fallback-vocabulary.json');

const SEED_TAG = 'beta-seed-20251020';

const seedUsers = [
  {
    username: 'beta-teacher',
    password: 'teach1234!',
    email: 'teacher@beta.loe',
    name: '베타 담임 선생님',
    school: 'League Academy',
    grade: 3,
    role: 'teacher',
    membership: 'premium',
    points: 7200
  },
  {
    username: 'beta-student-iron',
    password: 'student123!',
    email: 'iron@beta.loe',
    name: '아이언 학생',
    school: 'League Academy',
    grade: 1,
    role: 'student',
    membership: 'free',
    points: 450
  },
  {
    username: 'beta-student-silver',
    password: 'student123!',
    email: 'silver@beta.loe',
    name: '실버 학생',
    school: 'League Academy',
    grade: 2,
    role: 'student',
    membership: 'standard',
    points: 2400
  },
  {
    username: 'beta-student-gold',
    password: 'student123!',
    email: 'gold@beta.loe',
    name: '골드 학생',
    school: 'League Academy',
    grade: 3,
    role: 'student',
    membership: 'premium',
    points: 3600
  },
  {
    username: 'beta-student-platinum',
    password: 'student123!',
    email: 'platinum@beta.loe',
    name: '플래티넘 학생',
    school: 'League Academy',
    grade: 3,
    role: 'student',
    membership: 'premium',
    points: 7800
  }
];

const passageOne = `When you are working in healthcare, it is important to develop a solid professional relationship with your patients. By establishing realistic self-boundaries, you can protect that relationship. It is important to keep the focus on the patient. When working with patients who are seen frequently, it is easy to start to think of them as friends. With a friend, you are likely to share personal information that is not appropriate with a patient. Patients may feel that they cannot share important health-related information because you are their friend, and it would be embarrassing to share that information. Self-boundaries can also be thought of as professional boundaries. You need to treat patients with respect and keep the relationship professional. Be friendly to patients and always keep the focus on the patient.`;

const passageTwo = `Mentors in our beta program walk alongside you with detailed checklists and gentle reminders. They start by clarifying the learning goal, underline the expressions students must notice, and model how to deliver comforting feedback. When an analysis looks awkward, they demonstrate how to delete the variant, request a fresh draft, and record the reason for future QA. This rhythm helps keep every analysis polished and makes the ranking board a fair reflection of effort.`;

const documentDefinitions = [
  {
    title: '베타 테스트 오리엔테이션',
    code: 'beta-orientation',
    type: 'analysis',
    category: '공지',
    school: 'League Academy',
    grade: 2,
    difficulty: 'medium',
    owner: 'beta-teacher',
    passages: [passageOne, passageTwo]
  }
];

function isoDaysFromNow(days) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

async function upsertUser(user) {
  const tierInfo = getTierInfo(user.points || 0);
  const hashed = await bcrypt.hash(user.password, config.auth.saltRounds);
  const existing = await database.get('SELECT id FROM users WHERE username = ?', [user.username]);
  const membershipExpiresAt = isoDaysFromNow(90);

  if (existing?.id) {
    await database.run(
      `UPDATE users
       SET password_hash = ?, email = ?, name = ?, school = ?, grade = ?, role = ?, membership = ?, membership_expires_at = ?,
           points = ?, tier = ?, email_verified = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        hashed,
        user.email,
        user.name,
        user.school,
        user.grade,
        user.role,
        user.membership,
        membershipExpiresAt,
        user.points,
        tierInfo.name,
        existing.id
      ]
    );
    return { id: existing.id, action: 'updated', tier: tierInfo.name };
  }

  const insertResult = await database.run(
    `INSERT INTO users
       (username, password_hash, email, name, school, grade, role, membership, membership_expires_at, points, tier, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    , [
      user.username,
      hashed,
      user.email,
      user.name,
      user.school,
      user.grade,
      user.role,
      user.membership,
      membershipExpiresAt,
      user.points,
      tierInfo.name
    ]
  );

  return { id: insertResult.id, action: 'inserted', tier: tierInfo.name };
}

async function resolveOwnerId(ownerUsername) {
  const owner = await database.get('SELECT id FROM users WHERE username = ?', [ownerUsername]);
  if (!owner?.id) {
    throw new Error(`문서를 생성할 교사(${ownerUsername}) 계정을 찾을 수 없습니다.`);
  }
  return owner.id;
}

async function seedDocument(analysisService, definition) {
  const ownerId = await resolveOwnerId(definition.owner);
  const payload = {
    title: definition.title,
    content: JSON.stringify({
      title: definition.code,
      passages: definition.passages
    }),
    type: definition.type,
    category: definition.category,
    school: definition.school,
    grade: definition.grade,
    difficulty: definition.difficulty,
    created_by: ownerId
  };

  const existing = await database.get('SELECT id FROM documents WHERE title = ?', [definition.title]);
  let documentId;
  if (existing?.id) {
    documentId = existing.id;
    await database.run(
      `UPDATE documents
       SET content = ?, type = ?, category = ?, school = ?, grade = ?, difficulty = ?, worksheet_type = NULL,
           created_by = ?
       WHERE id = ?`,
      [
        payload.content,
        payload.type,
        payload.category,
        payload.school,
        payload.grade,
        payload.difficulty,
        ownerId,
        documentId
      ]
    );
  } else {
    const insert = await database.run(
      `INSERT INTO documents (title, content, type, category, school, grade, difficulty, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      , [
        payload.title,
        payload.content,
        payload.type,
        payload.category,
        payload.school,
        payload.grade,
        payload.difficulty,
        ownerId
      ]
    );
    documentId = insert.id;
  }

  // Reset previous analyses for idempotent runs
  await database.run('DELETE FROM passage_analyses WHERE document_id = ?', [documentId]);

  const generated = [];
  for (let index = 0; index < definition.passages.length; index += 1) {
    const passageNumber = index + 1;
    const result = await analysisService.analyzePassage(documentId, passageNumber, 'admin');
    generated.push({ passageNumber, cached: result?.cached || false });

    await database.run(
      'UPDATE passage_analyses SET published = 1, visibility_scope = ?, updated_at = CURRENT_TIMESTAMP WHERE document_id = ? AND passage_number = ?',
      ['public', documentId, passageNumber]
    );
  }

  return { documentId, generated };
}

async function seedVocabularyProblems(documentId, docTitle, passages) {
  await warmupWordnet();
  let problems = await buildVocabularyFallbackProblems({
    passages,
    count: 2,
    docTitle,
    reasonTag: 'beta-seed'
  });

  if (!problems.length) {
    problems = fallbackVocabularyBank.slice(0, 2).map((item, index) => ({
      ...item,
      question: item.question || '다음 글의 밑줄 중 낱말의 쓰임이 어색한 것은?',
      sourceLabel: item.sourceLabel || `출처│${docTitle}`,
      metadata: {
        ...(item.metadata || {}),
        fallbackReason: 'beta-seed-curated'
      },
      seedIndex: index
    }));
  }

  await database.run('DELETE FROM problems WHERE document_id = ? AND metadata LIKE ?', [documentId, `%"seedTag":"${SEED_TAG}"%`]);

  let inserted = 0;
  for (const problem of problems) {
    const metadata = {
      ...problem.metadata,
      seedTag: SEED_TAG,
      sourceDocTitle: docTitle
    };

    await database.run(
      `INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, main_text, metadata, is_ai_generated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
      , [
        documentId,
        problem.type || 'vocabulary',
        problem.question,
        JSON.stringify(problem.options),
        problem.answer,
        problem.explanation,
        problem.difficulty || 'csat-advanced',
        problem.mainText,
        JSON.stringify(metadata)
      ]
    );
    inserted += 1;
  }

  return inserted;
}

async function main() {
  const started = Date.now();
  await database.connect();

  const userResults = [];
  for (const user of seedUsers) {
    const result = await upsertUser(user);
    userResults.push({ username: user.username, ...result });
  }

  const docResults = [];
  for (const definition of documentDefinitions) {
    const documentSeed = await seedDocument(analysisService, definition);
    const vocabCount = await seedVocabularyProblems(documentSeed.documentId, definition.title, definition.passages);
    docResults.push({
      title: definition.title,
      documentId: documentSeed.documentId,
      passagesSeeded: documentSeed.generated.length,
      vocabularyProblems: vocabCount
    });
  }

  const duration = Date.now() - started;
  const summary = {
    startedAt: new Date(started).toISOString(),
    durationMs: duration,
    users: userResults,
    documents: docResults
  };

  await database.close();

  await writeSeedLog(summary);
  await notifyWebhook(summary);

  console.log('✅ Beta seed completed in', `${duration}ms`);
  console.log('👥 Users:');
  userResults.forEach((entry) => {
    console.log(`  - ${entry.username} (${entry.action}, tier ${entry.tier}, id ${entry.id})`);
  });
  console.log('📚 Documents:');
  docResults.forEach((doc) => {
    console.log(`  - ${doc.title} (id ${doc.documentId}) → passages ${doc.passagesSeeded}, vocab ${doc.vocabularyProblems}`);
  });
}

main().catch(async (error) => {
  console.error('❌ Beta seed failed:', error?.message || error);
  try {
    await database.close();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});

function ensureLogsDir() {
  const override = process.env.SEED_LOG_FILE;
  if (override) {
    const dir = path.dirname(override);
    fs.mkdirSync(dir, { recursive: true });
    return override;
  }
  const logDir = path.join(__dirname, '..', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, 'beta-seed-last.json');
}

async function writeSeedLog(payload) {
  try {
    const target = ensureLogsDir();
    fs.writeFileSync(target, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.warn('[beta-seed] failed to write log file:', error?.message || error);
  }
}

async function notifyWebhook(summary) {
  const url = process.env.SEED_WEBHOOK_URL;
  if (!url) return;
  try {
    const payload = {
      text: `✅ beta seed finished in ${summary.durationMs}ms\n👥 Users: ${summary.users.length}\n📚 Documents: ${summary.documents.length}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Beta seed 완료* (${new Date(summary.startedAt).toLocaleString()})\n• 실행 시간: ${summary.durationMs}ms\n• 사용자: ${summary.users.length}\n• 문서: ${summary.documents.length}`
          }
        }
      ]
    };
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn('[beta-seed] webhook notification failed:', error?.message || error);
  }
}
