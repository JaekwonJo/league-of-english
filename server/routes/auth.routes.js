const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');
const { logAuthEvent, EVENT_TYPES } = require('../services/auditLogService');

/**
 * POST /api/register
 * ?Œì›ê°€??
 */
router.post('/register', async (req, res) => {
  const { username, password, email, name, school, grade, role = 'student' } = req.body;
  
  try {
    // ì¤‘ë³µ ?•ì¸
    const existing = await database.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existing) {
      return res.status(400).json({ message: '?´ë? ì¡´ìž¬?˜ëŠ” ?„ì´???ëŠ” ?´ë©”?¼ìž…?ˆë‹¤.' });
    }
    
    // ë¹„ë?ë²ˆí˜¸ ?´ì‹±
    const hashedPassword = await hashPassword(password);
    
    // ?¬ìš©???ì„±
    const result = await database.run(
      `INSERT INTO users (username, password_hash, email, name, school, grade, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, email, name, school, grade, role]
    );
    
    await logAuthEvent({
      userId: result.id || null,
      username,
      eventType: EVENT_TYPES.REGISTER,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      metadata: { email, role, grade }
    });

    res.status(201).json({
      message: '?Œì›ê°€?…ì´ ?„ë£Œ?˜ì—ˆ?µë‹ˆ??',
      userId: result.id
    });
  } catch (error) {
    console.error('?Œì›ê°€???¤ë¥˜:', error);
    res.status(500).json({ message: '?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.' });
  }
});

/**
 * POST /api/login
 * ë¡œê·¸??
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // ?¬ìš©??ì¡°íšŒ (password ì»¬ëŸ¼ ?¬ìš©)
    const user = await database.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (!user) {
      return res.status(401).json({ message: '?„ì´???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤.' });
    }
    
    // ë¹„ë?ë²ˆí˜¸ ?•ì¸
    let isValid = false;
    try {
      isValid = await verifyPassword(password, user.password_hash);
    } catch (bcryptError) {
      console.error('ë¹„ë?ë²ˆí˜¸ ê²€ì¦??¤ë¥˜:', bcryptError);
      // ?´ì‹œ?˜ì? ?Šì? ë¹„ë?ë²ˆí˜¸?????ˆìœ¼ë¯€ë¡?ì§ì ‘ ë¹„êµ
      if (password === user.password) {
        isValid = true;
        // ë¹„ë?ë²ˆí˜¸ë¥??´ì‹±?˜ì—¬ ?…ë°?´íŠ¸
        const hashedPassword = await hashPassword(password);
        await database.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, user.id]
        );
        console.log('ë¹„ë?ë²ˆí˜¸ ?´ì‹± ?…ë°?´íŠ¸ ?„ë£Œ:', username);
      }
    }
    
    if (!isValid) {
      return res.status(401).json({ message: '?„ì´???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤.' });
    }
    
    // ? í° ?ì„±
    const token = generateToken(user);
    
    // ë¹„ë?ë²ˆí˜¸ ?œê±°
    delete user.password_hash;
    
    await logAuthEvent({
      userId: user.id,
      username: user.username,
      eventType: EVENT_TYPES.LOGIN,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      metadata: { role: user.role, membership: user.membership, success: true }
    });

    res.json({
      message: 'ë¡œê·¸???±ê³µ',
      token: token,
      user: user
    });
  } catch (error) {
    console.error('ë¡œê·¸???¤ë¥˜ ?ì„¸:', error.message, error.stack);
    res.status(500).json({ message: '?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.' });
  }
});

/**
 * POST /api/logout
 * ë¡œê·¸?„ì›ƒ (?´ë¼?´ì–¸?¸ì—??? í° ?? œ)
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'ë¡œê·¸?„ì›ƒ ?˜ì—ˆ?µë‹ˆ??' });
});

module.exports = router;



