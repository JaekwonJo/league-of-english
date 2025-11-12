'use strict';

const database = require('../models/database');
const { generateToken, hashPassword } = require('../middleware/auth');

function getClientBaseUrl() {
  const envUrl = process.env.CLIENT_BASE_URL || process.env.FRONTEND_BASE_URL || '';
  if (envUrl) return envUrl.replace(/\/?$/, '');
  // Fallback to Vercel preview/prod domain if not configured
  return 'https://league-of-english.vercel.app';
}

function getKakaoConfig() {
  const cfg = {
    clientId: process.env.KAKAO_REST_API_KEY || '',
    clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    redirectUri: process.env.KAKAO_REDIRECT_URI || '',
    scope: process.env.KAKAO_SCOPE || 'profile_nickname'
  };
  return cfg;
}

function isConfigured() {
  const { clientId, redirectUri } = getKakaoConfig();
  return Boolean(clientId && redirectUri);
}

function buildAuthorizeUrl(state = '') {
  const { clientId, redirectUri, scope } = getKakaoConfig();
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri
  });
  if (state) q.set('state', state);
  if (scope) q.set('scope', scope);
  return `https://kauth.kakao.com/oauth/authorize?${q.toString()}`;
}

async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri } = getKakaoConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`kakao token error: ${res.status} ${text}`);
  }
  return res.json();
}

async function fetchKakaoUser(accessToken) {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`kakao me error: ${res.status} ${text}`);
  }
  return res.json();
}

function sanitizeUserRow(user) {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password;
  delete clone.password_hash;
  return clone;
}

async function findOrCreateUserFromKakao(profile) {
  const kakaoId = profile?.id;
  if (!kakaoId) throw new Error('kakao profile missing id');
  const emailRaw = String(profile?.kakao_account?.email || '').trim().toLowerCase() || null;
  const email = emailRaw || `kakao_${kakaoId}@no-email.local`;
  const nickname = profile?.kakao_account?.profile?.nickname || `카카오_${kakaoId}`;

  // Prefer linking by email if present
  let user = null;
  if (emailRaw) {
    user = await database.get('SELECT * FROM users WHERE LOWER(email) = ?', [emailRaw]);
  }
  if (!user) {
    user = await database.get('SELECT * FROM users WHERE username = ?', [`kakao_${kakaoId}`]);
  }

  if (!user) {
    const hashed = await hashPassword(`kakao_${kakaoId}_${Date.now()}`);
    const insert = await database.run(
      `INSERT INTO users (username, password_hash, email, name, school, grade, role, membership, email_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        `kakao_${kakaoId}`,
        hashed,
        email,
        nickname,
        'League of English',
        1,
        'student',
        'free',
        emailRaw ? 1 : 0
      ]
    );
    user = await database.get('SELECT * FROM users WHERE id = ?', [insert.id]);
  }

  return sanitizeUserRow(user);
}

async function buildCallbackRedirect(user) {
  const token = generateToken(user);
  const base = getClientBaseUrl();
  const qs = new URLSearchParams({ oauth: 'kakao', token });
  return `${base}/login?${qs.toString()}`;
}

module.exports = {
  isConfigured,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchKakaoUser,
  findOrCreateUserFromKakao,
  buildCallbackRedirect,
  getClientBaseUrl
};
