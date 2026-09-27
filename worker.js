/* =====================================================================
   StudyFlow — Cloudflare Worker AI Proxy (worker.js)
   ---------------------------------------------------------------------
   Model: gemini-3.8-flash
   Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent
   API key: stored only in Cloudflare Worker Secret "GEMINI_API_KEY"
   ===================================================================== */

const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function buildSystemInstruction(context) {
  const username = context.username || 'bạn';
  const today = context.currentDate || new Date().toISOString().slice(0, 10);
  const dow = context.currentDow || 'Chủ nhật';

  const subjects = (context.subjects || []).map(s => `- ${s.name}`).join('\n') || 'Chưa có thông tin.';
  const deadlines = (context.deadlines || []).filter(d => d.status !== 'done').map(d =>
    `- ${d.title} (Hạn: ${d.date} ${d.time || ''})`
  ).join('\n') || 'Không có deadline nào đang chờ.';
  const tasks = (context.tasks || []).filter(t => t.status !== 'done').map(t =>
    `- ${t.title} [${t.status}]`
  ).join('\n') || 'Không có task nào.';

  return `
Bạn là AI Study Assistant – Trợ lý học tập cá nhân thông minh và thân thiện của sinh viên ${username} trong ứng dụng StudyFlow.

NHIỆM VỤ CỦA BẠN:
1. Trò chuyện tự nhiên, nhiệt tình và thông minh như một chatbot AI học tập chuyên nghiệp (giống ChatGPT/Gemini).
2. Trả lời chi tiết, dễ hiểu mọi câu hỏi về kiến thức học thuật: Toán học, Giải tích, Kỹ thuật lập trình, Ngoại ngữ, Tiếng Pháp, Lịch sử, Kỹ năng tự học...
3. Khi người dùng nói "tôi không hiểu", "giải thích đơn giản hơn", hãy kiên nhẫn giảng giải từng bước, dùng ví dụ trực quan và so sánh gần gũi.
4. Khi người dùng hỏi về kế hoạch học tập, deadline hoặc môn học ("Hôm nay tôi nên học gì?", "Kiểm tra deadline...", "Tuần này tôi có gì?"), hãy tham khảo dữ liệu StudyFlow dưới đây để tư vấn thực tế:

=== THÔNG TIN STUDYFLOW HIỆN TẠI CỦA SINH VIÊN ===
- Tên sinh viên: ${username}
- Ngày hôm nay: ${today} (${dow})
- Các môn học đang học:
${subjects}
- Deadline đang chờ:
${deadlines}
- Nhiệm vụ (Task):
${tasks}

QUY TẮC BẮT BUỘC:
- Trả lời bằng văn bản tự nhiên, tiếng Việt chuẩn mực, hỗ trợ Markdown (**in đậm**, *in nghiêng*, danh sách gạch đầu dòng, code block \`\`\` nếu có code hoặc công thức).
- KHÔNG trả về định dạng JSON hay các thẻ action kỹ thuật. Hãy trò chuyện như một người bạn đồng hành học giỏi và tận tâm.
`.trim();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Thu thập thông tin hạ tầng an toàn (KHÔNG lộ API Key)
    const debugInfo = {
      colo: request.cf?.colo || null,
      country: request.cf?.country || null,
      city: request.cf?.city || null,
      cfRay: request.headers.get('cf-ray') || null,
    };

    // GET: Kiểm tra trạng thái Worker
    if (request.method === 'GET') {
      return json({
        status: 'StudyFlow Cloudflare Worker is running',
        model: GEMINI_MODEL,
        debug: debugInfo,
      }, 200);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Chỉ hỗ trợ POST request.', debug: debugInfo }, 405);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({
        error: 'Chưa cấu hình biến môi trường GEMINI_API_KEY trong Cloudflare Worker Secret.',
        debug: debugInfo
      }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Request body không phải JSON hợp lệ.', debug: debugInfo }, 400);
    }

    const userPrompt = (body.prompt || '').trim();
    if (!userPrompt) {
      return json({ error: 'Thiếu trường "prompt" trong request body.', debug: debugInfo }, 400);
    }
    const context = body.context || {};

    // Multi-turn conversation history
    const history = Array.isArray(body.history) ? body.history : [];
    const contents = [
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: buildSystemInstruction(context) }]
      },
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    };

    let geminiRes;
    try {
      geminiRes = await fetch(GEMINI_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(geminiPayload),
      });
    } catch (netErr) {
      return json({
        error: `Lỗi kết nối đến Gemini API: ${netErr.message}`,
        debug: {
          ...debugInfo,
          geminiHttpStatus: null,
          geminiRawError: netErr.message,
        }
      }, 502);
    }

    if (!geminiRes.ok) {
      let errText = '';
      try { errText = await geminiRes.text(); } catch {}
      return json({
        error: `Gemini API trả về lỗi ${geminiRes.status}`,
        details: errText,
        debug: {
          ...debugInfo,
          geminiHttpStatus: geminiRes.status,
          geminiRawError: errText,
        }
      }, 502);
    }

    let geminiData;
    try {
      geminiData = await geminiRes.json();
    } catch {
      return json({ error: 'Không thể parse response từ Gemini API.', debug: debugInfo }, 502);
    }

    const replyText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Tôi đã nhận được câu hỏi nhưng không thể tạo câu trả lời.';

    return json({
      text: replyText,
      source: 'gemini',
      debug: {
        ...debugInfo,
        geminiHttpStatus: geminiRes.status,
      }
    });
  },
};
