/* ══════════════════════════════════════════════════════════════
   بصيرة - Daily Reminder App for Deaf Users
   script.js — Main Application Logic
══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1. APP STATE & CONFIGURATION
───────────────────────────────────────────────────────────── */
const APP_VERSION = '1.0.0';
const STORAGE_KEYS = {
  TASKS:       'basira_tasks',
  SETTINGS:    'basira_settings',
  ONBOARDED:   'basira_onboarded',
};

/** Default application settings */
const DEFAULT_SETTINGS = {
  darkMode:       false,
  vibration:      true,
  notifications:  false,
  repeatInterval: 5,  // seconds between alert repeats
};

/** Predefined task templates */
const TEMPLATES = {
  fajr:    { title: 'أذان الفجر',   desc: 'اذان - قوم صلي', icon: '🕌', color: '#6C63FF', time: '05:00' },
  dhuhr:   { title: 'أذان الظهر',   desc: 'اذان - قوم صلي', icon: '🕌', color: '#FFA23A', time: '12:30' },
  asr:     { title: 'أذان العصر',   desc: 'اذان - قوم صلي', icon: '🕌', color: '#4ECDC4', time: '15:30' },
  maghrib: { title: 'أذان المغرب',  desc: 'اذان - قوم صلي', icon: '🕌', color: '#FF6B6B', time: '18:15' },
  isha:    { title: 'أذان العشاء',  desc: 'اذان - قوم صلي', icon: '🕌', color: '#45B7D1', time: '20:00' },
  medicine:{ title: 'موعد الدواء',  desc: 'لا تنسَ تناول الدواء', icon: '💊', color: '#FF8B94', time: '08:00' },
  meeting: { title: 'اجتماع',      desc: 'موعد اجتماع مهم',  icon: '📋', color: '#96CEB4', time: '10:00' },
};

/** App runtime state */
let state = {
  tasks:          [],
  settings:       { ...DEFAULT_SETTINGS },
  currentPage:    'home',
  editingTaskId:  null,
  alertInterval:  null,      // interval for repeating alerts
  activeAlert:    null,      // task currently alerting
  calYear:        new Date().getFullYear(),
  calMonth:       new Date().getMonth(),
  calSelectedDay: null,
  checkInterval:  null,      // interval for checking task times
};

/* ─────────────────────────────────────────────────────────────
   2. DOM REFERENCES
───────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const DOM = {
  // Onboarding
  onboarding:    $('onboarding'),
  obNext:        $('ob-next'),
  obSkip:        $('ob-skip'),
  obDots:        document.querySelectorAll('.dot'),
  obSlides:      document.querySelectorAll('.onboarding-slide'),

  // App Shell
  app:           $('app'),
  pageTitle:     $('pageTitle'),

  // Top Bar
  darkModeToggle:$('darkModeToggle'),
  sunIcon:       document.querySelector('.sun-icon'),
  moonIcon:      document.querySelector('.moon-icon'),
  notifPermBtn:  $('notifPermBtn'),

  // Pages
  pages:         document.querySelectorAll('.page'),

  // Home
  greetingDate:  $('greetingDate'),
  todayCount:    $('todayCount'),
  taskList:      $('taskList'),
  emptyState:    $('emptyState'),
  addTaskBtn:    $('addTaskBtn'),
  emptyAddBtn:   $('emptyAddBtn'),
  templateChips: document.querySelectorAll('.template-chip'),

  // Calendar
  calGrid:       $('calGrid'),
  calMonthLabel: $('calMonthLabel'),
  prevMonth:     $('prevMonth'),
  nextMonth:     $('nextMonth'),
  calSelectedLabel: $('calSelectedLabel'),
  calTaskList:   $('calTaskList'),

  // Settings
  darkModeSwitch:  $('darkModeSwitch'),
  vibrationSwitch: $('vibrationSwitch'),
  reqNotifBtn:     $('reqNotifBtn'),
  repeatInterval:  $('repeatInterval'),
  clearDataBtn:    $('clearDataBtn'),

  // Bottom Nav
  navItems: document.querySelectorAll('.nav-item[data-page]'),
  fabBtn:   $('fabBtn'),

  // Task Modal
  taskModal:   $('taskModal'),
  taskSheet:   $('taskSheet'),
  modalTitle:  $('modalTitle'),
  closeModal:  $('closeModal'),
  cancelTask:  $('cancelTask'),
  saveTask:    $('saveTask'),
  iconPicker:  $('iconPicker'),
  colorPicker: $('colorPicker'),
  taskTitle:   $('taskTitle'),
  taskDesc:    $('taskDesc'),
  taskDate:    $('taskDate'),
  taskTime:    $('taskTime'),
  taskEnabled: $('taskEnabled'),

  // Alert
  alertOverlay: $('alertOverlay'),
  alertFlash:   $('alertFlash'),
  alertContent: $('alertContent'),
  alertIcon:    $('alertIcon'),
  alertTitle:   $('alertTitle'),
  alertDesc:    $('alertDesc'),
  alertTime:    $('alertTime'),
  alertDoneBtn: $('alertDoneBtn'),

  // Toast
  toast: $('toast'),

  // Confirm
  confirmDialog: $('confirmDialog'),
  confirmTitle:  $('confirmTitle'),
  confirmMsg:    $('confirmMsg'),
  confirmIcon:   $('confirmIcon'),
  confirmOk:     $('confirmOk'),
  confirmCancel: $('confirmCancel'),
};

/* ─────────────────────────────────────────────────────────────
   3. STORAGE UTILITIES
───────────────────────────────────────────────────────────── */
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
};

/* ─────────────────────────────────────────────────────────────
   4. LOAD / SAVE
───────────────────────────────────────────────────────────── */
function loadData() {
  state.tasks    = Storage.get(STORAGE_KEYS.TASKS, []);
  state.settings = { ...DEFAULT_SETTINGS, ...Storage.get(STORAGE_KEYS.SETTINGS, {}) };
}

function saveTasks()    { Storage.set(STORAGE_KEYS.TASKS, state.tasks); }
function saveSettings() { Storage.set(STORAGE_KEYS.SETTINGS, state.settings); }

/* ─────────────────────────────────────────────────────────────
   5. SETTINGS APPLICATION
───────────────────────────────────────────────────────────── */
function applySettings() {
  const { darkMode, vibration, repeatInterval } = state.settings;

  // Dark mode
  document.body.classList.toggle('dark-mode', darkMode);
  DOM.sunIcon.classList.toggle('hidden', darkMode);
  DOM.moonIcon.classList.toggle('hidden', !darkMode);
  DOM.darkModeSwitch.checked  = darkMode;
  DOM.vibrationSwitch.checked = vibration;
  DOM.repeatInterval.value    = String(repeatInterval);
}

function toggleDarkMode() {
  state.settings.darkMode = !state.settings.darkMode;
  applySettings();
  saveSettings();
  showToast(state.settings.darkMode ? '🌙 الوضع الداكن' : '☀️ الوضع الفاتح', 'info');
}

/* ─────────────────────────────────────────────────────────────
   6. ONBOARDING
───────────────────────────────────────────────────────────── */
let obSlide = 0;

function initOnboarding() {
  const alreadyDone = Storage.get(STORAGE_KEYS.ONBOARDED, false);
  if (alreadyDone) {
    finishOnboarding(false);
    return;
  }
  DOM.onboarding.classList.remove('hidden');
  DOM.app.classList.add('hidden');
}

function goToSlide(idx) {
  DOM.obSlides.forEach((s, i) => {
    s.classList.remove('active', 'exit-left');
    if (i === idx)  s.classList.add('active');
    if (i < idx)    s.classList.add('exit-left');
  });
  DOM.obDots.forEach((d, i) => d.classList.toggle('active', i === idx));
  obSlide = idx;
  DOM.obNext.textContent = idx === DOM.obSlides.length - 1 ? 'ابدأ الآن 🚀' : 'التالي';
}

function finishOnboarding(animate = true) {
  Storage.set(STORAGE_KEYS.ONBOARDED, true);
  if (animate) {
    DOM.onboarding.classList.add('exit');
    setTimeout(() => {
      DOM.onboarding.classList.add('hidden');
      DOM.app.classList.remove('hidden');
    }, 400);
  } else {
    DOM.onboarding.classList.add('hidden');
    DOM.app.classList.remove('hidden');
  }
}

DOM.obNext.addEventListener('click', () => {
  if (obSlide < DOM.obSlides.length - 1) {
    goToSlide(obSlide + 1);
  } else {
    finishOnboarding();
  }
});

DOM.obSkip.addEventListener('click', () => finishOnboarding());

DOM.obDots.forEach(dot => {
  dot.addEventListener('click', () => goToSlide(+dot.dataset.dot));
});

/* ─────────────────────────────────────────────────────────────
   7. NAVIGATION
───────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  home:     'الرئيسية',
  calendar: 'التقويم',
  settings: 'الإعدادات',
};

function navigateTo(page) {
  if (!page || page === state.currentPage) return;

  state.currentPage = page;
  DOM.pageTitle.textContent = PAGE_TITLES[page] || 'بصيرة';

  // Update pages
  DOM.pages.forEach(p => p.classList.toggle('active', p.id === `page-${page}`));

  // Update nav items
  DOM.navItems.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // Side effects
  if (page === 'home')     renderHomeList();
  if (page === 'calendar') renderCalendar();
}

DOM.navItems.forEach(btn => {
  const pg = btn.dataset.page;
  if (!pg) return;  // FAB has empty data-page
  btn.addEventListener('click', () => navigateTo(pg));
});

DOM.fabBtn.addEventListener('click', () => openTaskModal());

/* ─────────────────────────────────────────────────────────────
   8. HOME PAGE RENDERING
───────────────────────────────────────────────────────────── */
function renderGreeting() {
  const now    = new Date();
  const arDate = now.toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  DOM.greetingDate.textContent = arDate;
}

function renderHomeList() {
  renderGreeting();

  const today      = todayString();
  const todayTasks = state.tasks.filter(t => t.date === today);

  DOM.todayCount.textContent = todayTasks.length;
  DOM.emptyState.style.display = todayTasks.length ? 'none' : 'flex';
  DOM.emptyState.style.flexDirection = 'column';
  DOM.emptyState.style.alignItems    = 'center';

  // Remove previous cards (keep emptyState)
  [...DOM.taskList.querySelectorAll('.task-card')].forEach(c => c.remove());

  // Sort by time
  const sorted = [...todayTasks].sort((a, b) => a.time.localeCompare(b.time));
  sorted.forEach(task => {
    DOM.taskList.appendChild(buildTaskCard(task));
  });
}

/** Build a single task card element */
function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id = task.id;
  card.style.setProperty('--task-color', task.color || 'var(--accent)');

  if (task.done)     card.classList.add('done');
  if (!task.enabled) card.classList.add('disabled');

  const statusLabel = task.done ? 'مكتمل' : (isPastTime(task.date, task.time) ? 'فائت' : 'قادم');
  const statusClass = task.done ? 'done'  : (isPastTime(task.date, task.time) ? 'missed' : 'pending');

  card.innerHTML = `
    <div class="task-icon-wrap">${task.icon || '🔔'}</div>
    <div class="task-body">
      <p class="task-title">${escHtml(task.title)}</p>
      ${task.desc ? `<p class="task-desc">${escHtml(task.desc)}</p>` : ''}
      <div class="task-meta">
        <span class="task-time-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${task.time}
        </span>
        <span class="task-status-badge ${statusClass}">${statusLabel}</span>
        ${!task.enabled ? '<span class="task-status-badge missed">معطّل</span>' : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action-btn done-btn" data-action="done" data-id="${task.id}" title="تم">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button class="task-action-btn edit" data-action="edit" data-id="${task.id}" title="تعديل">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="task-action-btn delete" data-action="delete" data-id="${task.id}" title="حذف">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>`;

  // Delegate events on card buttons
  card.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleTaskAction(btn.dataset.action, btn.dataset.id);
    });
  });

  return card;
}

function handleTaskAction(action, id) {
  const task = getTaskById(id);
  if (!task) return;

  if (action === 'edit') {
    openTaskModal(task);
  } else if (action === 'delete') {
    showConfirm('حذف المهمة', `هل تريد حذف "${task.title}"؟`, '🗑️', () => {
      deleteTask(id);
    });
  } else if (action === 'done') {
    toggleDone(id);
  }
}

/* ─────────────────────────────────────────────────────────────
   9. TASK CRUD
───────────────────────────────────────────────────────────── */
function getTaskById(id) {
  return state.tasks.find(t => t.id === id) || null;
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  refreshCurrentPage();
  showToast('🗑️ تم حذف المهمة', 'info');
}

function toggleDone(id) {
  const task = getTaskById(id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  refreshCurrentPage();
  showToast(task.done ? '✅ تم تحديد المهمة كمكتملة' : '↩️ تم إلغاء الإكمال', 'success');
}

function saveTaskFromModal() {
  const title = DOM.taskTitle.value.trim();
  const date  = DOM.taskDate.value;
  const time  = DOM.taskTime.value;

  if (!title)       { showToast('⚠️ أدخل عنوان المهمة', 'error'); DOM.taskTitle.focus(); return; }
  if (!date)        { showToast('⚠️ اختر تاريخًا', 'error');       DOM.taskDate.focus(); return; }
  if (!time)        { showToast('⚠️ اختر وقتًا', 'error');          DOM.taskTime.focus(); return; }

  const selectedIcon  = DOM.iconPicker.querySelector('.icon-opt.active')?.dataset.icon  || '🔔';
  const selectedColor = DOM.colorPicker.querySelector('.color-opt.active')?.dataset.color || '#6C63FF';

  if (state.editingTaskId) {
    // Update existing
    const task = getTaskById(state.editingTaskId);
    if (task) {
      task.title   = title;
      task.desc    = DOM.taskDesc.value.trim();
      task.date    = date;
      task.time    = time;
      task.icon    = selectedIcon;
      task.color   = selectedColor;
      task.enabled = DOM.taskEnabled.checked;
    }
    showToast('✏️ تم تعديل المهمة', 'success');
  } else {
    // Create new
    const newTask = {
      id:      genId(),
      title,
      desc:    DOM.taskDesc.value.trim(),
      date,
      time,
      icon:    selectedIcon,
      color:   selectedColor,
      enabled: DOM.taskEnabled.checked,
      done:    false,
      createdAt: Date.now(),
    };
    state.tasks.push(newTask);
    showToast('✅ تم إضافة المهمة', 'success');
  }

  saveTasks();
  closeTaskModal();
  refreshCurrentPage();
}

/* ─────────────────────────────────────────────────────────────
   10. TASK MODAL
───────────────────────────────────────────────────────────── */
function openTaskModal(task = null) {
  state.editingTaskId = task ? task.id : null;
  DOM.modalTitle.textContent = task ? 'تعديل المهمة' : 'مهمة جديدة';

  // Reset form
  DOM.taskTitle.value   = task?.title   || '';
  DOM.taskDesc.value    = task?.desc    || '';
  DOM.taskDate.value    = task?.date    || todayString();
  DOM.taskTime.value    = task?.time    || currentTimeString();
  DOM.taskEnabled.checked = task ? task.enabled : true;

  // Set icon
  DOM.iconPicker.querySelectorAll('.icon-opt').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.icon === (task?.icon || '🔔'));
  });

  // Set color
  DOM.colorPicker.querySelectorAll('.color-opt').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.color === (task?.color || '#6C63FF'));
  });

  DOM.taskModal.classList.remove('hidden');
  requestAnimationFrame(() => DOM.taskTitle.focus());
}

function closeTaskModal() {
  DOM.taskModal.classList.add('hidden');
  state.editingTaskId = null;
}

// Icon picker
DOM.iconPicker.addEventListener('click', e => {
  const btn = e.target.closest('.icon-opt');
  if (!btn) return;
  DOM.iconPicker.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('active'));
  btn.classList.add('active');
});

// Color picker
DOM.colorPicker.addEventListener('click', e => {
  const btn = e.target.closest('.color-opt');
  if (!btn) return;
  DOM.colorPicker.querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
  btn.classList.add('active');
});

DOM.closeModal.addEventListener('click',  closeTaskModal);
DOM.cancelTask.addEventListener('click',  closeTaskModal);
DOM.saveTask.addEventListener('click',    saveTaskFromModal);
DOM.addTaskBtn.addEventListener('click',  () => openTaskModal());
DOM.emptyAddBtn.addEventListener('click', () => openTaskModal());

// Close modal on backdrop click
DOM.taskModal.addEventListener('click', e => {
  if (e.target === DOM.taskModal) closeTaskModal();
});

/* ─────────────────────────────────────────────────────────────
   11. QUICK TEMPLATES
───────────────────────────────────────────────────────────── */
DOM.templateChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const tpl = TEMPLATES[chip.dataset.template];
    if (!tpl) return;

    // Pre-fill modal with template
    openTaskModal();
    DOM.taskTitle.value = tpl.title;
    DOM.taskDesc.value  = tpl.desc;
    DOM.taskTime.value  = tpl.time;

    // Set icon
    DOM.iconPicker.querySelectorAll('.icon-opt').forEach(o =>
      o.classList.toggle('active', o.dataset.icon === tpl.icon));

    // Set color
    DOM.colorPicker.querySelectorAll('.color-opt').forEach(o =>
      o.classList.toggle('active', o.dataset.color === tpl.color));

    showToast(`📌 تم تحميل قالب: ${tpl.title}`, 'info');
  });
});

/* ─────────────────────────────────────────────────────────────
   12. CALENDAR
───────────────────────────────────────────────────────────── */
const AR_MONTHS = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

function renderCalendar() {
  const { calYear: year, calMonth: month } = state;
  DOM.calMonthLabel.textContent = `${AR_MONTHS[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const daysInPrev   = new Date(year, month, 0).getDate();
  const today        = new Date();
  const todayStr     = todayString();

  // Collect all task dates for the month
  const taskDates = new Set(
    state.tasks.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).map(t => t.date)
  );

  DOM.calGrid.innerHTML = '';

  // Previous month padding
  for (let i = 0; i < firstDay; i++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'cal-day other-month';
    dayEl.textContent = daysInPrev - firstDay + i + 1;
    DOM.calGrid.appendChild(dayEl);
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    const dayEl   = document.createElement('div');
    dayEl.className = 'cal-day';
    dayEl.textContent = d;

    if (dateStr === todayStr) dayEl.classList.add('today');
    if (state.calSelectedDay === dateStr) dayEl.classList.add('selected');
    if (taskDates.has(dateStr)) dayEl.classList.add('has-tasks');

    dayEl.addEventListener('click', () => selectCalDay(dateStr));
    DOM.calGrid.appendChild(dayEl);
  }

  // Next month padding
  const total = firstDay + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= remaining; i++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'cal-day other-month';
    dayEl.textContent = i;
    DOM.calGrid.appendChild(dayEl);
  }

  // Render selected day tasks
  if (state.calSelectedDay) renderCalDayTasks(state.calSelectedDay);
}

function selectCalDay(dateStr) {
  state.calSelectedDay = dateStr;
  renderCalendar();

  const d = new Date(dateStr + 'T00:00:00');
  DOM.calSelectedLabel.textContent = `مهام ${d.toLocaleDateString('ar-EG', {weekday:'long', day:'numeric', month:'long'})}`;
}

function renderCalDayTasks(dateStr) {
  const tasks = state.tasks.filter(t => t.date === dateStr)
                             .sort((a, b) => a.time.localeCompare(b.time));
  DOM.calTaskList.innerHTML = '';

  if (!tasks.length) {
    DOM.calTaskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>لا توجد مهام لهذا اليوم</p>
      </div>`;
    return;
  }

  tasks.forEach(task => DOM.calTaskList.appendChild(buildTaskCard(task)));
}

DOM.prevMonth.addEventListener('click', () => {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  state.calSelectedDay = null;
  DOM.calSelectedLabel.textContent = 'المهام';
  DOM.calTaskList.innerHTML = '';
  renderCalendar();
});

DOM.nextMonth.addEventListener('click', () => {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  state.calSelectedDay = null;
  DOM.calSelectedLabel.textContent = 'المهام';
  DOM.calTaskList.innerHTML = '';
  renderCalendar();
});

/* ─────────────────────────────────────────────────────────────
   13. SETTINGS EVENT HANDLERS
───────────────────────────────────────────────────────────── */
DOM.darkModeToggle.addEventListener('click', toggleDarkMode);
DOM.darkModeSwitch.addEventListener('change', () => {
  state.settings.darkMode = DOM.darkModeSwitch.checked;
  applySettings();
  saveSettings();
});

DOM.vibrationSwitch.addEventListener('change', () => {
  state.settings.vibration = DOM.vibrationSwitch.checked;
  saveSettings();
  showToast(DOM.vibrationSwitch.checked ? '📳 الاهتزاز مفعّل' : '🔕 الاهتزاز معطّل', 'info');
});

DOM.repeatInterval.addEventListener('change', () => {
  state.settings.repeatInterval = +DOM.repeatInterval.value;
  saveSettings();
  showToast('⏱️ تم حفظ إعداد التكرار', 'info');
});

DOM.reqNotifBtn.addEventListener('click', requestNotifications);
DOM.notifPermBtn.addEventListener('click', requestNotifications);

DOM.clearDataBtn.addEventListener('click', () => {
  showConfirm('مسح كل البيانات', 'سيتم حذف جميع المهام والإعدادات. هل أنت متأكد؟', '⚠️', () => {
    Storage.remove(STORAGE_KEYS.TASKS);
    Storage.remove(STORAGE_KEYS.SETTINGS);
    Storage.remove(STORAGE_KEYS.ONBOARDED);
    location.reload();
  });
});

/* ─────────────────────────────────────────────────────────────
   14. NOTIFICATIONS PERMISSION
───────────────────────────────────────────────────────────── */
async function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('⚠️ المتصفح لا يدعم الإشعارات', 'error');
    return;
  }
  if (Notification.permission === 'granted') {
    showToast('✅ الإشعارات مفعّلة بالفعل', 'success');
    state.settings.notifications = true;
    saveSettings();
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    state.settings.notifications = true;
    saveSettings();
    showToast('✅ تم تفعيل الإشعارات!', 'success');
    new Notification('بصيرة', { body: 'الإشعارات مفعّلة 👁️', icon: 'assets/icons/icon-192.png' });
  } else {
    showToast('❌ تم رفض الإشعارات', 'error');
  }
}

/* ─────────────────────────────────────────────────────────────
   15. ALERT / VISUAL NOTIFICATION SYSTEM
───────────────────────────────────────────────────────────── */

/**
 * Fire a full-screen visual alert for the given task.
 * The alert repeats every N seconds until user clicks "Done".
 */
function fireAlert(task) {
  // Already showing an alert? queue or skip
  if (state.activeAlert) return;

  state.activeAlert = task;

  // Populate alert UI
  DOM.alertIcon.textContent   = task.icon || '🔔';
  DOM.alertTitle.textContent  = task.title;
  DOM.alertDesc.textContent   = task.desc || '';
  DOM.alertTime.textContent   = `⏰ ${task.time}`;

  // Show overlay
  DOM.alertOverlay.classList.remove('hidden');

  // Trigger shake immediately then repeat
  triggerShake();

  // Trigger vibration
  vibrate();

  // Send browser notification
  sendBrowserNotification(task);

  // Repeat interval
  state.alertInterval = setInterval(() => {
    triggerShake();
    vibrate();
  }, state.settings.repeatInterval * 1000);
}

function triggerShake() {
  DOM.alertContent.classList.remove('shaking');
  // Force reflow to restart animation
  void DOM.alertContent.offsetWidth;
  DOM.alertContent.classList.add('shaking');
}

function vibrate() {
  if (!state.settings.vibration) return;
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }
}

function sendBrowserNotification(task) {
  if (!state.settings.notifications) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(`🔔 ${task.title}`, {
      body: task.desc || 'تذكير من بصيرة',
      icon: 'assets/icons/icon-192.png',
    });
  } catch {}
}

function dismissAlert() {
  clearInterval(state.alertInterval);
  state.alertInterval = null;

  // Mark task as done
  if (state.activeAlert) {
    const task = getTaskById(state.activeAlert.id);
    if (task) { task.done = true; saveTasks(); }
    state.activeAlert = null;
  }

  // Animate out
  DOM.alertOverlay.style.transition = 'opacity 0.3s ease';
  DOM.alertOverlay.style.opacity    = '0';
  setTimeout(() => {
    DOM.alertOverlay.classList.add('hidden');
    DOM.alertOverlay.style.opacity    = '';
    DOM.alertOverlay.style.transition = '';
  }, 300);

  refreshCurrentPage();
  showToast('✅ تم الإقرار بالتذكير', 'success');
}

DOM.alertDoneBtn.addEventListener('click', dismissAlert);

/* ─────────────────────────────────────────────────────────────
   16. TASK TIME CHECKER (runs every 30s)
───────────────────────────────────────────────────────────── */
function checkTaskAlerts() {
  if (state.activeAlert) return; // don't interrupt active alert

  const now     = new Date();
  const dateStr = todayString();
  const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  for (const task of state.tasks) {
    if (!task.enabled) continue;
    if (task.done)     continue;
    if (task.date !== dateStr) continue;
    if (task.time !== timeStr) continue;

    // Fire!
    fireAlert(task);
    break;
  }
}

/* ─────────────────────────────────────────────────────────────
   17. TOAST NOTIFICATIONS
───────────────────────────────────────────────────────────── */
let toastTimeout = null;

function showToast(msg, type = 'info', duration = 2500) {
  clearTimeout(toastTimeout);
  DOM.toast.textContent = msg;
  DOM.toast.className   = `toast ${type}`;

  toastTimeout = setTimeout(() => {
    DOM.toast.classList.add('hidden');
  }, duration);
}

/* ─────────────────────────────────────────────────────────────
   18. CONFIRM DIALOG
───────────────────────────────────────────────────────────── */
let confirmCallback = null;

function showConfirm(title, msg, icon = '⚠️', onConfirm) {
  DOM.confirmTitle.textContent = title;
  DOM.confirmMsg.textContent   = msg;
  DOM.confirmIcon.textContent  = icon;
  confirmCallback = onConfirm;
  DOM.confirmDialog.classList.remove('hidden');
}

DOM.confirmOk.addEventListener('click', () => {
  DOM.confirmDialog.classList.add('hidden');
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});

DOM.confirmCancel.addEventListener('click', () => {
  DOM.confirmDialog.classList.add('hidden');
  confirmCallback = null;
});

DOM.confirmDialog.addEventListener('click', e => {
  if (e.target === DOM.confirmDialog) {
    DOM.confirmDialog.classList.add('hidden');
    confirmCallback = null;
  }
});

/* ─────────────────────────────────────────────────────────────
   19. HELPERS
───────────────────────────────────────────────────────────── */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function todayString() {
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
}

function currentTimeString() {
  const n = new Date();
  return `${pad2(n.getHours())}:${pad2(n.getMinutes())}`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function isPastTime(dateStr, timeStr) {
  const now  = new Date();
  const task = new Date(`${dateStr}T${timeStr}`);
  return task < now;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function refreshCurrentPage() {
  if (state.currentPage === 'home')     renderHomeList();
  if (state.currentPage === 'calendar') renderCalendar();
}

/* ─────────────────────────────────────────────────────────────
   20. PWA SERVICE WORKER REGISTRATION
───────────────────────────────────────────────────────────── */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('service-worker.js');
    console.log('[SW] Registered:', reg.scope);
  } catch (err) {
    console.warn('[SW] Registration failed:', err);
  }
}

/* ─────────────────────────────────────────────────────────────
   21. INSTALL PROMPT (Add to Home Screen)
───────────────────────────────────────────────────────────── */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show a subtle toast hinting install
  setTimeout(() => {
    showToast('📲 يمكنك تثبيت التطبيق على شاشتك الرئيسية!', 'info', 5000);
  }, 3000);
});

window.addEventListener('appinstalled', () => {
  showToast('🎉 تم تثبيت التطبيق بنجاح!', 'success');
  deferredInstallPrompt = null;
});

/* ─────────────────────────────────────────────────────────────
   22. VISIBILITY CHANGE — re-check on tab focus
───────────────────────────────────────────────────────────── */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkTaskAlerts();
    refreshCurrentPage();
  }
});

/* ─────────────────────────────────────────────────────────────
   23. KEYBOARD SUPPORT
───────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!DOM.taskModal.classList.contains('hidden'))    closeTaskModal();
    if (!DOM.confirmDialog.classList.contains('hidden')) DOM.confirmDialog.classList.add('hidden');
    if (!DOM.alertOverlay.classList.contains('hidden')) dismissAlert();
  }
  if (e.key === 'Enter' && !DOM.taskModal.classList.contains('hidden')) {
    if (document.activeElement !== DOM.taskDesc) saveTaskFromModal();
  }
});

/* ─────────────────────────────────────────────────────────────
   24. SWIPE NAVIGATION (touch)
───────────────────────────────────────────────────────────── */
let touchStartX = 0, touchStartY = 0;
const PAGES_ORDER = ['home', 'calendar', 'settings'];

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  // Don't swipe if modal/alert is open
  if (!DOM.taskModal.classList.contains('hidden'))    return;
  if (!DOM.alertOverlay.classList.contains('hidden')) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;

  const idx = PAGES_ORDER.indexOf(state.currentPage);
  if (dx < 0 && idx < PAGES_ORDER.length - 1) navigateTo(PAGES_ORDER[idx + 1]);
  if (dx > 0 && idx > 0)                      navigateTo(PAGES_ORDER[idx - 1]);
}, { passive: true });

/* ─────────────────────────────────────────────────────────────
   25. DEMO DATA (first run)
───────────────────────────────────────────────────────────── */
function seedDemoData() {
  if (state.tasks.length > 0) return; // don't seed if tasks exist

  const today = todayString();
  const now   = new Date();
  const soon  = `${pad2(now.getHours())}:${pad2(Math.min(59, now.getMinutes() + 2))}`;

  state.tasks = [
    {
      id: genId(), title: 'أذان الفجر', desc: 'اذان - قوم صلي',
      date: today, time: '05:00', icon: '🕌', color: '#6C63FF',
      enabled: true, done: false, createdAt: Date.now(),
    },
    {
      id: genId(), title: 'تناول الدواء', desc: 'لا تنسَ تناول الدواء',
      date: today, time: soon, icon: '💊', color: '#FF8B94',
      enabled: true, done: false, createdAt: Date.now(),
    },
    {
      id: genId(), title: 'أذان الظهر', desc: 'اذان - قوم صلي',
      date: today, time: '12:30', icon: '🕌', color: '#FFA23A',
      enabled: true, done: false, createdAt: Date.now(),
    },
  ];
  saveTasks();
}

/* ─────────────────────────────────────────────────────────────
   26. INITIALIZATION
───────────────────────────────────────────────────────────── */
function init() {
  loadData();
  applySettings();
  seedDemoData();
  initOnboarding();
  renderGreeting();
  renderHomeList();

  // Start the time-check ticker (every 30 seconds)
  state.checkInterval = setInterval(checkTaskAlerts, 30_000);
  checkTaskAlerts(); // immediate check on load

  // Register PWA service worker
  registerServiceWorker();

  console.log(`%c👁️ بصيرة v${APP_VERSION}`, 'color:#6C63FF;font-size:1.2rem;font-weight:bold;');
}

// Boot the app
init();
