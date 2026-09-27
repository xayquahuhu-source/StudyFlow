/* =====================================================================
   StudyFlow — Local Node.js Server & AI Chat Proxy (server.js)
   ---------------------------------------------------------------------
   1. Phục vụ toàn bộ giao diện StudyFlow tại http://localhost:3000
   2. Cung cấp API Proxy bảo mật tại POST /api/chat:
      - Đọc GEMINI_API_KEY từ file .env hoặc biến môi trường server
      - Chạy trực tiếp trên IP máy bạn (Việt Nam - được Google hỗ trợ 100%)
      - KHÔNG bao giờ để lộ API Key ra frontend
      - Trò chuyện tự do, nhớ ngữ cảnh cuộc trò chuyện (multi-turn)
   ===================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Đọc file .env đơn giản không cần cài thư viện ngoài
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        value = value.replace(/^['"](.*)['"]$/, '$1').trim();
        process.env[match[1]] = value;
      }
    });
  }
}
loadEnv();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function buildSystemInstruction(context) {
  const username = context?.username || 'Đạt Ngô';
  const today = context?.currentDate || new Date().toISOString().slice(0, 10);
  const dow = context?.currentDow || 'Chủ nhật';

  const subjects = (context?.subjects || []).map(s => `- ID: [${s.id}] | Tên môn: "${s.name}" | Mã: ${s.code || '—'}`).join('\n') || 'Chưa có môn học nào.';
  const deadlines = (context?.deadlines || []).map(d =>
    `- ID: [${d.id}] | Tiêu đề: "${d.title}" | Môn ID: ${d.subjectId || 'null'} | Hạn: ${d.date} ${d.time || ''} | Trạng thái: ${d.status}`
  ).join('\n') || 'Không có deadline nào.';
  const tasks = (context?.tasks || []).map(t =>
    `- ID: [${t.id}] | Tiêu đề: "${t.title}" | Môn ID: ${t.subjectId || 'null'} | Hạn: ${t.dueDate || 'Hôm nay'} | Trạng thái: ${t.status}`
  ).join('\n') || 'Không có task nào.';
  const notes = (context?.notes || []).map(n =>
    `- ID: [${n.id}] | Nội dung: "${n.text}" | Đã xử lý: ${n.processed ? 'Có' : 'Chưa'}`
  ).join('\n') || 'Không có ghi chú nào.';

  return `
Bạn là AI Study Assistant – Trợ lý học tập thông minh của sinh viên ${username} trong ứng dụng StudyFlow.

=== THÔNG TIN THỜI GIAN HIỆN TẠI ===
- Hôm nay là: ${today} (${dow})
- Quy ước tính ngày chuẩn từ ${today}:
  + "Hôm nay": ${today}
  + "Tối nay": ${today} lúc 21:00 hoặc 23:59
  + "Ngày mai" / "Mai": ngày kế tiếp (+1 ngày)
  + "Thứ 2 tuần sau": ngày thứ Hai của tuần tới (+7 hoặc +8 ngày tùy theo hôm nay)
  + Luôn tính ra ngày cụ thể chính xác theo định dạng chuẩn ISO: YYYY-MM-DD.

=== DỮ LIỆU HIỆN TẠI TRONG STUDYFLOW CỦA SINH VIÊN ===
1. Danh sách Môn học:
${subjects}

2. Danh sách Deadline (có ID để tra cứu/xóa):
${deadlines}

3. Danh sách Task:
${tasks}

4. Ghi chú (Notes):
${notes}

=== 2 CHẾ ĐỘ PHẢN HỒI (BẮT BUỘC TUÂN THỦ) ===

1. CHẾ ĐỘ CHAT TỰ DO:
   - Áp dụng khi người dùng hỏi kiến thức, hỏi thăm, giải thích bài, xin lời khuyên:
     Ví dụ: "Xin chào", "Giải thích đạo hàm cho tôi", "Tôi không hiểu bài này", "PFIEV là gì?", "Phương pháp học tiếng Pháp B1", "Hôm nay tôi nên học gì?".
   - Hành vi:
     * Trả lời tự nhiên, nhiệt tình, dễ hiểu, dùng Markdown (**in đậm**, *in nghiêng*, danh sách, code block \`\`\` nếu cần).
     * actions: [] (mảng rỗng, TUYỆT ĐỐI KHÔNG tạo action nào).

2. CHẾ ĐỘ ĐIỀU KHIỂN STUDYFLOW:
   - Áp dụng khi người dùng yêu cầu thao tác dữ liệu:
     Ví dụ: "Thêm deadline tiếng Pháp thứ 2 tuần sau", "Tạo task làm bài Giải tích", "Xóa deadline tiếng Pháp vừa tạo", "Chuyển note thành task", "Thêm ca tự học...".
   - Hành vi:
     * NẾU THÔNG TIN ĐÃ ĐỦ RÕ RÀNG:
       - Tạo action tương ứng trong mảng \`actions\`.
       - Trong phần \`text\`: Mô tả ngắn gọn thông tin bạn đã chuẩn bị, và mời người dùng kiểm tra thông tin rồi bấm nút **Xác nhận** bên dưới để áp dụng vào hệ thống.
       - **TUYỆT ĐỐI KHÔNG NÓI** "Tôi đã thêm..." hay "Đã xóa thành công..." trong lời nói vì thao tác CHƯA được thực thi cho đến khi người dùng bấm nút Xác nhận!
     * NẾU THÔNG TIN KHÔNG RÕ RÀNG (ví dụ chỉ nói "thêm deadline cho tôi" nhưng không rõ môn hay ngày hạn):
       - actions: [] (KHÔNG đoán mò).
       - Trong \`text\`: Hỏi lại người dùng môn học và thời hạn cụ thể.

=== CÁC LOẠI ACTION ĐƯỢC HỖ TRỢ ===
1. "create_deadline":
   summary: "Thêm deadline: Tiêu đề (Hạn: YYYY-MM-DD)",
   data: {
     title: "Tên bài tập/deadline (VD: Bài tập tiếng Pháp)",
     subjectId: "ID môn học khớp từ danh sách ở trên hoặc null",
     subjectName: "Tên môn học (VD: Tiếng Pháp)",
     date: "YYYY-MM-DD",
     time: "HH:MM (mặc định 23:59)",
     priority: "high" | "med" | "low",
     note: "Ghi chú thêm nếu có"
   }

2. "delete_deadline":
   summary: "Xóa deadline: Tên deadline",
   data: {
     id: "ID của deadline cần xóa (tìm đúng ID từ danh sách Deadline ở trên)",
     title: "Tên deadline",
     date: "Ngày hạn"
   }

3. "create_task":
   summary: "Thêm task: Tên task",
   data: {
     title: "Tên task",
     subjectId: "ID môn học hoặc null",
     subjectName: "Tên môn học",
     dueDate: "YYYY-MM-DD",
     priority: "high" | "med" | "low"
   }

4. "delete_task":
   summary: "Xóa task: Tên task",
   data: {
     id: "ID của task cần xóa",
     title: "Tên task"
   }

5. "create_event":
   summary: "Thêm ca học vào Lịch tuần",
   data: {
     title: "Tiêu đề ca học",
     day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
     period: "morning" | "afternoon" | "evening",
     start: "HH:MM",
     end: "HH:MM",
     loc: "Địa điểm"
   }

6. "convert_note":
   summary: "Chuyển ghi chú thành task",
   data: {
     noteId: "ID của note",
     title: "Tiêu đề task rút ra từ note",
     subjectId: "ID môn học hoặc null",
     subjectName: "Tên môn"
   }

=== FORMAT ĐẦU RA BẮT BUỘC (JSON DUY NHẤT) ===
{
  "text": "Câu trả lời tự nhiên của bạn bằng tiếng Việt (hỗ trợ Markdown)",
  "actions": [
    {
      "id": "act_random8char",
      "type": "create_deadline" | "delete_deadline" | "create_task" | "delete_task" | "create_event" | "convert_note",
      "summary": "Mô tả ngắn gọn",
      "data": { ... }
    }
  ]
}
`.trim();
}

async function handleChat(req, res) {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sendJson(res, 500, {
      error: 'Chưa cấu hình GEMINI_API_KEY trên server.',
      details: 'Vui lòng mở file .env trong thư mục dự án và điền: GEMINI_API_KEY=your_key_here',
    });
  }

  let bodyStr = '';
  req.on('data', chunk => { bodyStr += chunk; });
  req.on('end', async () => {
    try {
      const body = JSON.parse(bodyStr || '{}');
      const prompt = (body.prompt || '').trim();
      const context = body.context || {};
      const history = Array.isArray(body.history) ? body.history : [];

      if (!prompt) {
        return sendJson(res, 400, { error: 'Thiếu trường "prompt".' });
      }

      console.log('[StudyFlow Server] User prompt:', prompt);

      // Xây dựng conversation history (multi-turn)
      const contents = [
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
        })),
        { role: 'user', parts: [{ text: prompt }] },
      ];

      const geminiPayload = {
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(context) }],
        },
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
        },
      };

      const CANDIDATE_MODELS = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
      ];

      let lastError = null;
      let lastStatus = 500;
      let replyRaw = null;
      let successModel = null;

      for (const model of CANDIDATE_MODELS) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          const geminiRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(geminiPayload),
          });

          if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.warn(`[StudyFlow Server] Model ${model} returned HTTP ${geminiRes.status}`);
            lastError = errText;
            lastStatus = geminiRes.status;
            continue;
          }

          const geminiData = await geminiRes.json();
          replyRaw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyRaw) {
            successModel = model;
            break;
          }
        } catch (fetchErr) {
          console.warn(`[StudyFlow Server] Model ${model} network error:`, fetchErr.message);
          lastError = fetchErr.message;
        }
      }

      if (!replyRaw) {
        let userFriendlyMsg = `Gemini API gặp sự cố (mã lỗi ${lastStatus})`;
        try {
          const errObj = JSON.parse(lastError || '{}');
          if (lastStatus === 429) {
            userFriendlyMsg = 'Bạn đang chạm giới hạn tần suất gửi tin của Google (Rate Limit 429). Vui lòng đợi khoảng 30 giây rồi bấm "Thử lại" nhé!';
          } else if (errObj.error?.message) {
            userFriendlyMsg = errObj.error.message;
          }
        } catch {}
        return sendJson(res, lastStatus === 429 ? 429 : 502, {
          error: userFriendlyMsg,
          details: lastError,
        });
      }

      // Parse JSON output
      let parsed = null;
      try {
        parsed = JSON.parse(replyRaw);
      } catch {
        const stripped = replyRaw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        try {
          parsed = JSON.parse(stripped);
        } catch {
          parsed = { text: replyRaw, actions: [] };
        }
      }

      const replyText = parsed.text || 'Đã xử lý thông tin của bạn.';
      const actions = Array.isArray(parsed.actions) ? parsed.actions : [];

      console.log(`[StudyFlow Server] [${successModel}] Reply:`, replyText.slice(0, 80));
      if (actions.length) console.log(`[StudyFlow Server] [${successModel}] Actions:`, actions.length);

      return sendJson(res, 200, {
        text: replyText,
        actions,
        model: successModel,
        source: 'gemini',
      });
    } catch (err) {
      console.error('[StudyFlow Server] Exception:', err);
      return sendJson(res, 500, {
        error: 'Lỗi xử lý tại server.',
        details: err.message,
      });
    }
  });
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);

  // Route API Chat
  if (parsedUrl.pathname === '/api/chat' && req.method === 'POST') {
    return handleChat(req, res);
  }

  // Route Health check
  if (parsedUrl.pathname === '/api/health') {
    loadEnv();
    return sendJson(res, 200, {
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  }

  // Phục vụ Static files
  let reqPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  let filePath = path.join(__dirname, reqPath);

  // Bảo mật: ngăn chặn directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[StudyFlow] Server running at http://localhost:${PORT}`);
});
