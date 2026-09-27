/* =====================================================================
   StudyFlow — app.js
   Vanilla JS, no framework, no build step. Everything persists to
   localStorage. Optimized for modern dark UI and academic productivity.
   ===================================================================== */

const DAYS = [
  { key: 'monday',    label: 'Thứ 2' },
  { key: 'tuesday',   label: 'Thứ 3' },
  { key: 'wednesday', label: 'Thứ 4' },
  { key: 'thursday',  label: 'Thứ 5' },
  { key: 'friday',    label: 'Thứ 6' },
  { key: 'saturday',  label: 'Thứ 7' },
  { key: 'sunday',    label: 'Chủ nhật' },
];

const PERIOD_LABEL = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối', null: '' };
const PERIOD_ORDER = { morning: 0, afternoon: 1, evening: 2, null: 3, undefined: 3 };
const TYPE_LABEL = { class: 'Học ở trường', study: 'Tự học', task: 'Bài tập', exam: 'Thi/KT', other: 'Khác' };
const SUBJECT_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#e0231c'];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

/* ------------------------------------------------------------- Storage */
const STORE_KEYS = ['subjects', 'calendarEvents', 'deadlines', 'tasks', 'notes', 'aiChat'];
const state = {};

function load() {
  STORE_KEYS.forEach(k => {
    try { state[k] = JSON.parse(localStorage.getItem('sf_' + k)) || []; }
    catch (e) { state[k] = []; }
  });
  state.username = localStorage.getItem('sf_username') || 'Đạt Ngô';
}

function save(key) {
  localStorage.setItem('sf_' + key, JSON.stringify(state[key]));
}
function saveAll() { STORE_KEYS.forEach(save); }

function seedDemoIfEmpty() {
  if (state.subjects.length || state.calendarEvents.length || state.deadlines.length
      || state.tasks.length || state.notes.length) return;

  const subj = (name, code, color) => ({ id: uid(), name, code, color });
  state.subjects = [
    subj('Giải tích 1', 'MT1003', '#3b82f6'),
    subj('Kỹ thuật lập trình', 'IT1110', '#f59e0b'),
    subj('Hóa học', 'CH1001', '#10b981'),
    subj('Tiếng Pháp', 'FR1001', '#8b5cf6'),
    subj('Triết học Mác - Lênin', 'LL1001', '#ec4899'),
    subj('Nhập môn ngành & AI', 'IT1001', '#06b6d4'),
  ];
  const [gt, kt, hh, fr, th, aiSub] = state.subjects;

  state.tasks = [
    { id: uid(), title: 'Xem lại Leçon 2 - Tiếng Pháp', subjectId: fr.id, priority: 'high', dueDate: todayISO(), status: 'todo' },
    { id: uid(), title: 'Chép bài Leçon 3 - Tiếng Pháp', subjectId: fr.id, priority: 'med', dueDate: todayISO(), status: 'todo' },
    { id: uid(), title: 'Ôn Kỹ thuật lập trình', subjectId: kt.id, priority: 'med', dueDate: todayISO(), status: 'todo' },
    { id: uid(), title: 'Làm bài tập Toán', subjectId: gt.id, priority: 'low', dueDate: todayISO(), status: 'todo' },
  ];

  state.deadlines = [
    { id: uid(), title: 'Bài tập Tiếng Pháp', subjectId: fr.id, date: '2026-10-05', time: '23:59', priority: 'high', status: 'pending', note: 'Ngữ pháp Leçon 2-3' },
    { id: uid(), title: 'Bài tập chương 2', subjectId: gt.id, date: '2026-10-08', time: '23:59', priority: 'med', status: 'pending', note: 'Chương tích phân suy rộng' },
  ];

  state.notes = [
    { id: uid(), text: 'Hóa: Cô giao bài 3 phần Hóa đại cương.', subjectId: hh.id, processed: false },
  ];

  state.calendarEvents = [
    // Thứ 2
    { id: uid(), day: 'monday', period: 'afternoon', title: 'Học ở trường (Kỹ thuật lập trình)', type: 'class', start: '12:30', end: '15:20', subjectId: kt.id, loc: 'Đại học Bách khoa (F403)', source: 'manual' },
    { id: uid(), day: 'monday', period: 'evening', title: 'Viện Pháp', type: 'study', start: '19:30', end: '21:00', subjectId: fr.id, loc: 'Viện Pháp', source: 'manual' },
    // Thứ 3
    { id: uid(), day: 'tuesday', period: 'morning', title: 'Triết học Mác - Lênin', type: 'class', start: '07:00', end: '10:50', subjectId: th.id, loc: 'Đại học Bách khoa (F109)', source: 'manual' },
    { id: uid(), day: 'tuesday', period: 'afternoon', title: 'Tiếng Pháp 1', type: 'class', start: '12:30', end: '16:20', subjectId: fr.id, loc: 'Đại học Bách khoa (F408)', source: 'manual' },
    { id: uid(), day: 'tuesday', period: 'evening', title: 'Làm bài Giải tích', type: 'study', start: '19:30', end: '21:00', subjectId: gt.id, loc: 'Ở nhà', source: 'manual' },
    // Thứ 4
    { id: uid(), day: 'wednesday', period: 'morning', title: 'Tự học Tiếng Pháp', type: 'study', start: '08:00', end: '09:30', subjectId: fr.id, loc: 'Ở nhà', source: 'manual' },
    { id: uid(), day: 'wednesday', period: 'afternoon', title: 'Nhập môn ngành', type: 'class', start: '12:30', end: '15:20', subjectId: aiSub.id, loc: 'Đại học Bách khoa (C2.107)', source: 'manual' },
    { id: uid(), day: 'wednesday', period: 'evening', title: 'Viện Pháp', type: 'study', start: '19:30', end: '21:00', subjectId: fr.id, loc: 'Viện Pháp', source: 'manual' },
    // Thứ 5
    { id: uid(), day: 'thursday', period: 'morning', title: 'Tự học Hóa', type: 'study', start: '08:00', end: '10:00', subjectId: hh.id, loc: 'Ở nhà', source: 'manual' },
    { id: uid(), day: 'thursday', period: 'afternoon', title: 'Hóa đại cương', type: 'class', start: '12:30', end: '15:20', subjectId: hh.id, loc: 'Đại học Bách khoa (H101)', source: 'manual' },
    { id: uid(), day: 'thursday', period: 'evening', title: 'Giải tích 1', type: 'study', start: '19:30', end: '21:00', subjectId: gt.id, loc: 'Ở nhà', source: 'manual' },
    // Thứ 6
    { id: uid(), day: 'friday', period: 'morning', title: 'Giải tích 1', type: 'class', start: '07:00', end: '10:50', subjectId: gt.id, loc: 'Đại học Bách khoa (H308)', source: 'manual' },
    { id: uid(), day: 'friday', period: 'afternoon', title: 'Xem trước Giải tích & Tiếng Pháp', type: 'study', start: '13:30', end: '17:00', subjectId: fr.id, loc: 'Ở nhà', source: 'manual' },
    { id: uid(), day: 'friday', period: 'evening', title: 'Viện Pháp', type: 'study', start: '19:30', end: '21:00', subjectId: fr.id, loc: 'Viện Pháp', source: 'manual' },
    // Thứ 7
    { id: uid(), day: 'saturday', period: 'morning', title: 'Tự học / Ôn Kỹ thuật lập trình', type: 'study', start: '08:00', end: '11:00', subjectId: kt.id, loc: 'Ở nhà', source: 'manual' },
    { id: uid(), day: 'saturday', period: 'afternoon', title: 'Học tại trường (Giải tích 1)', type: 'class', start: '13:30', end: '17:00', subjectId: gt.id, loc: 'Đại học Bách khoa (H304)', source: 'manual' },
    { id: uid(), day: 'saturday', period: 'evening', title: 'Làm bài Giải tích', type: 'study', start: '19:00', end: '21:00', subjectId: gt.id, loc: 'Ở nhà', source: 'manual' },
    // Chủ nhật
    { id: uid(), day: 'sunday', period: 'morning', title: 'Tự học Tiếng Pháp', type: 'study', start: '08:00', end: '10:00', subjectId: fr.id, loc: 'Ở nhà', source: 'manual' },
    { id: uid(), day: 'sunday', period: 'afternoon', title: 'Lập trình & Tiếng Pháp', type: 'study', start: '14:00', end: '18:30', subjectId: kt.id, loc: 'Ở nhà', source: 'manual' },
    { id: uid(), day: 'sunday', period: 'evening', title: 'Khối Pháp buổi tối', type: 'study', start: '19:00', end: '22:00', subjectId: fr.id, loc: 'Ở nhà', source: 'manual' },
  ];
  saveAll();
}

/* ------------------------------------------------------------- Toast */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ------------------------------------------------------------- Navigation & Views */
function showView(name) {
  $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === name));
  $$('#sideNav .nav-item, #bottomNav .nav-item').forEach(b => b.classList.toggle('on', b.dataset.view === name));
  
  if (name === 'dashboard') renderDashboard();
  if (name === 'calendar') renderCalendar();
  if (name === 'subjects') renderSubjects();
  if (name === 'deadlines') renderDeadlines();
  if (name === 'tasks') renderTasks();
  if (name === 'notes') renderNotes();
  if (name === 'ai') renderAI();
}

function wireNav() {
  $$('#sideNav .nav-item, #bottomNav .nav-item').forEach(b => {
    b.addEventListener('click', () => showView(b.dataset.view));
  });

  // Direct navigation from Stat Cards and "Xem tất cả >" buttons
  $$('[data-nav-target]').forEach(el => {
    el.addEventListener('click', () => {
      showView(el.dataset.navTarget);
    });
  });
}

/* ------------------------------------------------------------- Helpers */
function subjectById(id) { return state.subjects.find(s => s.id === id); }
function subjectColor(id) { const s = subjectById(id); return s ? s.color : '#3b82f6'; }
function subjectName(id) { const s = subjectById(id); return s ? s.name : 'Chung'; }

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ------------------------------------------------------------- Dashboard */
/* ------------------------------------------------------------- AI Study Summary & Deadline 3D Helpers */
function getDeadlineStatus(d) {
  if (d.status === 'done') {
    return { level: 'done', text: 'Đã xong', dotClass: 'safe', chipClass: 'safe' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { level: 'urgent', text: `Quá hạn ${Math.abs(diffDays)} ngày`, dotClass: 'urgent', chipClass: 'urgent' };
  } else if (diffDays === 0) {
    return { level: 'urgent', text: 'Hôm nay!', dotClass: 'urgent', chipClass: 'urgent' };
  } else if (diffDays === 1) {
    return { level: 'urgent', text: 'Ngày mai', dotClass: 'urgent', chipClass: 'urgent' };
  } else if (diffDays === 2) {
    return { level: 'urgent', text: 'Còn 2 ngày', dotClass: 'urgent', chipClass: 'urgent' };
  } else if (diffDays <= 7) {
    return { level: 'upcoming', text: `Còn ${diffDays} ngày`, dotClass: 'upcoming', chipClass: 'upcoming' };
  } else {
    return { level: 'safe', text: `Còn ${diffDays} ngày`, dotClass: 'safe', chipClass: 'safe' };
  }
}

function generateAiStudySummary(deadlines, tasks) {
  if (!deadlines.length && !tasks.length) {
    return 'Tuyệt vời! Bạn không có hạn chót hay bài tập gấp nào. Hãy tận dụng thời gian để nghỉ ngơi hoặc tự học thêm nhé.';
  }

  const urgentDeadline = deadlines.find(d => {
    const diff = Math.round((new Date(d.date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff <= 3;
  });

  const primaryTask = tasks.find(t => t.priority === 'high') || tasks[0];

  if (urgentDeadline && primaryTask) {
    const subjD = subjectName(urgentDeadline.subjectId);
    const subjT = subjectName(primaryTask.subjectId);
    return `Bạn có bài tập <strong>${escapeHtml(primaryTask.title)}</strong> (${subjT}) cần hoàn thành và deadline <strong>${escapeHtml(urgentDeadline.title)}</strong> (${subjD}) đang đến gần.`;
  }

  if (urgentDeadline) {
    const subjD = subjectName(urgentDeadline.subjectId);
    return `Bạn có deadline <strong>${escapeHtml(urgentDeadline.title)}</strong> (${subjD}) sắp đến hạn. Hãy chú ý hoàn thành đúng hạn nhé!`;
  }

  if (primaryTask) {
    return `Hôm nay bạn có <strong>${tasks.length} nhiệm vụ</strong> cần làm. Ưu tiên hàng đầu là: <strong>${escapeHtml(primaryTask.title)}</strong>.`;
  }

  return `Hôm nay bạn có <strong>${deadlines.length} deadline</strong> và <strong>${tasks.length} nhiệm vụ</strong> cần chú ý. Chúc bạn một ngày học tập hiệu quả!`;
}

/* ------------------------------------------------------------- Dashboard */
function renderDashboard() {
  const fullName = state.username || 'Đạt Ngô';
  const nameParts = fullName.trim().split(/\s+/);
  const letter = nameParts.length ? nameParts[nameParts.length - 1].charAt(0).toUpperCase() : 'N';

  if ($('#dashAiGreeting')) $('#dashAiGreeting').textContent = `Chào ${fullName} 👋`;
  if ($('#userNameLabel')) $('#userNameLabel').textContent = fullName;
  if ($('#avatarLetter')) $('#avatarLetter').textContent = letter;

  // Render Widget 1: Deadline sắp tới (Matching screenshot)
  const pendingDeadlines = state.deadlines.filter(d => d.status !== 'done');
  const upcomingDeadlines = [...pendingDeadlines].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const deadlineContainer = $('#dashUpcomingDeadlines');

  if (deadlineContainer) {
    if (upcomingDeadlines.length > 0) {
      deadlineContainer.innerHTML = upcomingDeadlines.slice(0, 1).map(d => {
        const s = subjectById(d.subjectId);
        const status = getDeadlineStatus(d);
        const diffDays = Math.round((new Date(d.date) - new Date()) / (1000 * 60 * 60 * 24));
        const isUrgent = diffDays <= 2;

        return `
        <div class="mockup-deadline-card" data-dl-id="${d.id}">
          <div class="mockup-deadline-left">
            <div class="doc-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div class="mockup-deadline-info">
              <div class="mockup-deadline-title">${escapeHtml(d.title)}</div>
              <div class="mockup-deadline-meta">
                <span>📁 ${escapeHtml(subjectName(d.subjectId))}</span>
                <span>·</span>
                <span>📅 ${d.date}${d.time ? ' · ' + d.time : ''}</span>
              </div>
            </div>
          </div>
          <div class="mockup-countdown-pill ${isUrgent ? '' : 'amber'}">
            ⏱ ${status.text}
          </div>
        </div>`;
      }).join('');
    } else {
      deadlineContainer.innerHTML = `
        <div style="text-align:center; padding:24px 12px; color:var(--text-muted); font-size:13px">
          🎉 Chưa có deadline nào sắp tới!
          <div style="margin-top:8px">
            <button class="btn small ghost" onclick="showView('deadlines')">+ Tạo deadline mới</button>
          </div>
        </div>`;
    }
  }

  // Render Widget 2: Ghi chú việc cần làm ngày mai (Matching screenshot)
  const tomorrowContainer = $('#dashTomorrowTasks');
  if (tomorrowContainer) {
    const taskList = state.tasks.slice(0, 4);
    const defaultTimeSlots = ['08:00 - 09:00', '10:00 - 11:00', '14:00 - 16:00', '19:00 - 20:30', '21:00 - 22:30'];

    if (taskList.length > 0) {
      tomorrowContainer.innerHTML = taskList.map((t, idx) => {
        const isDone = t.status === 'done';
        const timeSlot = defaultTimeSlots[idx % defaultTimeSlots.length];
        const sName = subjectName(t.subjectId);

        return `
        <div class="mockup-task-item ${isDone ? 'completed' : ''}" data-dash-task-id="${t.id}">
          <div class="mockup-task-left">
            <div class="custom-checkbox ${isDone ? 'checked' : ''}" data-dash-check-task="${t.id}">
              ${isDone ? '✓' : ''}
            </div>
            <div class="mockup-task-info" data-dash-check-task="${t.id}">
              <div class="mockup-task-title">${escapeHtml(t.title)}</div>
              <div class="mockup-task-meta">
                <span>📁 ${escapeHtml(sName)}</span>
                <span>·</span>
                <span>${timeSlot}</span>
              </div>
            </div>
          </div>
          <div class="mockup-task-menu" title="Thao tác" data-task-menu-btn="${t.id}">⋮</div>
        </div>`;
      }).join('');

      // Wire task completion toggle
      $$('[data-dash-check-task]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = el.dataset.dashCheckTask;
          const t = state.tasks.find(x => x.id === id);
          if (!t) return;
          const willBeDone = t.status !== 'done';
          const item = el.closest('.mockup-task-item');
          if (item) {
            const cb = item.querySelector('.custom-checkbox');
            if (cb) {
              cb.classList.toggle('checked', willBeDone);
              cb.textContent = willBeDone ? '✓' : '';
            }
            item.classList.toggle('completed', willBeDone);
          }
          setTimeout(() => {
            t.status = willBeDone ? 'done' : 'todo';
            save('tasks');
            renderDashboard();
            toast(willBeDone ? '✓ Đã hoàn thành nhiệm vụ!' : 'Đã chuyển lại vào việc cần làm.');
          }, 180);
        });
      });

      // Wire menu button on task
      $$('[data-task-menu-btn]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          showView('tasks');
        });
      });
    } else {
      tomorrowContainer.innerHTML = `
        <div class="empty-tomorrow-tasks">
          <div class="empty-task-icon">📋</div>
          <div class="empty-task-title">Chưa có công việc ngày mai</div>
          <button class="btn small ghost" style="margin-top:10px; border-color:rgba(99,102,241,0.4); color:#818cf8" onclick="showView('tasks')">+ Thêm ghi chú</button>
        </div>`;
    }
  }

  // Wire add note/task button
  const addBtn = $('#dashAddNoteOrTaskBtn');
  if (addBtn) {
    addBtn.onclick = () => {
      showView('tasks');
    };
  }
}

/* ------------------------------------------------------------- Quick Note on Dashboard */
function wireQuickNote() {
  const input = $('#dashNoteInput');
  const sendBtn = $('#dashNoteSendBtn');
  const newBtn = $('#dashQuickNoteBtn');

  function submitQuickNote() {
    const text = input.value.trim();
    if (!text) {
      toast('Vui lòng nhập nội dung ghi chú.');
      return;
    }
    state.notes.push({
      id: uid(),
      text,
      subjectId: state.subjects.length ? state.subjects[0].id : null,
      processed: false,
    });
    save('notes');
    input.value = '';
    renderDashboard();
    toast('Đã lưu ghi chú nhanh!');
  }

  if (sendBtn) sendBtn.addEventListener('click', submitQuickNote);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        submitQuickNote();
      }
    });
  }
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      showView('notes');
      $('#addNoteBtn').click();
    });
  }
}

/* ------------------------------------------------------------- Calendar View */
let calMobileDay = (new Date().getDay() + 6) % 7;

function renderCalendar() {
  const grid = $('#calGrid');
  const todayKey = DAYS[(new Date().getDay() + 6) % 7].key;

  grid.innerHTML = DAYS.map(d => {
    const evs = state.calendarEvents.filter(e => e.day === d.key)
      .sort((a, b) => (a.start || '').localeCompare(b.start || '') || (PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period]));

    return `<div class="cal-day ${d.key === todayKey ? 'is-today' : ''}">
      <div class="cal-day-header">
        <span>${d.label}</span>
        ${d.key === todayKey ? '<span style="font-size:10px; color:#60a5fa">HÔM NAY</span>' : ''}
      </div>
      ${evs.map(e => eventChip(e)).join('') || '<div style="color:var(--text-muted); font-size:12px; margin-top:10px; text-align:center">—</div>'}
    </div>`;
  }).join('');

  wireEventDeletes();
  renderMobileDay();
}

function eventChip(e) {
  const timeLabel = e.start ? `${e.start}${e.end ? '–' + e.end : ''}` : (PERIOD_LABEL[e.period] || '');
  const color = subjectColor(e.subjectId);

  return `
  <div class="ev" style="border-left-color: ${color}" data-id="${e.id}">
    <span class="ev-time">${timeLabel} ${e.loc ? '· ' + escapeHtml(e.loc) : ''}</span>
    <div class="ev-title">${escapeHtml(e.title)}</div>
    <span class="ev-del" data-del="${e.id}" title="Xóa">✕</span>
  </div>`;
}

function wireEventDeletes() {
  $$('[data-del]').forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const id = b.dataset.del;
    state.calendarEvents = state.calendarEvents.filter(e => e.id !== id);
    save('calendarEvents');
    renderCalendar();
    renderDashboard();
    toast('Đã xóa sự kiện.');
  }));
}

function renderMobileDay() {
  const d = DAYS[calMobileDay];
  $('#dayLabel').textContent = d.label;
  const grid = $('#calGrid');

  if (window.innerWidth <= 840) {
    const evs = state.calendarEvents.filter(e => e.day === d.key)
      .sort((a, b) => (a.start || '').localeCompare(b.start || '') || (PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period]));
    grid.classList.add('mobile-active');
    grid.innerHTML = `<div class="cal-day is-today">
      <div class="cal-day-header">
        <span>${d.label}</span>
      </div>
      ${evs.map(e => eventChip(e)).join('') || '<div style="color:var(--text-muted); font-size:13px; padding:16px 0; text-align:center">Chưa có lịch cho ngày này.</div>'}
    </div>`;
    wireEventDeletes();
  } else {
    grid.classList.remove('mobile-active');
  }
}

function wireCalendarNav() {
  $('#dayPrev').addEventListener('click', () => { calMobileDay = (calMobileDay + 6) % 7; renderMobileDay(); });
  $('#dayNext').addEventListener('click', () => { calMobileDay = (calMobileDay + 1) % 7; renderMobileDay(); });
  window.addEventListener('resize', () => { if ($('#view-calendar').classList.contains('on')) renderCalendar(); });
  $('#addEventBtn').addEventListener('click', () => openEventForm());

  // Sub tabs in calendar view
  $$('[data-cal-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-cal-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.calTab;
      $('#calTabGeneral').hidden = tab !== 'general';
      $('#calTabFrench').hidden = tab !== 'french';
      $('#calTabSchool').hidden = tab !== 'school';
    });
  });
}

function openEventForm() {
  const existing = $('#eventFormPanel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'eventFormPanel';
  panel.className = 'form-panel';
  panel.innerHTML = `
    <label class="full">Tiêu đề sự kiện<input id="fEvTitle" type="text" placeholder="Ví dụ: Tự học Giải tích / Luyện nghe Pháp"></label>
    <label>Ngày<select id="fEvDay">${DAYS.map(d => `<option value="${d.key}">${d.label}</option>`).join('')}</select></label>
    <label>Buổi<select id="fEvPeriod"><option value="">Không rõ</option><option value="morning">Sáng</option><option value="afternoon">Chiều</option><option value="evening">Tối</option></select></label>
    <label>Giờ bắt đầu<input id="fEvStart" type="time"></label>
    <label>Giờ kết thúc<input id="fEvEnd" type="time"></label>
    <label>Loại hoạt động<select id="fEvType">${Object.entries(TYPE_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label>Môn học<select id="fEvSubject"><option value="">— Không chọn —</option>${state.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
    <label class="full">Địa điểm / Ghi chú<input id="fEvLoc" type="text" placeholder="Ở nhà / Đại học Bách khoa / Viện Pháp"></label>
    <div class="form-actions">
      <button class="btn" id="fEvSave">Lưu sự kiện</button>
      <button class="btn ghost" id="fEvCancel">Hủy</button>
    </div>`;

  $('#calTabGeneral').prepend(panel);
  $('#fEvCancel').addEventListener('click', () => panel.remove());
  $('#fEvSave').addEventListener('click', () => {
    const title = $('#fEvTitle').value.trim();
    if (!title) return toast('Nhập tiêu đề sự kiện trước.');
    state.calendarEvents.push({
      id: uid(),
      day: $('#fEvDay').value,
      period: $('#fEvPeriod').value || null,
      title,
      type: $('#fEvType').value,
      start: $('#fEvStart').value || null,
      end: $('#fEvEnd').value || null,
      subjectId: $('#fEvSubject').value || null,
      loc: $('#fEvLoc').value.trim() || null,
      source: 'manual',
    });
    save('calendarEvents');
    panel.remove();
    renderCalendar();
    renderDashboard();
    toast('Đã thêm sự kiện vào lịch.');
  });
}

/* ------------------------------------------------------------- Subjects */
function renderSubjects() {
  $('#subjectList').innerHTML = state.subjects.length ? state.subjects.map(s => `
    <div class="subject-card">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span class="dot" style="background:${s.color}; box-shadow:0 0 10px ${s.color}80"></span>
          <b style="font-size:16px; color:#fff">${escapeHtml(s.name)}</b>
        </div>
        <div style="font-size:12.5px; color:var(--text-muted)">Mã môn: <b>${escapeHtml(s.code || '—')}</b></div>
      </div>
      <div style="margin-top:16px; display:flex; justify-content:flex-end">
        <button class="btn small ghost" data-del-subject="${s.id}">Xóa</button>
      </div>
    </div>`).join('') : `<div style="color:var(--text-muted); font-size:13px; grid-column:1/-1">Chưa có môn học nào. Hãy thêm môn học đầu tiên!</div>`;

  $$('[data-del-subject]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.delSubject;
    state.subjects = state.subjects.filter(s => s.id !== id);
    save('subjects');
    renderSubjects();
    renderDashboard();
    toast('Đã xóa môn học.');
  }));
}

function wireSubjectForm() {
  $('#addSubjectBtn').addEventListener('click', () => {
    const panel = $('#subjectForm');
    panel.hidden = false;
    panel.innerHTML = `
      <label>Tên môn học<input id="fSubName" type="text" placeholder="Ví dụ: Đại số tuyến tính"></label>
      <label>Mã môn<input id="fSubCode" type="text" placeholder="MT1005"></label>
      <label class="full">Màu nhận diện
        <div class="color-row">${SUBJECT_COLORS.map((c, i) => `<span class="swatch ${i === 0 ? 'on' : ''}" style="background:${c}" data-color="${c}"></span>`).join('')}</div>
      </label>
      <div class="form-actions">
        <button class="btn" id="fSubSave">Lưu môn học</button>
        <button class="btn ghost" id="fSubCancel">Hủy</button>
      </div>`;

    let chosen = SUBJECT_COLORS[0];
    $$('.swatch', panel).forEach(sw => sw.addEventListener('click', () => {
      $$('.swatch', panel).forEach(x => x.classList.remove('on'));
      sw.classList.add('on');
      chosen = sw.dataset.color;
    }));

    $('#fSubCancel').addEventListener('click', () => { panel.hidden = true; });
    $('#fSubSave').addEventListener('click', () => {
      const name = $('#fSubName').value.trim();
      if (!name) return toast('Nhập tên môn học trước.');
      state.subjects.push({ id: uid(), name, code: $('#fSubCode').value.trim(), color: chosen });
      save('subjects');
      panel.hidden = true;
      renderSubjects();
      renderDashboard();
      toast('Đã thêm môn học thành công.');
    });
  });
}

/* ------------------------------------------------------------- Deadlines */
let deadlineFilter = 'all';

function renderDeadlines() {
  let list = [...state.deadlines];
  if (deadlineFilter === 'upcoming') list = list.filter(d => d.status !== 'done');
  if (deadlineFilter === 'done') list = list.filter(d => d.status === 'done');
  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  $('#deadlineList').innerHTML = list.length ? list.map(d => {
    const color = subjectColor(d.subjectId);
    const isDone = d.status === 'done';
    const status = getDeadlineStatus(d);
    const priClass = isDone ? 'done' : (d.priority === 'high' ? 'high' : d.priority === 'med' ? 'med' : 'low');
    const priText = isDone ? 'Xong' : (d.priority === 'high' ? 'GẤP' : d.priority === 'med' ? 'VỪA' : 'THẤP');

    return `
    <div class="deadline-item" style="--item-color: ${color}">
      <div class="item-info">
        <div class="item-title" style="${isDone ? 'text-decoration:line-through; opacity:0.6' : ''}">${escapeHtml(d.title)}</div>
        <div class="item-meta">
          <span>📖 ${escapeHtml(subjectName(d.subjectId))}</span>
          <span>🕒 ${d.date}${d.time ? ' · ' + d.time : ''}</span>
          ${d.note ? `<span>📝 ${escapeHtml(d.note)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px">
        <span class="status-glow-dot ${status.dotClass}"></span>
        <span class="countdown-chip ${status.chipClass}">[ ${status.text} ]</span>
        <span class="pill-priority ${priClass}">${priText}</span>
        <button class="icon-circle-btn" data-toggle-deadline="${d.id}" title="${isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}" style="width:30px; height:30px">✓</button>
        <button class="icon-circle-btn" data-del-deadline="${d.id}" title="Xóa" style="width:30px; height:30px">✕</button>
      </div>
    </div>`;
  }).join('') : `<div style="color:var(--text-muted); font-size:13px; padding:16px 4px">Không có deadline nào.</div>`;

  $$('[data-toggle-deadline]').forEach(b => b.addEventListener('click', () => {
    const d = state.deadlines.find(x => x.id === b.dataset.toggleDeadline);
    if (!d) return;
    d.status = d.status === 'done' ? 'pending' : 'done';
    save('deadlines');
    renderDeadlines();
    renderDashboard();
    toast(d.status === 'done' ? 'Đã hoàn thành deadline!' : 'Đã mở lại deadline.');
  }));

  $$('[data-del-deadline]').forEach(b => b.addEventListener('click', () => {
    state.deadlines = state.deadlines.filter(x => x.id !== b.dataset.delDeadline);
    save('deadlines');
    renderDeadlines();
    renderDashboard();
    toast('Đã xóa deadline.');
  }));
}

function wireDeadlineForm() {
  $('#deadlineFilters').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    $$('.chip', $('#deadlineFilters')).forEach(c => c.classList.remove('on'));
    b.classList.add('on');
    deadlineFilter = b.dataset.f;
    renderDeadlines();
  });

  $('#addDeadlineBtn').addEventListener('click', () => {
    const panel = $('#deadlineForm');
    panel.hidden = false;
    panel.innerHTML = `
      <label>Tiêu đề deadline<input id="fDlTitle" type="text" placeholder="Ví dụ: Bài tập lớn kỳ 1"></label>
      <label>Môn học<select id="fDlSubject"><option value="">—</option>${state.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
      <label>Hạn nộp (Ngày)<input id="fDlDate" type="date" value="${todayISO()}"></label>
      <label>Hạn nộp (Giờ)<input id="fDlTime" type="time" value="23:59"></label>
      <label>Mức độ ưu tiên<select id="fDlPriority"><option value="high">Gấp / Cao</option><option value="med" selected>Vừa</option><option value="low">Thấp</option></select></label>
      <label class="full">Ghi chú thêm<input id="fDlNote" type="text" placeholder="Nộp file PDF qua Teams / CMS"></label>
      <div class="form-actions">
        <button class="btn" id="fDlSave">Lưu deadline</button>
        <button class="btn ghost" id="fDlCancel">Hủy</button>
      </div>`;

    $('#fDlCancel').addEventListener('click', () => { panel.hidden = true; });
    $('#fDlSave').addEventListener('click', () => {
      const title = $('#fDlTitle').value.trim();
      if (!title) return toast('Nhập tiêu đề deadline.');
      state.deadlines.push({
        id: uid(),
        title,
        subjectId: $('#fDlSubject').value || null,
        date: $('#fDlDate').value || todayISO(),
        time: $('#fDlTime').value,
        priority: $('#fDlPriority').value,
        status: 'pending',
        note: $('#fDlNote').value.trim(),
      });
      save('deadlines');
      panel.hidden = true;
      renderDeadlines();
      renderDashboard();
      toast('Đã thêm deadline mới.');
    });
  });
}

/* ------------------------------------------------------------- Tasks */
function renderTasks() {
  ['todo', 'doing', 'done'].forEach(status => {
    const items = state.tasks.filter(t => t.status === status);
    $(`#${status}Count`).textContent = items.length;

    $('#col-' + status).innerHTML = items.length ? items.map(t => {
      const priClass = t.priority === 'high' ? 'high' : t.priority === 'med' ? 'med' : 'low';
      const priText = t.priority === 'high' ? 'Cao' : t.priority === 'med' ? 'Vừa' : 'Thấp';

      return `
      <div class="task-card">
        <div class="tc-title">${escapeHtml(t.title)}</div>
        <div style="font-size:12px; color:var(--text-muted)">${escapeHtml(subjectName(t.subjectId))} · Hạn: ${t.dueDate || 'Hôm nay'}</div>
        <div class="tc-meta">
          <span class="pill-priority ${priClass}">${priText}</span>
          <div style="display:flex; gap:6px">
            ${status !== 'todo' ? `<button class="icon-circle-btn" data-move="${t.id}:${prevStatus(status)}" style="width:26px; height:26px" title="Lùi lại">‹</button>` : ''}
            ${status !== 'done' ? `<button class="icon-circle-btn" data-move="${t.id}:${nextStatus(status)}" style="width:26px; height:26px" title="Chuyển tiếp">›</button>` : ''}
            <button class="icon-circle-btn" data-del-task="${t.id}" style="width:26px; height:26px" title="Xóa">✕</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<div style="color:var(--text-muted); font-size:12.5px; padding:12px 0; text-align:center">—</div>`;
  });

  $$('[data-move]').forEach(b => b.addEventListener('click', () => {
    const [id, to] = b.dataset.move.split(':');
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    t.status = to;
    save('tasks');
    renderTasks();
    renderDashboard();
  }));

  $$('[data-del-task]').forEach(b => b.addEventListener('click', () => {
    state.tasks = state.tasks.filter(x => x.id !== b.dataset.delTask);
    save('tasks');
    renderTasks();
    renderDashboard();
    toast('Đã xóa task.');
  }));
}

function nextStatus(s) { return s === 'todo' ? 'doing' : 'done'; }
function prevStatus(s) { return s === 'done' ? 'doing' : 'todo'; }

function wireTaskForm() {
  $('#addTaskBtn').addEventListener('click', () => {
    const panel = $('#taskForm');
    panel.hidden = false;
    panel.innerHTML = `
      <label>Tiêu đề task<input id="fTkTitle" type="text" placeholder="Ví dụ: Đọc chương 3"></label>
      <label>Môn học<select id="fTkSubject"><option value="">—</option>${state.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
      <label>Mức độ ưu tiên<select id="fTkPriority"><option value="high">Cao</option><option value="med" selected>Vừa</option><option value="low">Thấp</option></select></label>
      <label>Hạn hoàn thành<input id="fTkDue" type="date" value="${todayISO()}"></label>
      <div class="form-actions">
        <button class="btn" id="fTkSave">Lưu task</button>
        <button class="btn ghost" id="fTkCancel">Hủy</button>
      </div>`;

    $('#fTkCancel').addEventListener('click', () => { panel.hidden = true; });
    $('#fTkSave').addEventListener('click', () => {
      const title = $('#fTkTitle').value.trim();
      if (!title) return toast('Nhập tiêu đề task.');
      state.tasks.push({
        id: uid(),
        title,
        subjectId: $('#fTkSubject').value || null,
        priority: $('#fTkPriority').value,
        dueDate: $('#fTkDue').value,
        status: 'todo',
      });
      save('tasks');
      panel.hidden = true;
      renderTasks();
      renderDashboard();
      toast('Đã thêm task.');
    });
  });
}

/* ------------------------------------------------------------- Notes */
function renderNotes() {
  $('#noteList').innerHTML = state.notes.length ? state.notes.map(n => {
    const s = subjectById(n.subjectId);
    const color = s ? s.color : '#a855f7';
    return `
    <div class="sticky-note-card card-3d" style="--note-accent: ${color}">
      <div>
        <p style="font-size:14px; color:#fff; line-height:1.55; white-space:pre-wrap">${escapeHtml(n.text)}</p>
        <div style="font-size:12px; color:var(--text-muted); margin-top:10px; display:flex; align-items:center; gap:6px">
          <span>📖 ${escapeHtml(subjectName(n.subjectId))}</span>
          ${n.processed ? '· <span style="color:#10b981; font-weight:600">✓ Đã xử lý</span>' : ''}
        </div>
      </div>
      <div style="margin-top:16px; display:flex; align-items:center; justify-content:space-between; gap:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px">
        <div style="display:flex; gap:6px">
          ${!n.processed ? `<button class="btn small ghost" data-note-deadline="${n.id}">Chuyển Deadline</button>` : ''}
          <button class="btn small ghost" data-note-ai="${n.id}">🤖 AI Phân tích</button>
        </div>
        <button class="icon-circle-btn" data-del-note="${n.id}" title="Xóa" style="width:28px; height:28px">✕</button>
      </div>
    </div>`;
  }).join('') : `<div style="color:var(--text-muted); font-size:13px; grid-column:1/-1">Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên!</div>`;

  $$('[data-del-note]').forEach(b => b.addEventListener('click', () => {
    state.notes = state.notes.filter(x => x.id !== b.dataset.delNote);
    save('notes');
    renderNotes();
    renderDashboard();
    toast('Đã xóa ghi chú.');
  }));

  $$('[data-note-deadline]').forEach(b => b.addEventListener('click', () => {
    const n = state.notes.find(x => x.id === b.dataset.noteDeadline);
    if (!n) return;
    state.deadlines.push({
      id: uid(),
      title: n.text.slice(0, 60),
      subjectId: n.subjectId,
      date: todayISO(),
      time: '23:59',
      priority: 'med',
      status: 'pending',
      note: n.text,
    });
    n.processed = true;
    save('deadlines');
    save('notes');
    renderNotes();
    renderDeadlines();
    renderDashboard();
    toast('Đã chuyển note thành deadline.');
  }));

  $$('[data-note-ai]').forEach(b => b.addEventListener('click', async () => {
    const n = state.notes.find(x => x.id === b.dataset.noteAi);
    if (!n) return;
    b.textContent = 'Đang đọc…';
    const result = await aiService.parseNote(n.text);
    b.textContent = '🤖 AI Phân tích';
    showNoteAIPreview(n, result);
  }));
}

function showNoteAIPreview(note, result) {
  const box = document.createElement('div');
  box.className = 'form-panel';
  box.innerHTML = `
    <div class="full">
      <b style="color:#60a5fa">AI nhận diện (${result.source === 'remote' ? 'AI thật' : 'bộ phân tích cục bộ'}):</b>
      <div style="font-size:13px; color:var(--text-secondary); margin:10px 0; line-height:1.6">
        Môn học: <b>${escapeHtml(result.subject || '—')}</b><br>
        Bài tập / Nhiệm vụ: <b>${result.tasks && result.tasks.length ? result.tasks.join(', ') : '—'}</b><br>
        Deadline: <b>${result.deadlineDay ? DAYS.find(d => d.key === result.deadlineDay).label : 'Hôm nay'}</b>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn" id="noteAiConfirm">✓ Thêm vào Deadline</button>
      <button class="btn ghost" id="noteAiCancel">Hủy</button>
    </div>`;

  document.querySelector('#view-notes .view-head').after(box);
  $('#noteAiCancel', box).addEventListener('click', () => box.remove());
  $('#noteAiConfirm', box).addEventListener('click', () => {
    state.deadlines.push({
      id: uid(),
      title: (result.tasks && result.tasks.length ? 'Bài: ' + result.tasks.join(', ') : note.text.slice(0, 60)),
      subjectId: note.subjectId,
      date: todayISO(),
      time: '23:59',
      priority: 'med',
      status: 'pending',
      note: result.rawText || note.text,
    });
    note.processed = true;
    save('deadlines');
    save('notes');
    box.remove();
    renderNotes();
    renderDeadlines();
    renderDashboard();
    toast('Đã thêm deadline từ phân tích AI.');
  });
}

function wireNoteForm() {
  $('#addNoteBtn').addEventListener('click', () => {
    const panel = $('#noteForm');
    panel.hidden = false;
    panel.innerHTML = `
      <label class="full">Nội dung ghi chú<textarea id="fNoteText" rows="3" placeholder="Ví dụ: Hóa: Cô giao bài tập 3.1 đến 3.5 làm trước thứ 5."></textarea></label>
      <label>Môn học liên quan<select id="fNoteSubject"><option value="">—</option>${state.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
      <div class="form-actions">
        <button class="btn" id="fNoteSave">Lưu ghi chú</button>
        <button class="btn ghost" id="fNoteCancel">Hủy</button>
      </div>`;

    $('#fNoteCancel').addEventListener('click', () => { panel.hidden = true; });
    $('#fNoteSave').addEventListener('click', () => {
      const text = $('#fNoteText').value.trim();
      if (!text) return toast('Nhập nội dung ghi chú.');
      state.notes.push({ id: uid(), text, subjectId: $('#fNoteSubject').value || null, processed: false });
      save('notes');
      panel.hidden = true;
      renderNotes();
      renderDashboard();
      toast('Đã lưu ghi chú.');
    });
  });
}

/* ------------------------------------------------------------- AI Assistant (Chatbot tự do) */
function formatAiText(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  // Code blocks: ```code```
  html = html.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre style="background:rgba(0,0,0,0.45); padding:12px 14px; border-radius:8px; overflow-x:auto; margin:10px 0; font-family:Consolas,Monaco,monospace; font-size:13px; border:1px solid rgba(255,255,255,0.08); color:#e2e8f0;"><code>${code.trim()}</code></pre>`;
  });
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; font-family:Consolas,Monaco,monospace; font-size:12.5px; color:#93c5fd;">$1</code>');
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Lists
  html = html.replace(/^[\t ]*[-*] (.*)$/gm, '<li style="margin-left:18px; margin-bottom:4px;">$1</li>');
  html = html.replace(/^[\t ]*(\d+)\. (.*)$/gm, '<li style="margin-left:18px; margin-bottom:4px;" value="$1">$2</li>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/<\/pre><br>/g, '</pre>');
  html = html.replace(/<\/li><br>/g, '</li>');
  return html;
}

function updateAiStatusBadge() {
  const badge = $('#aiStatusBadge');
  const text = $('#aiStatusText');
  if (!badge || !text) return;
  if (aiService.isOnline()) {
    badge.className = 'ai-status-pill online';
    text.textContent = 'Online (AI Sẵn sàng)';
  } else {
    badge.className = 'ai-status-pill offline';
    text.textContent = 'Chưa cấu hình Backend';
  }
}

function renderAI() {
  updateAiStatusBadge();
  const stream = $('#aiChatStream');
  if (!stream) return;

  if (!state.aiChat || state.aiChat.length === 0) {
    const shortName = state.username.split(' ').pop() || 'bạn';
    stream.innerHTML = `
      <div class="chat-empty-state">
        <div class="empty-ai-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
        </div>
        <h2 class="empty-title">Xin chào ${escapeHtml(shortName)}!</h2>
        <p class="empty-subtitle">Tôi là trợ lý AI học tập của StudyFlow. Bạn có thể hỏi tôi bất kỳ điều gì: giải thích bài tập, phương pháp học, hoặc kế hoạch ôn thi hôm nay.</p>
        <div class="empty-cards-grid">
          <div class="empty-card-item" data-prompt="Xin chào, bạn có thể giúp tôi những gì?">
            <div class="empty-card-title">👋 Giới thiệu</div>
            <div class="empty-card-desc">Tìm hiểu cách AI có thể đồng hành học tập cùng bạn</div>
          </div>
          <div class="empty-card-item" data-prompt="Giải thích đạo hàm là gì một cách dễ hiểu nhất">
            <div class="empty-card-title">📐 Giải thích đạo hàm</div>
            <div class="empty-card-desc">Hỏi đáp kiến thức môn Giải tích và Toán học</div>
          </div>
          <div class="empty-card-item" data-prompt="Hôm nay tôi nên học gì dựa trên lịch và deadline của tôi?">
            <div class="empty-card-title">🎯 Lộ trình hôm nay</div>
            <div class="empty-card-desc">Tư vấn việc cần làm dựa trên dữ liệu StudyFlow</div>
          </div>
          <div class="empty-card-item" data-prompt="Cho tôi lời khuyên và lộ trình ôn thi tiếng Pháp B1">
            <div class="empty-card-title">🇫🇷 Học tiếng Pháp B1</div>
            <div class="empty-card-desc">Kế hoạch rèn luyện 4 kỹ năng theo khung B1</div>
          </div>
        </div>
      </div>`;

    $$('.empty-card-item', stream).forEach(card => {
      card.addEventListener('click', () => {
        handleUserSend(card.dataset.prompt);
      });
    });
    return;
  }

  // Render message stream (chỉ văn bản tự nhiên, không action cards)
  stream.innerHTML = state.aiChat.map(msg => {
    if (msg.role === 'user') {
      return `
        <div class="chat-msg user">
          <div class="chat-avatar user">${escapeHtml(state.username.slice(0, 1).toUpperCase())}</div>
          <div class="chat-bubble">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
        </div>`;
    }

    // AI message — error state with retry
    if (msg.isError) {
      return `
        <div class="chat-msg ai">
          <div class="chat-avatar ai" style="background: linear-gradient(135deg,#f43f5e,#e11d48)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="chat-bubble" style="border-color: rgba(244,63,94,0.3); background: rgba(244,63,94,0.06);">
            ${formatAiText(msg.content)}
            ${msg.retryPrompt ? `
              <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(244,63,94,0.2)">
                <button class="btn small" data-retry-prompt="${escapeHtml(msg.retryPrompt)}"
                  style="font-size:12px; padding:6px 14px; background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.3); color:#fb7185; border-radius:8px; cursor:pointer;">
                  🔄 Thử lại
                </button>
              </div>` : ''}
          </div>
        </div>`;
    }

    // Normal AI message
    const formatted = formatAiText(msg.content);
    let actionsHtml = '';
    if (msg.actions && msg.actions.length > 0) {
      actionsHtml = `
        <div class="ai-actions-container">
          ${msg.actions.map(act => {
            const isDanger = act.type === 'delete_deadline' || act.type === 'delete_task';
            const typeLabel = {
              create_deadline: 'Thêm Deadline',
              delete_deadline: 'Xóa Deadline',
              create_task: 'Thêm Task',
              delete_task: 'Xóa Task',
              create_event: 'Lịch tuần',
              convert_note: 'Chuyển Note → Task',
            }[act.type] || 'Thao tác';

            const d = act.data || {};
            const subjectDisplay = d.subjectName || (d.subjectId ? subjectName(d.subjectId) : null);

            return `
              <div class="ai-action-card ${act.status === 'confirmed' ? 'executed' : act.status === 'cancelled' ? 'cancelled' : ''}" data-act-id="${act.id}">
                <div class="ai-action-header">
                  <span class="ai-action-tag ${isDanger ? 'danger' : ''}">${typeLabel}</span>
                  <span class="ai-action-desc">${escapeHtml(act.summary || d.title || 'Xác nhận thao tác')}</span>
                </div>
                <div class="ai-action-details-grid">
                  ${subjectDisplay ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Môn học:</span> <b>${escapeHtml(subjectDisplay)}</b></div>` : ''}
                  ${d.title ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Tiêu đề:</span> <b>${escapeHtml(d.title)}</b></div>` : ''}
                  ${d.date ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Thời hạn:</span> <span class="highlight-date">${escapeHtml(d.date)}${d.time ? ' · ' + escapeHtml(d.time) : ''}</span></div>` : ''}
                  ${d.dueDate ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Hạn xong:</span> <span class="highlight-date">${escapeHtml(d.dueDate)}</span></div>` : ''}
                  ${d.priority ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Mức độ:</span> <span class="pill-priority ${d.priority}">${d.priority === 'high' ? 'Gấp / Cao' : d.priority === 'med' ? 'Vừa' : 'Thấp'}</span></div>` : ''}
                  ${d.note ? `<div class="ai-detail-row" style="grid-column: 1 / -1"><span class="ai-detail-lbl">Ghi chú:</span> <span>${escapeHtml(d.note)}</span></div>` : ''}
                </div>
                <div class="ai-action-footer">
                  ${act.status === 'confirmed'
                    ? `<span class="action-status-badge success">✓ Đã xác nhận & lưu vào StudyFlow</span>`
                    : act.status === 'cancelled'
                    ? `<span class="action-status-badge cancel">✕ Đã hủy thao tác</span>`
                    : `
                      <button class="btn small btn-action-confirm" data-msg-id="${msg.id}" data-act-id="${act.id}">✓ Xác nhận</button>
                      <button class="btn small ghost btn-action-cancel" data-msg-id="${msg.id}" data-act-id="${act.id}">✕ Hủy</button>
                    `
                  }
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }

    return `
      <div class="chat-msg ai">
        <div class="chat-avatar ai">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
        </div>
        <div class="chat-bubble">
          ${formatted}
          ${actionsHtml}
        </div>
      </div>`;
  }).join('');

  wireActionButtons(stream);

  // Wire retry buttons in error messages
  $$('[data-retry-prompt]', stream).forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.retryPrompt;
      if (prompt) handleUserSend(prompt);
    });
  });

  stream.scrollTop = stream.scrollHeight;
}

function wireActionButtons(stream) {
  $$('.btn-action-confirm', stream).forEach(btn => {
    btn.addEventListener('click', () => {
      const msgId = btn.dataset.msgId;
      const actId = btn.dataset.actId;
      const msg = (state.aiChat || []).find(m => m.id === msgId);
      if (!msg || !msg.actions) return;
      const act = msg.actions.find(a => a.id === actId);
      if (!act || act.status === 'confirmed') return;

      const success = executeAiAction(act);
      if (success !== false) {
        act.status = 'confirmed';
        save('aiChat');
        renderAI();
      }
    });
  });

  $$('.btn-action-cancel', stream).forEach(btn => {
    btn.addEventListener('click', () => {
      const msgId = btn.dataset.msgId;
      const actId = btn.dataset.actId;
      const msg = (state.aiChat || []).find(m => m.id === msgId);
      if (!msg || !msg.actions) return;
      const act = msg.actions.find(a => a.id === actId);
      if (!act) return;

      act.status = 'cancelled';
      save('aiChat');
      renderAI();
      toast('Đã hủy thao tác.');
    });
  });
}

function executeAiAction(act) {
  const d = act.data || {};
  try {
    if (act.type === 'create_deadline') {
      const title = (d.title || '').trim();
      if (!title) {
        toast('Lỗi: Tiêu đề deadline không hợp lệ.');
        return false;
      }
      let sId = d.subjectId || null;
      if (!sId && d.subjectName) {
        const found = state.subjects.find(s => s.name.toLowerCase().includes(d.subjectName.toLowerCase()));
        if (found) sId = found.id;
      }

      state.deadlines.push({
        id: uid(),
        title,
        subjectId: sId,
        date: d.date || todayISO(),
        time: d.time || '23:59',
        priority: d.priority || 'med',
        status: 'pending',
        note: d.note || '',
      });
      save('deadlines');
      renderDeadlines();
      renderDashboard();
      toast(`✓ Đã thêm deadline: "${title}"`);
      return true;
    }

    if (act.type === 'delete_deadline') {
      let target = null;
      if (d.id) target = state.deadlines.find(x => x.id === d.id);
      if (!target && d.title) {
        target = state.deadlines.find(x => x.title.toLowerCase().includes(d.title.toLowerCase()));
      }
      if (!target) {
        toast('Không tìm thấy deadline cần xóa trong danh sách.');
        return false;
      }
      state.deadlines = state.deadlines.filter(x => x.id !== target.id);
      save('deadlines');
      renderDeadlines();
      renderDashboard();
      toast(`✓ Đã xóa deadline: "${target.title}"`);
      return true;
    }

    if (act.type === 'create_task') {
      const title = (d.title || '').trim();
      if (!title) {
        toast('Lỗi: Tiêu đề task không hợp lệ.');
        return false;
      }
      let sId = d.subjectId || null;
      if (!sId && d.subjectName) {
        const found = state.subjects.find(s => s.name.toLowerCase().includes(d.subjectName.toLowerCase()));
        if (found) sId = found.id;
      }

      state.tasks.push({
        id: uid(),
        title,
        subjectId: sId,
        priority: d.priority || 'med',
        dueDate: d.dueDate || todayISO(),
        status: 'todo',
      });
      save('tasks');
      renderTasks();
      renderDashboard();
      toast(`✓ Đã thêm task: "${title}"`);
      return true;
    }

    if (act.type === 'delete_task') {
      let target = null;
      if (d.id) target = state.tasks.find(x => x.id === d.id);
      if (!target && d.title) {
        target = state.tasks.find(x => x.title.toLowerCase().includes(d.title.toLowerCase()));
      }
      if (!target) {
        toast('Không tìm thấy task cần xóa trong danh sách.');
        return false;
      }
      state.tasks = state.tasks.filter(x => x.id !== target.id);
      save('tasks');
      renderTasks();
      renderDashboard();
      toast(`✓ Đã xóa task: "${target.title}"`);
      return true;
    }

    if (act.type === 'create_event') {
      const title = (d.title || '').trim();
      if (!title) {
        toast('Lỗi: Tiêu đề ca học không hợp lệ.');
        return false;
      }
      state.calendarEvents.push({
        id: uid(),
        day: d.day || 'monday',
        period: d.period || 'evening',
        title,
        type: 'study',
        start: d.start || '19:30',
        end: d.end || '21:00',
        subjectId: d.subjectId || null,
        loc: d.loc || 'Ở nhà',
        source: 'ai',
      });
      save('calendarEvents');
      renderCalendar();
      renderDashboard();
      toast(`✓ Đã thêm ca học vào Lịch tuần!`);
      return true;
    }

    if (act.type === 'convert_note') {
      const n = state.notes.find(x => x.id === d.noteId);
      if (n) {
        n.processed = true;
        save('notes');
        renderNotes();
      }
      const title = (d.title || (n ? n.text.slice(0, 30) : 'Task mới')).trim();
      state.tasks.push({
        id: uid(),
        title,
        subjectId: d.subjectId || (n ? n.subjectId : null),
        priority: 'med',
        dueDate: todayISO(),
        status: 'todo',
      });
      save('tasks');
      renderTasks();
      renderDashboard();
      toast(`✓ Đã chuyển ghi chú thành task!`);
      return true;
    }
  } catch (err) {
    console.error('Execute action error:', err);
    toast(`Lỗi khi thực hiện: ${err.message}`);
    return false;
  }
  return true;
}

async function handleUserSend(customText) {
  const input = $('#aiChatInput');
  const text = (customText || (input ? input.value : '')).trim();
  if (!text) return;

  if (input && !customText) {
    input.value = '';
    input.style.height = 'auto';
  }

  if (!state.aiChat) state.aiChat = [];
  const msgId = uid();
  state.aiChat.push({ id: msgId, role: 'user', content: text, time: Date.now() });
  save('aiChat');
  renderAI();

  const typing = $('#aiTypingIndicator');
  const sendBtn = $('#aiSendBtn');
  if (typing) typing.style.display = 'flex';
  if (sendBtn) sendBtn.disabled = true;

  const stream = $('#aiChatStream');
  if (stream) stream.scrollTop = stream.scrollHeight;

  // Lấy lịch sử cuộc trò chuyện (không tính tin nhắn user vừa gửi, tối đa 14 lượt)
  const history = state.aiChat.slice(0, -1).slice(-14).map(m => ({ role: m.role, content: m.content }));

  const ctx = {
    username: state.username,
    subjects: state.subjects,
    deadlines: state.deadlines,
    tasks: state.tasks,
    notes: state.notes,
    calendarEvents: state.calendarEvents,
  };

  try {
    const result = await aiService.chat(text, ctx, history);
    state.aiChat.push({
      id: uid(),
      role: 'assistant',
      content: result.text,
      actions: result.actions || [],
      time: Date.now(),
    });
    save('aiChat');
  } catch (err) {
    console.warn('[StudyFlow AI] error:', err);
    let errText = '';
    const isNoEndpoint = err?.type === 'no-endpoint';
    const isApiError = err?.type === 'api-error';

    if (isNoEndpoint) {
      errText = '⚙️ **Chưa kết nối AI Backend.**\n\nHãy đảm bảo server StudyFlow đang chạy hoặc cấu hình URL backend trong mục **Cài đặt**.';
    } else if (isApiError) {
      const detailsMsg = err.details ? `\n\n_${err.details}_` : '';
      errText = `❌ **Không thể kết nối với AI (${err.status || 'Lỗi'})**\n\n${err.message || 'Lỗi không xác định.'}${detailsMsg}`;
    } else if (err?.name === 'AbortError') {
      errText = '⏱️ **Hết thời gian chờ (timeout).**\n\nAI phản hồi quá chậm. Bạn hãy bấm thử lại nhé.';
    } else {
      errText = `❌ **Lỗi kết nối:** ${err?.message || 'Không thể liên lạc với server.'}\n\nVui lòng kiểm tra lại server và thử lại.`;
    }

    state.aiChat.push({
      id: uid(),
      role: 'assistant',
      content: errText,
      actions: [],
      isError: true,
      retryPrompt: text,
      time: Date.now(),
    });
    save('aiChat');
  } finally {
    if (typing) typing.style.display = 'none';
    if (sendBtn) sendBtn.disabled = false;
    renderAI();
  }
}

function wireAI() {
  const input = $('#aiChatInput');
  const sendBtn = $('#aiSendBtn');
  const newChatBtn = $('#aiNewChatBtn');

  if (sendBtn) {
    sendBtn.addEventListener('click', () => handleUserSend());
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserSend();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  $$('.quick-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      handleUserSend(btn.dataset.quick);
    });
  });

  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      state.aiChat = [];
      save('aiChat');
      renderAI();
      toast('Đã bắt đầu cuộc trò chuyện mới.');
    });
  }
}

/* ------------------------------------------------------------- Settings Modal */
function wireSettings() {
  const modal = $('#settingsModal');
  const openBtn = $('#openSettingsBtn');
  const userProfileBtn = $('#userProfileBtn');
  const closeBtn = $('#closeSettingsBtn');
  const cancelBtn = $('#cancelSettingsBtn');
  const saveBtn = $('#saveSettingsBtn');
  const input = $('#settingUsername');
  const aiEpInput = $('#settingAiEndpoint');

  function openSettings() {
    input.value = state.username;
    if (aiEpInput) aiEpInput.value = aiService.getEndpoint();
    modal.classList.remove('hidden');
  }
  function closeSettings() {
    modal.classList.add('hidden');
  }

  if (openBtn) openBtn.addEventListener('click', openSettings);
  if (userProfileBtn) userProfileBtn.addEventListener('click', openSettings);
  if (closeBtn) closeBtn.addEventListener('click', closeSettings);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSettings);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettings();
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) return toast('Vui lòng nhập tên người dùng.');
      state.username = name;
      localStorage.setItem('sf_username', name);
      if (aiEpInput) {
        aiService.setEndpoint(aiEpInput.value.trim());
        updateAiStatusBadge();
      }
      closeSettings();
      renderDashboard();
      toast('Đã cập nhật thông tin cài đặt.');
    });
  }

  // Notif button simple feedback
  $('#notifBtn').addEventListener('click', () => {
    toast('Bạn có 2 deadline sắp tới trong tuần này.');
  });
}

/* ============================================================= Modern 3D Engine & Hero Interactive Chat */

function initHeroParallax() {
  const hero = $('#aiHero');
  const content = $('#heroContent');
  const orb = $('#aiOrb');
  const blobs = $$('.hero-blob', hero);
  if (!hero || !content) return;

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReducedMotion) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    content.style.transform = `perspective(1000px) rotateX(${-y * 3.5}deg) rotateY(${x * 3.5}deg) translateZ(8px)`;
    if (orb) orb.style.transform = `translate(${x * 12}px, ${y * 12}px) scale(1.04)`;

    blobs.forEach((blob, idx) => {
      const factor = (idx + 1) * 8;
      blob.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
    });
  });

  hero.addEventListener('mouseleave', () => {
    content.style.transition = 'transform 0.5s ease-out';
    content.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    if (orb) {
      orb.style.transition = 'transform 0.5s ease-out';
      orb.style.transform = 'translate(0, 0) scale(1)';
    }
    blobs.forEach(blob => {
      blob.style.transition = 'transform 0.5s ease-out';
      blob.style.transform = 'translate(0, 0)';
    });

    setTimeout(() => {
      content.style.transition = '';
      if (orb) orb.style.transition = '';
      blobs.forEach(blob => { blob.style.transition = ''; });
    }, 500);
  });
}

function initCardSpecularHighlights() {
  const cards = $$('.card-3d');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
    });
  });
}

function initHeroParticles() {
  const canvas = $('#heroParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReduced) return;

  let width = canvas.width = canvas.offsetWidth || 800;
  let height = canvas.height = canvas.offsetHeight || 220;

  window.addEventListener('resize', () => {
    if (!canvas.offsetWidth) return;
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  });

  const PARTICLE_COUNT = 24;
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.5 + 0.8,
    speedX: (Math.random() - 0.5) * 0.3,
    speedY: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.5 + 0.2,
    alphaSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
  }));

  function animate() {
    if (!document.hidden && canvas.offsetWidth > 0) {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha += p.alphaSpeed;

        if (p.alpha <= 0.1 || p.alpha >= 0.7) p.alphaSpeed = -p.alphaSpeed;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${Math.max(0, p.alpha)})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#6366f1';
        ctx.fill();
      });
    }

    requestAnimationFrame(animate);
  }
  animate();
}

async function handleHeroSend(customText) {
  const input = $('#heroAiInput');
  const text = (customText || (input ? input.value : '')).trim();
  if (!text) return;

  if (input && !customText) {
    input.value = '';
  }

  const box = $('#heroDialogueBox');
  const stream = $('#heroDialogueStream');
  if (box) box.style.display = 'flex';

  if (!state.aiChat) state.aiChat = [];
  const userMsgId = uid();
  state.aiChat.push({ id: userMsgId, role: 'user', content: text, time: Date.now() });
  save('aiChat');

  // Render user bubble in hero dialogue
  const userHtml = `
    <div class="hero-dialogue-msg user">
      <div class="hero-msg-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
    </div>`;
  const typingHtml = `
    <div class="hero-dialogue-msg ai" id="heroTyping">
      <div class="hero-msg-bubble" style="color:#a5b4fc; font-style:italic">
        ✨ AI đang phân tích dữ liệu StudyFlow...
      </div>
    </div>`;

  if (stream) {
    stream.innerHTML += userHtml + typingHtml;
    stream.scrollTop = stream.scrollHeight;
  }

  const history = state.aiChat.slice(0, -1).slice(-14).map(m => ({ role: m.role, content: m.content }));
  const ctx = {
    username: state.username,
    subjects: state.subjects,
    deadlines: state.deadlines,
    tasks: state.tasks,
    notes: state.notes,
    calendarEvents: state.calendarEvents,
  };

  try {
    const result = await aiService.chat(text, ctx, history);
    const aiMsgId = uid();
    state.aiChat.push({
      id: aiMsgId,
      role: 'assistant',
      content: result.text,
      actions: result.actions || [],
      time: Date.now(),
    });
    save('aiChat');

    const typingEl = $('#heroTyping');
    if (typingEl) typingEl.remove();

    const formatted = formatAiText(result.text);
    let actionsHtml = '';
    if (result.actions && result.actions.length > 0) {
      actionsHtml = `
        <div style="margin-top:8px; padding:8px 10px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); border-radius:8px; font-size:12px">
          <b>⚡ Đề xuất thao tác:</b> ${result.actions.map(a => a.summary || a.type).join(' · ')}
          <div style="margin-top:6px">
            <button class="btn small" id="heroConfirmActionBtn" style="font-size:11px; padding:4px 10px">✓ Xác nhận thao tác</button>
          </div>
        </div>`;
    }

    if (stream) {
      stream.innerHTML += `
        <div class="hero-dialogue-msg ai">
          <div class="hero-msg-bubble">
            ${formatted}
            ${actionsHtml}
          </div>
        </div>`;
      stream.scrollTop = stream.scrollHeight;

      const actBtn = $('#heroConfirmActionBtn');
      if (actBtn && result.actions?.[0]) {
        actBtn.addEventListener('click', () => {
          executeAiAction(result.actions[0]);
          actBtn.disabled = true;
          actBtn.textContent = '✓ Đã thực hiện';
          renderDashboard();
        });
      }
    }
  } catch (err) {
    const typingEl = $('#heroTyping');
    if (typingEl) typingEl.remove();
    if (stream) {
      stream.innerHTML += `
        <div class="hero-dialogue-msg ai">
          <div class="hero-msg-bubble" style="border-color:rgba(244,63,94,0.3); color:#fb7185">
            ❌ Không thể liên lạc với AI: ${escapeHtml(err.message || 'Lỗi server')}
          </div>
        </div>`;
      stream.scrollTop = stream.scrollHeight;
    }
  }
}

function initHeroChat() {
  const input = $('#heroAiInput');
  const sendBtn = $('#heroAiSend');
  const openFullBtn = $('#heroOpenFullChatBtn');

  if (sendBtn) {
    sendBtn.addEventListener('click', () => handleHeroSend());
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleHeroSend();
      }
    });
  }

  $$('.hero-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      handleHeroSend(chip.dataset.quick);
    });
  });

  if (openFullBtn) {
    openFullBtn.addEventListener('click', () => {
      showView('ai');
    });
  }
}

/* ------------------------------------------------------------- Dashboard AI Chat (Embedded in Dashboard) */
function initDashboardAiChat() {
  const input = $('#dashChatInput');
  const sendBtn = $('#dashChatSendBtn');
  const chatContainer = $('#dashChatMessages');

  if (!input || !sendBtn || !chatContainer) return;

  // Render existing chat history into dashboard chat
  renderDashboardChatMessages();

  // Send button click
  sendBtn.addEventListener('click', () => handleDashboardAiSend());

  // Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDashboardAiSend();
    }
  });
}

function renderDashboardChatMessages() {
  const chatContainer = $('#dashChatMessages');
  if (!chatContainer) return;

  if (!state.aiChat || state.aiChat.length === 0) {
    // Show default welcome message matching screenshot
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    chatContainer.innerHTML = `
      <div class="chat-msg ai-msg initial-welcome">
        <div class="ai-msg-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
        </div>
        <div class="ai-msg-content-wrap">
          <div class="ai-bubble">
            <span>Chào bạn! Mình là trợ lý AI của StudyFlow. 👋<br><br>Bạn có thể hỏi mình bất cứ điều gì về học tập, kế hoạch, deadline hay các vấn đề khác nhé. Mình luôn sẵn sàng hỗ trợ!</span>
          </div>
          <span class="msg-timestamp">${timeStr}</span>
        </div>
      </div>`;
    return;
  }

  // Render all messages
  chatContainer.innerHTML = state.aiChat.map(msg => {
    const timeObj = msg.time ? new Date(msg.time) : new Date();
    const timeStr = `${String(timeObj.getHours()).padStart(2,'0')}:${String(timeObj.getMinutes()).padStart(2,'0')}`;

    if (msg.role === 'user') {
      return `
        <div class="chat-msg user-msg">
          <div class="user-msg-bubble">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
          <span class="msg-timestamp">${timeStr}</span>
        </div>`;
    }

    // AI message
    if (msg.isError) {
      return `
        <div class="chat-msg ai-msg">
          <div class="ai-msg-avatar" style="background: linear-gradient(135deg,#f43f5e,#e11d48)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="ai-msg-content-wrap">
            <div class="ai-bubble error-bubble">${formatAiText(msg.content)}</div>
            ${msg.retryPrompt ? `<button class="dash-retry-btn" data-dash-retry="${escapeHtml(msg.retryPrompt)}">🔄 Thử lại</button>` : ''}
            <span class="msg-timestamp">${timeStr}</span>
          </div>
        </div>`;
    }

    const formatted = formatAiText(msg.content);
    let actionsHtml = '';
    if (msg.actions && msg.actions.length > 0) {
      actionsHtml = `
        <div class="ai-actions-container dash-actions">
          ${msg.actions.map(act => {
            const isDanger = act.type === 'delete_deadline' || act.type === 'delete_task';
            const typeLabel = {
              create_deadline: 'Thêm Deadline',
              delete_deadline: 'Xóa Deadline',
              create_task: 'Thêm Task',
              delete_task: 'Xóa Task',
              create_event: 'Lịch tuần',
              convert_note: 'Chuyển Note → Task',
            }[act.type] || 'Thao tác';
            const d = act.data || {};
            const subjectDisplay = d.subjectName || (d.subjectId ? subjectName(d.subjectId) : null);

            return `
              <div class="ai-action-card ${act.status === 'confirmed' ? 'executed' : act.status === 'cancelled' ? 'cancelled' : ''}" data-act-id="${act.id}">
                <div class="ai-action-header">
                  <span class="ai-action-tag ${isDanger ? 'danger' : ''}">${typeLabel}</span>
                  <span class="ai-action-desc">${escapeHtml(act.summary || d.title || 'Xác nhận thao tác')}</span>
                </div>
                <div class="ai-action-details-grid">
                  ${subjectDisplay ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Môn học:</span> <b>${escapeHtml(subjectDisplay)}</b></div>` : ''}
                  ${d.title ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Tiêu đề:</span> <b>${escapeHtml(d.title)}</b></div>` : ''}
                  ${d.date ? `<div class="ai-detail-row"><span class="ai-detail-lbl">Thời hạn:</span> <span class="highlight-date">${escapeHtml(d.date)}${d.time ? ' · ' + escapeHtml(d.time) : ''}</span></div>` : ''}
                </div>
                <div class="ai-action-footer">
                  ${act.status === 'confirmed'
                    ? `<span class="action-status-badge success">✓ Đã xác nhận & lưu</span>`
                    : act.status === 'cancelled'
                    ? `<span class="action-status-badge cancel">✕ Đã hủy</span>`
                    : `
                      <button class="btn small btn-action-confirm" data-msg-id="${msg.id}" data-act-id="${act.id}">✓ Xác nhận</button>
                      <button class="btn small ghost btn-action-cancel" data-msg-id="${msg.id}" data-act-id="${act.id}">✕ Hủy</button>
                    `
                  }
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }

    return `
      <div class="chat-msg ai-msg">
        <div class="ai-msg-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
        </div>
        <div class="ai-msg-content-wrap">
          <div class="ai-bubble">${formatted}${actionsHtml}</div>
          <span class="msg-timestamp">${timeStr}</span>
        </div>
      </div>`;
  }).join('');

  // Wire action buttons in dashboard chat
  wireDashboardActionButtons(chatContainer);

  // Wire retry buttons
  $$('[data-dash-retry]', chatContainer).forEach(btn => {
    btn.addEventListener('click', () => handleDashboardAiSend(btn.dataset.dashRetry));
  });

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function wireDashboardActionButtons(container) {
  $$('.btn-action-confirm', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const msgId = btn.dataset.msgId;
      const actId = btn.dataset.actId;
      const msg = (state.aiChat || []).find(m => m.id === msgId);
      if (!msg || !msg.actions) return;
      const act = msg.actions.find(a => a.id === actId);
      if (!act || act.status === 'confirmed') return;

      const success = executeAiAction(act);
      if (success !== false) {
        act.status = 'confirmed';
        save('aiChat');
        renderDashboardChatMessages();
        renderDashboard();
      }
    });
  });

  $$('.btn-action-cancel', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const msgId = btn.dataset.msgId;
      const actId = btn.dataset.actId;
      const msg = (state.aiChat || []).find(m => m.id === msgId);
      if (!msg || !msg.actions) return;
      const act = msg.actions.find(a => a.id === actId);
      if (!act) return;

      act.status = 'cancelled';
      save('aiChat');
      renderDashboardChatMessages();
      toast('Đã hủy thao tác.');
    });
  });
}

async function handleDashboardAiSend(customText) {
  const input = $('#dashChatInput');
  const text = (customText || (input ? input.value : '')).trim();
  if (!text) return;

  if (input && !customText) {
    input.value = '';
  }

  if (!state.aiChat) state.aiChat = [];
  const msgId = uid();
  state.aiChat.push({ id: msgId, role: 'user', content: text, time: Date.now() });
  save('aiChat');
  renderDashboardChatMessages();

  // Show typing
  const typing = $('#dashTyping');
  const sendBtn = $('#dashChatSendBtn');
  if (typing) typing.style.display = 'flex';
  if (sendBtn) sendBtn.disabled = true;

  // Pulse the AI orb
  if (window._pulseAi3dOrb) window._pulseAi3dOrb(true);

  const chatContainer = $('#dashChatMessages');
  if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

  const history = state.aiChat.slice(0, -1).slice(-14).map(m => ({ role: m.role, content: m.content }));
  const ctx = {
    username: state.username,
    subjects: state.subjects,
    deadlines: state.deadlines,
    tasks: state.tasks,
    notes: state.notes,
    calendarEvents: state.calendarEvents,
  };

  try {
    const result = await aiService.chat(text, ctx, history);
    state.aiChat.push({
      id: uid(),
      role: 'assistant',
      content: result.text,
      actions: result.actions || [],
      time: Date.now(),
    });
    save('aiChat');
  } catch (err) {
    console.warn('[StudyFlow AI] Dashboard chat error:', err);
    let errText = '';
    const isNoEndpoint = err?.type === 'no-endpoint';
    const isApiError = err?.type === 'api-error';

    if (isNoEndpoint) {
      errText = '⚙️ **Chưa kết nối AI Backend.** Hãy đảm bảo server StudyFlow đang chạy.';
    } else if (isApiError) {
      errText = `❌ **Lỗi API (${err.status || 'Lỗi'}):** ${err.message || 'Lỗi không xác định.'}`;
    } else {
      errText = `❌ **Lỗi kết nối:** ${err?.message || 'Không thể liên lạc với server.'}`;
    }

    state.aiChat.push({
      id: uid(),
      role: 'assistant',
      content: errText,
      actions: [],
      isError: true,
      retryPrompt: text,
      time: Date.now(),
    });
    save('aiChat');
  } finally {
    if (typing) typing.style.display = 'none';
    if (sendBtn) sendBtn.disabled = false;
    if (window._pulseAi3dOrb) window._pulseAi3dOrb(false);
    renderDashboardChatMessages();
    // Also sync standalone AI view if visible
    if ($('#view-ai')?.classList.contains('on')) renderAI();
  }
}

/* ------------------------------------------------------------- 3D Cosmos Universe Globe (Interactive Canvas) */
function initCosmosGlobe() {
  const canvas = document.getElementById('aiCosmosCanvas');
  const container = document.getElementById('aiCosmosContainer');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = 86;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const R = (size * dpr) * 0.35; // Sphere radius

  // Sphere geometry settings
  const latRings = 7;
  const lonRings = 10;
  const segments = 24;

  // Stardust field (Bụi sao bay lơ lửng)
  const starCount = 24;
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const dist = R * (1.18 + Math.random() * 0.65);
    stars.push({
      x: dist * Math.sin(phi) * Math.cos(theta),
      y: dist * Math.cos(phi),
      z: dist * Math.sin(phi) * Math.sin(theta),
      size: Math.random() * 1.4 + 0.7,
      twinkleSpeed: Math.random() * 0.06 + 0.02,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.45 ? '#38bdf8' : (Math.random() > 0.5 ? '#c084fc' : '#ffffff')
    });
  }

  // Orbiting Satellites (Hành tinh nhỏ trên quỹ đạo)
  const satellites = [
    { orbitTilt: 0.45, orbitTiltZ: -0.22, orbitR: R * 1.34, speed: 0.024, angle: 0, size: 2.5, color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.95)' },
    { orbitTilt: -0.38, orbitTiltZ: 0.32, orbitR: R * 1.46, speed: -0.017, angle: Math.PI * 0.9, size: 2.1, color: '#c084fc', glow: 'rgba(192, 132, 252, 0.95)' }
  ];

  let rotX = 0.22;
  let rotY = 0;
  let targetRotX = 0.22;
  let targetRotY = 0;
  let isHovered = false;
  let isPulsing = false;

  window._pulseAi3dOrb = (on) => {
    isPulsing = !!on;
  };

  // Mouse interaction: smoothly tilt the cosmos towards cursor
  const panel = document.getElementById('dashAiPanel') || container;
  panel.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const cX = rect.left + rect.width / 2;
    const cY = rect.top + rect.height / 2;
    const dx = e.clientX - cX;
    const dy = e.clientY - cY;
    targetRotY = (dx / 140) * 0.75;
    targetRotX = -(dy / 140) * 0.55;
    isHovered = true;
  });

  panel.addEventListener('mouseleave', () => {
    isHovered = false;
    targetRotX = 0.22;
  });

  let time = 0;

  function render() {
    time += 0.016;
    const baseSpeed = isPulsing ? 0.032 : 0.013;
    if (!isHovered) {
      targetRotY += baseSpeed;
    } else {
      targetRotY += baseSpeed * 0.4;
    }

    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Nebula Core Glow
    const pulseScale = isPulsing ? (1 + Math.sin(time * 6) * 0.09) : (1 + Math.sin(time * 2.2) * 0.04);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.35 * pulseScale);
    grad.addColorStop(0, 'rgba(129, 140, 248, 0.42)');
    grad.addColorStop(0.35, 'rgba(99, 102, 241, 0.25)');
    grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.12)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.35 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    // 3D Projection Math
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

    function project(x, y, z) {
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const fov = 320 * dpr;
      const k = fov / (fov + z2);
      return {
        px: cx + x1 * k,
        py: cy + y2 * k,
        z: z2,
        k: k
      };
    }

    // 2. Draw Back Orbit segments (z < 0)
    drawOrbitRings(false);

    // 3. Draw Back Stardust (z < 0)
    drawStars(false);

    // 4. Draw 3D Sphere Wireframe (Latitudes & Longitudes)
    // Latitude rings
    for (let i = 1; i < latRings; i++) {
      const phi = (i / latRings) * Math.PI;
      const rLat = R * Math.sin(phi);
      const yLat = R * Math.cos(phi);

      ctx.beginPath();
      let first = true;
      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2;
        const x = rLat * Math.cos(theta);
        const z = rLat * Math.sin(theta);
        const p = project(x, yLat, z);

        if (first) {
          ctx.moveTo(p.px, p.py);
          first = false;
        } else {
          ctx.lineTo(p.px, p.py);
        }
      }
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.38)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }

    // Longitude rings
    for (let i = 0; i < lonRings; i++) {
      const theta = (i / lonRings) * Math.PI * 2;
      ctx.beginPath();
      let first = true;
      for (let j = 0; j <= segments; j++) {
        const phi = (j / segments) * Math.PI;
        const x = R * Math.sin(phi) * Math.cos(theta);
        const y = R * Math.cos(phi);
        const z = R * Math.sin(phi) * Math.sin(theta);
        const p = project(x, y, z);

        if (first) {
          ctx.moveTo(p.px, p.py);
          first = false;
        } else {
          ctx.lineTo(p.px, p.py);
        }
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }

    // Draw Glowing Vertex Nodes
    for (let i = 1; i < latRings; i++) {
      const phi = (i / latRings) * Math.PI;
      const rLat = R * Math.sin(phi);
      const yLat = R * Math.cos(phi);
      for (let j = 0; j < lonRings; j++) {
        const theta = (j / lonRings) * Math.PI * 2;
        const x = rLat * Math.cos(theta);
        const z = rLat * Math.sin(theta);
        const p = project(x, yLat, z);

        if (p.z > -R * 0.25) {
          const alpha = Math.min(1, Math.max(0.2, (p.z + R) / (2 * R)));
          ctx.beginPath();
          ctx.arc(p.px, p.py, 1.6 * p.k * dpr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.95})`;
          ctx.fill();

          if (p.z > R * 0.25) {
            ctx.beginPath();
            ctx.arc(p.px, p.py, 0.8 * p.k * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
        }
      }
    }

    // 5. Draw Front Orbit segments (z >= 0)
    drawOrbitRings(true);

    // 6. Draw Satellites & Front Stardust
    drawSatellites();
    drawStars(true);

    function drawOrbitRings(frontOnly) {
      satellites.forEach(sat => {
        ctx.save();
        ctx.beginPath();
        let first = true;
        const step = Math.PI / 36;
        for (let a = 0; a <= Math.PI * 2 + 0.05; a += step) {
          const rawX = sat.orbitR * Math.cos(a);
          const rawY = sat.orbitR * Math.sin(a) * Math.sin(sat.orbitTilt);
          const rawZ = sat.orbitR * Math.sin(a) * Math.cos(sat.orbitTilt);

          const p = project(rawX, rawY, rawZ);
          const isFront = p.z >= 0;
          if (frontOnly === isFront) {
            if (first) {
              ctx.moveTo(p.px, p.py);
              first = false;
            } else {
              ctx.lineTo(p.px, p.py);
            }
          } else {
            first = true;
          }
        }
        ctx.strokeStyle = frontOnly ? 'rgba(56, 189, 248, 0.72)' : 'rgba(99, 102, 241, 0.22)';
        ctx.lineWidth = (frontOnly ? 1.35 : 0.85) * dpr;
        ctx.stroke();
        ctx.restore();
      });
    }

    function drawSatellites() {
      satellites.forEach(sat => {
        sat.angle += sat.speed;
        const rawX = sat.orbitR * Math.cos(sat.angle);
        const rawY = sat.orbitR * Math.sin(sat.angle) * Math.sin(sat.orbitTilt);
        const rawZ = sat.orbitR * Math.sin(sat.angle) * Math.cos(sat.orbitTilt);
        const p = project(rawX, rawY, rawZ);

        // Halo
        ctx.beginPath();
        ctx.arc(p.px, p.py, sat.size * p.k * 2.2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = sat.glow;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.px, p.py, sat.size * p.k * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });
    }

    function drawStars(frontOnly) {
      stars.forEach(st => {
        st.phase += st.twinkleSpeed;
        const p = project(st.x, st.y, st.z);
        const isFront = p.z >= 0;
        if (isFront === frontOnly) {
          const alpha = 0.4 + 0.5 * Math.sin(st.phase);
          ctx.beginPath();
          ctx.arc(p.px, p.py, st.size * p.k * dpr, 0, Math.PI * 2);
          ctx.fillStyle = st.color;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      });
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

/* ------------------------------------------------------------- Wire Reset */
function wireReset() {
  const btn = $('#resetBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu StudyFlow? Hành động này không thể hoàn tác.')) return;
    STORE_KEYS.forEach(k => localStorage.removeItem('sf_' + k));
    localStorage.removeItem('sf_username');
    location.reload();
  });
}

function init3DEffects() {
  initHeroParallax();
  initCardSpecularHighlights();
  initHeroParticles();
  initHeroChat();
  initDashboardAiChat();
  initCosmosGlobe();
}

/* ------------------------------------------------------------- Boot */
function boot() {
  load();
  seedDemoIfEmpty();
  wireNav();
  wireQuickNote();
  wireCalendarNav();
  wireSubjectForm();
  wireDeadlineForm();
  wireTaskForm();
  wireNoteForm();
  wireAI();
  wireSettings();
  wireReset();
  init3DEffects();
  showView('dashboard');
}

document.addEventListener('DOMContentLoaded', boot);

