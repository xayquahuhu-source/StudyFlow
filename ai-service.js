/* =====================================================================
   StudyFlow — ai-service.js
   ---------------------------------------------------------------------
   Kiến trúc AI Service đơn giản, linh hoạt:
   Frontend StudyFlow -> aiService -> Backend AI Proxy -> AI Response -> Chatbot
   
   - Mặc định kết nối backend nội bộ qua /api/chat (chạy trực tiếp trên server local)
   - Người dùng cũng có thể trỏ tới bất kỳ backend proxy nào qua Cài đặt
   - Tuyệt đối không lưu API Key trong frontend
   - Không dùng Local Reasoning Engine hard-code trả lời giả
   ===================================================================== */

// Nếu endpoint cũ là Cloudflare Workers URL bị chặn geo, reset về local server
(function _resetCloudflareEndpoint() {
  const saved = localStorage.getItem('sf_ai_endpoint') || '';
  if (saved.includes('workers.dev') || saved.includes('xayquahuhu')) {
    localStorage.removeItem('sf_ai_endpoint');
    console.info('[StudyFlow AI] Cloudflare endpoint đã được reset về /api/chat (local server).');
  }
})();

const AI_CONFIG = {
  endpoint: localStorage.getItem('sf_ai_endpoint') || '/api/chat',
  timeoutMs: 30000,
};

/* ── Backward-compat: parse schedule text (heuristic cục bộ cho tính năng nhập lịch) ── */
const DAY_MAP = [
  { key: 'monday',    re: /th(ứ|u)\s*2\b/i },
  { key: 'tuesday',   re: /th(ứ|u)\s*3\b/i },
  { key: 'wednesday', re: /th(ứ|u)\s*4\b/i },
  { key: 'thursday',  re: /th(ứ|u)\s*5\b/i },
  { key: 'friday',    re: /th(ứ|u)\s*6\b/i },
  { key: 'saturday',  re: /th(ứ|u)\s*7\b/i },
  { key: 'sunday',    re: /ch(ủ|u)\s*nh(ậ|a)t/i },
];
const PERIOD_MAP = [
  { key: 'morning',   re: /\bsáng\b/i },
  { key: 'afternoon', re: /\bchi(ề|e)u\b/i },
  { key: 'evening',   re: /\bt(ố|o)i\b|đêm/i },
];
const AI_TYPE_KEYWORDS = [
  { type: 'class',   words: ['học ở trường', 'học trên trường', 'đi học', 'lên lớp'] },
  { type: 'task',    words: ['làm bài', 'bài tập', 'nộp bài', 'hạn'] },
  { type: 'exam',    words: ['thi ', 'kiểm tra', 'kt '] },
  { type: 'study',   words: ['ôn ', 'tự học', 'học ', 'luyện'] },
];

function classifyType(text) {
  const low = text.toLowerCase();
  for (const g of AI_TYPE_KEYWORDS)
    if (g.words.some(w => low.includes(w))) return g.type;
  return 'other';
}

function splitDayBlock(block) {
  const events = [];
  block.split(/(?<=[.;])\s+|\n+/).map(s => s.trim()).filter(Boolean).forEach(part => {
    let period = null;
    for (const p of PERIOD_MAP) if (p.re.test(part)) { period = p.key; break; }
    const timeMatch = part.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    let title = part.replace(/\bsáng\b|\bchi(ề|e)u\b|\bt(ố|o)i\b/gi, '').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').trim();
    if (!title) return;
    title = title.charAt(0).toUpperCase() + title.slice(1);
    events.push({ period, title, type: classifyType(part), start: null, end: null, timeHint: timeMatch?.[0] || null });
  });
  return events;
}

function localParseSchedule(text) {
  const lines = text.split(/\n/);
  const dayBlocks = [];
  let current = null;
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const hit = DAY_MAP.find(d => d.re.test(trimmed));
    if (hit) {
      current = { day: hit.key, raw: [] };
      dayBlocks.push(current);
      const rest = trimmed.replace(hit.re, '').replace(/^[:\s-]+/, '');
      if (rest) current.raw.push(rest);
      return;
    }
    if (!current) { current = { day: 'unspecified', raw: [] }; dayBlocks.push(current); }
    current.raw.push(trimmed);
  });
  return {
    byDay: dayBlocks.map(b => ({ day: b.day, events: splitDayBlock(b.raw.join(' ')) })).filter(b => b.events.length),
    source: 'local'
  };
}

function localParseNote(text) {
  const subjectMatch = text.match(/^([^,:.\n]{2,24})[:,]/);
  const items = Array.from(text.matchAll(/\b\d+(?:\.\d+)+\b/g)).map(m => m[0]);
  const dayHit = DAY_MAP.find(d => d.re.test(text));
  return { subject: subjectMatch?.[1]?.trim() || null, tasks: items, deadlineDay: dayHit?.key || null, rawText: text.trim(), source: 'local' };
}

/* ── Gọi Backend Chat ── */
async function callBackendChat(prompt, context, history) {
  const endpoint = AI_CONFIG.endpoint;
  if (!endpoint) {
    throw { type: 'no-endpoint', message: 'Chưa cấu hình AI Backend Endpoint.' };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_CONFIG.timeoutMs);

  // Tính ngày hiện tại để AI biết ngữ cảnh thời gian (thứ 2 tuần sau, v.v.)
  const nowDate = new Date();
  const DOW_VN = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const currentDate = nowDate.toISOString().slice(0, 10);
  const currentDow = DOW_VN[nowDate.getDay()];

  const payload = {
    prompt,
    context: {
      username: context?.username || 'Đạt Ngô',
      currentDate,
      currentDow,
      subjects: context?.subjects || [],
      deadlines: context?.deadlines || [],
      tasks: context?.tasks || [],
      notes: context?.notes || [],
      calendarEvents: context?.calendarEvents || [],
    },
    history: (history || []).slice(-14), // giữ 14 lượt hội thoại gần nhất
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw { type: 'api-error', status: res.status, message: `Server trả về HTTP ${res.status} nhưng không phải JSON.` };
    }

    if (!res.ok) {
      throw {
        type: 'api-error',
        status: res.status,
        message: data.error || `HTTP ${res.status}`,
        details: data.details,
        debug: data.debug,
      };
    }

    return {
      text: data.text || data.reply || 'AI đã xử lý xong.',
      actions: Array.isArray(data.actions) ? data.actions : [],
      source: data.source || 'remote',
    };
  } finally {
    clearTimeout(timer);
  }
}

/* =====================================================================
   aiService Public API
   ===================================================================== */
const aiService = {
  isOnline() {
    return !!AI_CONFIG.endpoint;
  },

  getEndpoint() {
    return AI_CONFIG.endpoint;
  },

  setEndpoint(url) {
    const clean = (url || '').trim();
    AI_CONFIG.endpoint = clean || '/api/chat';
    if (clean) {
      localStorage.setItem('sf_ai_endpoint', clean);
    } else {
      localStorage.removeItem('sf_ai_endpoint');
    }
  },

  /**
   * Chat tự do với AI (multi-turn, có context, không fake).
   * @param {string} prompt - Tin nhắn người dùng
   * @param {object} context - Dữ liệu StudyFlow
   * @param {Array} history - Lịch sử hội thoại [{role, content}]
   * @returns {Promise<{text: string}>}
   */
  async chat(prompt, context, history) {
    console.log('[StudyFlow AI] user prompt:', prompt);
    const result = await callBackendChat(prompt, context, history);
    console.log('[StudyFlow AI] response preview:', result.text?.slice(0, 100));
    return result;
  },

  /** Backward compat: parse schedule text */
  async parseSchedule(text) {
    return localParseSchedule(text);
  },

  /** Backward compat: parse note text */
  async parseNote(text) {
    return localParseNote(text);
  },
};
