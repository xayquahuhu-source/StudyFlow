# StudyFlow v01

Personal Academic Planner + AI Study Assistant (tùy chọn) — dành cho sinh viên PFIEV,
Trường Đại học Bách khoa, Đại học Đà Nẵng. Chạy hoàn toàn ở trình duyệt, không cần
server, không cần build step.

## Chạy thử

Mở thẳng file `index.html` bằng trình duyệt (double-click), hoặc dùng một static
server đơn giản nếu trình duyệt chặn `file://`:

```bash
npx serve .
# hoặc
python3 -m http.server 8080
```

## Cấu trúc

```
StudyFlow/
├── index.html      # toàn bộ giao diện (dashboard, lịch tuần, môn học, deadline, tasks, notes, AI)
├── style.css        # theme tối, tối giản, lấy cảm hứng thị giác từ "Kage" — chỉ dùng CSS thuần
├── app.js           # toàn bộ logic: state, localStorage, render, CRUD
├── ai-service.js    # lớp trung gian gọi AI — KHÔNG chứa API key
└── README.md
```

## Dữ liệu

Lưu hoàn toàn trong `localStorage` của trình duyệt, dưới các khóa `sf_subjects`,
`sf_calendarEvents`, `sf_deadlines`, `sf_tasks`, `sf_notes`. Đóng/mở lại trình duyệt
dữ liệu vẫn còn. Nút **Reset dữ liệu** ở sidebar sẽ xóa sạch và nạp lại dữ liệu demo
(có xác nhận trước khi xóa).

## AI Study Assistant — Hoạt động thế nào

AI Study Assistant trong StudyFlow được thiết kế như một **trợ lý học tập thông minh cá nhân**, có giao diện hội thoại (Chat) hiện đại và đọc trực tiếp bối cảnh dữ liệu thực từ hệ thống:

1. **Hiểu toàn diện dữ liệu StudyFlow (Context-aware):**
   - Đọc tự động số lượng môn học, deadline sắp tới, danh sách task và lịch học tuần.
   - Khi người dùng hỏi: *"Hôm nay tôi nên học gì?"*, *"Kiểm tra deadline"*, *"Tạo kế hoạch hôm nay"*, AI sẽ phân tích dựa trên deadline gần nhất, các nhiệm vụ chưa xong và lịch cá nhân để đưa ra câu trả lời có cấu trúc và thứ tự ưu tiên rõ ràng.

2. **Đề xuất hành động tương tác (Interactive Action Proposals):**
   - AI có thể đề xuất tạo Task, tạo Deadline, lập kế hoạch học vào Lịch tuần, hoặc chuyển Ghi chú thành Task.
   - **Bảo đảm an toàn dữ liệu:** Mọi hành động làm thay đổi dữ liệu đều có thẻ đề xuất và nút **✓ Xác nhận** để người dùng chủ động duyệt trước khi lưu vào StudyFlow.

3. **Chế độ hoạt động & Kết nối AI thật (Pluggable Provider):**
   - **Mặc định (Offline - Quy tắc nội bộ):** Trợ lý hoạt động hoàn toàn offline, phân tích bối cảnh dữ liệu cục bộ, nhanh, bảo mật và miễn phí 100%. Giao diện hiển thị rõ trạng thái `Offline (Quy tắc nội bộ)`.
   - **Kết nối AI thật (Tùy chọn):** Có thể nhập URL proxy backend/serverless (Cloudflare Worker, Vercel, v.v.) vào mục **Cài đặt**. AI sẽ gửi `{ prompt, context }` tới backend đó mà không bao giờ lộ API key ở frontend. Khi kết nối thành công, trạng thái sẽ tự động đổi sang `Online (API đã kết nối)`.

4. **Lưu trữ & Lịch sử hội thoại:**
   - Lịch sử chat được lưu tự động trong `localStorage` (`sf_ai_chat`).
   - Có nút **Đoạn chat mới** để làm mới cuộc trò chuyện bất kỳ lúc nào mà không làm ảnh hưởng đến dữ liệu môn học, deadline hay task.

## Model dữ liệu (Calendar event)

```js
{
  id: "...",
  day: "monday",          // monday..sunday
  period: "morning",      // morning | afternoon | evening | null
  title: "Tự học",
  type: "study",          // class | study | task | exam | other
  start: null,             // chỉ có giá trị nếu người dùng ghi rõ giờ
  end: null,
  subjectId: null,
  source: "manual"         // "manual" hoặc "ai"
}
```

## Roadmap gợi ý (không bắt buộc)

- Kết nối AI thật qua một serverless proxy nhỏ.
- Chức năng C ở bản đặc tả gốc: đề xuất kế hoạch từ Lịch + Deadline — để dành cho
  bản sau, không cần cho v01.
- Thêm biểu đồ 3D/hiệu ứng nếu vẫn còn dư ngân sách hiệu năng — nhưng chỉ sau khi
  toàn bộ chức năng quản lý học tập đã chạy ổn định.
