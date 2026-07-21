/* ================================================================
   GRADETRACK — CORE APPLICATION SCRIPT
   ================================================================
   Single global namespace `GradeTrack` holding independent modules.
   Feature screens register render hooks via
   GradeTrack.Router.onEnter(screenName, callback) so this file
   grows feature-by-feature without rewriting existing code.
================================================================= */

window.GradeTrack = window.GradeTrack || {};

/* ================================================================
   1. CONSTANTS
================================================================= */
GradeTrack.Constants = (function () {
  const GRADE_SCALES = {
    '4.0': {
      label: '4.0 Scale',
      max: 4.0,
      grades: [
        { code: 'A+', point: 4.0 }, { code: 'A', point: 4.0 }, { code: 'A-', point: 3.7 },
        { code: 'B+', point: 3.3 }, { code: 'B', point: 3.0 }, { code: 'B-', point: 2.7 },
        { code: 'C+', point: 2.3 }, { code: 'C', point: 2.0 }, { code: 'C-', point: 1.7 },
        { code: 'D+', point: 1.3 }, { code: 'D', point: 1.0 }, { code: 'D-', point: 0.7 },
        { code: 'F', point: 0.0 }
      ]
    },
    '5.0': {
      label: '5.0 Scale',
      max: 5.0,
      grades: [
        { code: 'A', point: 5.0 }, { code: 'B', point: 4.0 }, { code: 'C', point: 3.0 },
        { code: 'D', point: 2.0 }, { code: 'E', point: 1.0 }, { code: 'F', point: 0.0 }
      ]
    },
    '10.0': {
      label: '10.0 Scale',
      max: 10.0,
      grades: [
        { code: 'O', point: 10.0 }, { code: 'A+', point: 9.0 }, { code: 'A', point: 8.0 },
        { code: 'B+', point: 7.0 }, { code: 'B', point: 6.0 }, { code: 'C', point: 5.0 },
        { code: 'D', point: 4.0 }, { code: 'F', point: 0.0 }
      ]
    }
  };

  const DEFAULT_SCALE = '4.0';

  const STATUS_BANDS = [
    { minRatio: 0.875, label: "Dean's List", badgeClass: 'badge' },
    { minRatio: 0.5, label: 'Good Standing', badgeClass: 'badge badge--neutral' },
    { minRatio: 0, label: 'Academic Warning', badgeClass: 'badge badge--warning' }
  ];

  const STORAGE_KEY = 'gradetrack_data';
  const APP_VERSION = '1.0.0';

  return { GRADE_SCALES, DEFAULT_SCALE, STATUS_BANDS, STORAGE_KEY, APP_VERSION };
})();

/* ================================================================
   2. UTILS
================================================================= */
GradeTrack.Utils = (function () {
  function generateId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function formatGPA(value) {
    const num = Number(value);
    if (!isFinite(num)) return '0.00';
    return num.toFixed(2);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  return { generateId, formatGPA, clamp, qs, qsa, escapeHTML };
})();

/* ================================================================
   3. TELEGRAM MODULE
================================================================= */
GradeTrack.Telegram = (function () {
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  function init() {
    if (!tg) return;
    tg.ready();
    tg.expand();
    applyTheme();
    tg.onEvent('themeChanged', applyTheme);
  }

  function applyTheme() {
    if (!tg) return;
    try {
      tg.setHeaderColor('#09090F');
      tg.setBackgroundColor('#09090F');
    } catch (e) {
      // Older clients may not support these calls — safe to ignore.
    }
  }

  function hapticImpact(style) {
    if (!tg || !tg.HapticFeedback) return;
    tg.HapticFeedback.impactOccurred(style || 'light');
  }

  function hapticNotification(type) {
    if (!tg || !tg.HapticFeedback) return;
    tg.HapticFeedback.notificationOccurred(type || 'success');
  }

  let backButtonHandler = null;
  function showBackButton(onClick) {
    if (!tg || !tg.BackButton) return;
    if (backButtonHandler) tg.BackButton.offClick(backButtonHandler);
    backButtonHandler = onClick;
    tg.BackButton.onClick(backButtonHandler);
    tg.BackButton.show();
  }

  function hideBackButton() {
    if (!tg || !tg.BackButton) return;
    if (backButtonHandler) {
      tg.BackButton.offClick(backButtonHandler);
      backButtonHandler = null;
    }
    tg.BackButton.hide();
  }

  let mainButtonHandler = null;
  function setMainButton(text, onClick, options) {
    if (!tg || !tg.MainButton) return;
    if (mainButtonHandler) tg.MainButton.offClick(mainButtonHandler);
    mainButtonHandler = onClick;
    tg.MainButton.setText(text);
    tg.MainButton.onClick(mainButtonHandler);
    tg.MainButton.setParams({
      color: (options && options.color) || '#7C5CFF',
      text_color: '#FFFFFF'
    });
    tg.MainButton.show();
  }

  function hideMainButton() {
    if (!tg || !tg.MainButton) return;
    if (mainButtonHandler) {
      tg.MainButton.offClick(mainButtonHandler);
      mainButtonHandler = null;
    }
    tg.MainButton.hide();
  }

  function getTelegramUserFirstName() {
    if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) return null;
    return tg.initDataUnsafe.user.first_name || null;
  }

  return {
    tg, init, applyTheme, hapticImpact, hapticNotification,
    showBackButton, hideBackButton, setMainButton, hideMainButton,
    getTelegramUserFirstName
  };
})();

/* ================================================================
   4. STORAGE MODULE
================================================================= */
GradeTrack.Storage = (function () {
  const KEY = GradeTrack.Constants.STORAGE_KEY;

  function defaultData() {
    const now = new Date().toISOString();
    return {
      version: GradeTrack.Constants.APP_VERSION,
      settings: { gradingScale: GradeTrack.Constants.DEFAULT_SCALE, studentName: '' },
      semesters: [],
      meta: { createdAt: now, lastModified: now }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.semesters)) {
        return defaultData();
      }
      const base = defaultData();
      return {
        version: parsed.version || base.version,
        settings: Object.assign({}, base.settings, parsed.settings),
        semesters: parsed.semesters,
        meta: Object.assign({}, base.meta, parsed.meta)
      };
    } catch (e) {
      console.error('GradeTrack: failed to load data, using defaults.', e);
      return defaultData();
    }
  }

  function save(data) {
    try {
      data.meta = data.meta || {};
      data.meta.lastModified = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('GradeTrack: failed to save data.', e);
      return false;
    }
  }

  function reset() {
    const fresh = defaultData();
    save(fresh);
    return fresh;
  }

  function exportData(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gradetrack-backup-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function parseImportedFile(fileText) {
    let parsed;
    try {
      parsed = JSON.parse(fileText);
    } catch (e) {
      throw new Error('This file is not valid JSON.');
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.semesters)) {
      throw new Error('This file does not look like a GradeTrack backup.');
    }
    const base = defaultData();
    return {
      version: parsed.version || base.version,
      settings: Object.assign({}, base.settings, parsed.settings),
      semesters: parsed.semesters,
      meta: Object.assign({}, base.meta, parsed.meta)
    };
  }

  return { defaultData, load, save, reset, exportData, parseImportedFile };
})();

/* ================================================================
   5. STATE MODULE
================================================================= */
GradeTrack.State = (function () {
  let data = null;
  const subscribers = [];

  function init() { data = GradeTrack.Storage.load(); }
  function get() { return data; }

  function set(newData) {
    data = newData;
    GradeTrack.Storage.save(data);
    notify();
  }

  function mutate(mutatorFn) {
    mutatorFn(data);
    GradeTrack.Storage.save(data);
    notify();
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return function unsubscribe() {
      const idx = subscribers.indexOf(fn);
      if (idx > -1) subscribers.splice(idx, 1);
    };
  }

  function notify() {
    subscribers.forEach(function (fn) {
      try { fn(data); } catch (e) { console.error('GradeTrack: subscriber error', e); }
    });
  }

  return { init, get, set, mutate, subscribe };
})();

/* ================================================================
   6. TOAST MODULE
================================================================= */
GradeTrack.Toast = (function () {
  const container = document.getElementById('toast-container');

  function show(message, type) {
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' toast--' + type : '');
    const dot = document.createElement('span');
    dot.className = 'toast__dot';
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(dot);
    toast.appendChild(text);
    container.appendChild(toast);

    if (type === 'success') GradeTrack.Telegram.hapticNotification('success');
    if (type === 'error') GradeTrack.Telegram.hapticNotification('error');

    setTimeout(function () {
      toast.classList.add('is-leaving');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 2600);
  }

  return { show };
})();

/* ================================================================
   7. MODAL MODULE
================================================================= */
GradeTrack.Modal = (function () {
  const overlays = {
    course: document.getElementById('modal-overlay-course'),
    semester: document.getElementById('modal-overlay-semester'),
    confirm: document.getElementById('modal-overlay-confirm')
  };

  function open(name) {
    const el = overlays[name];
    if (!el) return;
    el.hidden = false;
    GradeTrack.Telegram.hapticImpact('light');
  }

  function close(name) {
    const el = overlays[name];
    if (!el) return;
    el.hidden = true;
  }

  function closeAll() { Object.keys(overlays).forEach(close); }

  function bindBackdropClose() {
    Object.keys(overlays).forEach(function (name) {
      const el = overlays[name];
      if (!el) return;
      el.addEventListener('click', function (e) {
        if (e.target === el) close(name);
      });
    });
  }

  let currentOnConfirm = null;
  function confirm(opts) {
    const titleEl = document.getElementById('modal-confirm-title');
    const textEl = document.getElementById('modal-confirm-text');
    const okBtn = document.getElementById('modal-confirm-ok-btn');
    if (titleEl) titleEl.textContent = opts.title || 'Are you sure?';
    if (textEl) textEl.textContent = opts.text || 'This action cannot be undone.';
    if (okBtn) okBtn.textContent = opts.confirmLabel || 'Delete';
    currentOnConfirm = opts.onConfirm || null;
    open('confirm');
  }

  function bindConfirmButtons() {
    const okBtn = document.getElementById('modal-confirm-ok-btn');
    const cancelBtn = document.getElementById('modal-confirm-cancel-btn');
    if (okBtn) {
      okBtn.addEventListener('click', function () {
        const fn = currentOnConfirm;
        currentOnConfirm = null;
        close('confirm');
        if (fn) fn();
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        currentOnConfirm = null;
        close('confirm');
      });
    }
  }

  function init() {
    bindBackdropClose();
    bindConfirmButtons();
    const courseCancelBtn = document.getElementById('course-form-cancel-btn');
    const semesterCancelBtn = document.getElementById('semester-form-cancel-btn');
    if (courseCancelBtn) courseCancelBtn.addEventListener('click', function () { close('course'); });
    if (semesterCancelBtn) semesterCancelBtn.addEventListener('click', function () { close('semester'); });
  }

  return { open, close, closeAll, confirm, init };
})();

/* ================================================================
   8. ROUTER MODULE
================================================================= */
GradeTrack.Router = (function () {
  const PRIMARY_SCREENS = ['dashboard', 'semesters', 'calculator', 'trend', 'settings'];
  const ALL_SCREENS = ['dashboard', 'semesters', 'semester-detail', 'calculator', 'target', 'trend', 'settings'];

  let history = ['dashboard'];
  const hooks = {};

  function onEnter(screenName, callback) {
    if (!hooks[screenName]) hooks[screenName] = [];
    hooks[screenName].push(callback);
  }

  function runHooks(screenName) {
    (hooks[screenName] || []).forEach(function (fn) {
      try { fn(GradeTrack.State.get()); } catch (e) { console.error('GradeTrack: render hook error for', screenName, e); }
    });
  }

  function current() { return history[history.length - 1]; }

  function render(screenName) {
    ALL_SCREENS.forEach(function (name) {
      const el = document.getElementById('screen-' + name);
      if (!el) return;
      el.classList.toggle('is-active', name === screenName);
    });

    GradeTrack.Utils.qsa('.bottom-nav__item').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-nav') === screenName);
    });

    if (PRIMARY_SCREENS.indexOf(screenName) === -1) {
      GradeTrack.Telegram.showBackButton(function () { back(); });
    } else {
      GradeTrack.Telegram.hideBackButton();
    }

    runHooks(screenName);
  }

  function navigate(screenName, opts) {
    opts = opts || {};
    if (ALL_SCREENS.indexOf(screenName) === -1) return;

    if (PRIMARY_SCREENS.indexOf(screenName) > -1) {
      history = [screenName];
    } else {
      history.push(screenName);
    }
    render(screenName);
    if (opts.haptic !== false) GradeTrack.Telegram.hapticImpact('light');
  }

  function back() {
    if (history.length > 1) {
      history.pop();
      render(current());
    } else {
      render('dashboard');
      history = ['dashboard'];
    }
  }

  function bindNavClicks() {
    document.addEventListener('click', function (e) {
      const target = e.target.closest('[data-nav]');
      if (!target) return;
      const screen = target.getAttribute('data-nav');
      if (screen) navigate(screen);
    });
  }

  function init() {
    bindNavClicks();
    render('dashboard');
  }

  return { init, navigate, back, onEnter, current, PRIMARY_SCREENS, ALL_SCREENS };
})();

/* ================================================================
   9. BOOTSTRAP
================================================================= */


document.addEventListener('DOMContentLoaded', function () {
  GradeTrack.Telegram.init();
  GradeTrack.State.init();
  GradeTrack.Modal.init();
  GradeTrack.Router.init();
  GradeTrack.Dashboard.init();
});


  // Feature modules register their own Router.onEnter hooks and
  // State.subscribe listeners in sections appended below.
});

/* ================================================================
   >>> FUTURE STEPS APPEND NEW FEATURE MODULES BELOW THIS LINE <<<
================================================================= */







/* ================================================================
   10. CALC MODULE
   Shared GPA/CGPA/status math used by Dashboard, Semesters, Target,
   and Trend. Keeping this in one place means every screen agrees
   on the same numbers.
================================================================= */
GradeTrack.Calc = (function () {

  function getActiveScale(state) {
    const key = (state.settings && state.settings.gradingScale) || GradeTrack.Constants.DEFAULT_SCALE;
    return GradeTrack.Constants.GRADE_SCALES[key] || GradeTrack.Constants.GRADE_SCALES[GradeTrack.Constants.DEFAULT_SCALE];
  }

  function pointForGrade(scale, gradeCode) {
    const found = scale.grades.find(function (g) { return g.code === gradeCode; });
    return found ? found.point : 0;
  }

  // GPA for a single semester: credit-weighted average of its courses.
  function computeSemesterGPA(semester, scale) {
    const courses = semester.courses || [];
    let totalPoints = 0;
    let totalCredits = 0;
    courses.forEach(function (course) {
      const credits = Number(course.credits) || 0;
      const point = pointForGrade(scale, course.grade);
      totalPoints += point * credits;
      totalCredits += credits;
    });
    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return { gpa, totalCredits };
  }

  // CGPA across all semesters: credit-weighted average of every course
  // in every semester (equivalent to averaging semester GPAs weighted
  // by each semester's credit load).
  function computeCGPA(semesters, scale) {
    let totalPoints = 0;
    let totalCredits = 0;
    (semesters || []).forEach(function (semester) {
      (semester.courses || []).forEach(function (course) {
        const credits = Number(course.credits) || 0;
        const point = pointForGrade(scale, course.grade);
        totalPoints += point * credits;
        totalCredits += credits;
      });
    });
    const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return { cgpa, totalCredits };
  }

  // Academic status band based on CGPA-to-scale-max ratio, so it
  // works identically regardless of which grading scale is active.
  function getAcademicStatus(cgpa, scale, hasAnyCredits) {
    if (!hasAnyCredits) {
      return { label: 'No Data Yet', badgeClass: 'badge badge--neutral' };
    }
    const ratio = GradeTrack.Utils.clamp(cgpa / scale.max, 0, 1);
    const bands = GradeTrack.Constants.STATUS_BANDS;
    for (let i = 0; i < bands.length; i++) {
      if (ratio >= bands[i].minRatio) return bands[i];
    }
    return bands[bands.length - 1];
  }

  return { getActiveScale, pointForGrade, computeSemesterGPA, computeCGPA, getAcademicStatus };
})();

/* ================================================================
   11. SELECTION MODULE
   Tiny shared piece of state (not persisted) that tracks which
   semester/course a secondary screen is currently focused on —
   e.g. Dashboard/Semesters set this before navigating to
   Semester Detail; the Course modal uses it to know whether it's
   adding vs. editing.
================================================================= */
GradeTrack.Selection = (function () {
  let semesterId = null;
  let courseId = null; // null = adding a new course, set = editing

  return {
    getSemesterId: function () { return semesterId; },
    setSemesterId: function (id) { semesterId = id; },
    getCourseId: function () { return courseId; },
    setCourseId: function (id) { courseId = id; }
  };
})();

/* ================================================================
   12. TEMPLATES MODULE
   Small reusable HTML-string builders shared across screens, so
   the Semester Card markup (used on both Dashboard and the full
   Semesters list) is defined exactly once.
================================================================= */
GradeTrack.Templates = (function () {
  function semesterCardHTML(semester, gpa, totalCredits) {
    const name = GradeTrack.Utils.escapeHTML(semester.name);
    const courseCount = (semester.courses || []).length;
    const courseLabel = courseCount === 1 ? 'course' : 'courses';
    return (
      '<button class="semester-card" type="button" data-semester-id="' + semester.id + '">' +
        '<div class="semester-card__info">' +
          '<div class="semester-card__name">' + name + '</div>' +
          '<div class="semester-card__meta">' + courseCount + ' ' + courseLabel + ' &middot; ' + totalCredits + ' credits</div>' +
        '</div>' +
        '<div class="semester-card__gpa">' +
          '<span class="semester-card__gpa-value">' + GradeTrack.Utils.formatGPA(gpa) + '</span>' +
          '<span class="semester-card__gpa-label">GPA</span>' +
        '</div>' +
      '</button>'
    );
  }

  return { semesterCardHTML };
})();

/* ================================================================
   13. DASHBOARD MODULE
================================================================= */
GradeTrack.Dashboard = (function () {
  let miniChart = null;

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function getDisplayName(state) {
    const stored = (state.settings.studentName || '').trim();
    if (stored) return stored;
    const tgName = GradeTrack.Telegram.getTelegramUserFirstName();
    if (tgName) return tgName;
    return 'Student';
  }

  function renderHeroRing(cgpa, scale, hasCredits) {
    const ringEl = document.getElementById('hero-ring-progress');
    const valueEl = document.getElementById('hero-cgpa-value');
    const scaleNoteEl = document.getElementById('dashboard-scale-note');
    const circumference = 389.6;
    const ratio = hasCredits ? GradeTrack.Utils.clamp(cgpa / scale.max, 0, 1) : 0;
    const offset = circumference * (1 - ratio);
    if (ringEl) ringEl.style.setProperty('--ring-offset', offset.toFixed(1));
    if (valueEl) valueEl.textContent = GradeTrack.Utils.formatGPA(cgpa);
    if (scaleNoteEl) scaleNoteEl.textContent = 'out of ' + scale.max.toFixed(2);
  }

  function renderStatusBadge(cgpa, scale, hasCredits) {
    const badgeEl = document.getElementById('dashboard-status-badge');
    if (!badgeEl) return;
    const status = GradeTrack.Calc.getAcademicStatus(cgpa, scale, hasCredits);
    badgeEl.textContent = status.label;
    badgeEl.className = status.badgeClass;
  }

  function renderStats(state, totalCredits) {
    const creditsEl = document.getElementById('dashboard-credits-value');
    const semestersEl = document.getElementById('dashboard-semesters-value');
    if (creditsEl) creditsEl.textContent = totalCredits;
    if (semestersEl) semestersEl.textContent = state.semesters.length;
  }

  function renderTrendPreview(state, scale) {
    const canvas = document.getElementById('dashboard-trend-chart');
    const emptyEl = document.getElementById('dashboard-trend-empty');
    const semesters = state.semesters;

    if (semesters.length < 2) {
      if (canvas) canvas.style.display = 'none';
      if (emptyEl) emptyEl.classList.add('is-visible');
      if (miniChart) { miniChart.destroy(); miniChart = null; }
      return;
    }

    if (canvas) canvas.style.display = 'block';
    if (emptyEl) emptyEl.classList.remove('is-visible');

    const labels = semesters.map(function (s) { return s.name; });
    const data = semesters.map(function (s) { return GradeTrack.Calc.computeSemesterGPA(s, scale).gpa; });

    if (miniChart) miniChart.destroy();
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 90);
    gradient.addColorStop(0, 'rgba(124, 92, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(124, 92, 255, 0)');

    miniChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          borderColor: '#9E6CFF',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: '#7C5CFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { display: false },
          y: { display: false, min: 0, max: scale.max }
        }
      }
    });
  }

  function renderRecentSemesters(state, scale) {
    const listEl = document.getElementById('dashboard-recent-semesters');
    const emptyEl = document.getElementById('dashboard-semesters-empty');
    if (!listEl) return;

    const recent = state.semesters.slice(-3).reverse();

    if (recent.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.add('is-visible');
      return;
    }
    if (emptyEl) emptyEl.classList.remove('is-visible');

    listEl.innerHTML = recent.map(function (semester) {
      const info = GradeTrack.Calc.computeSemesterGPA(semester, scale);
      return GradeTrack.Templates.semesterCardHTML(semester, info.gpa, info.totalCredits);
    }).join('');
  }

  function render(state) {
    const scale = GradeTrack.Calc.getActiveScale(state);
    const cgpaInfo = GradeTrack.Calc.computeCGPA(state.semesters, scale);
    const hasCredits = cgpaInfo.totalCredits > 0;

    const greetingEl = document.getElementById('dashboard-greeting');
    const nameEl = document.getElementById('dashboard-username');
    if (greetingEl) greetingEl.textContent = getGreeting();
    if (nameEl) nameEl.textContent = getDisplayName(state);

    renderHeroRing(cgpaInfo.cgpa, scale, hasCredits);
    renderStatusBadge(cgpaInfo.cgpa, scale, hasCredits);
    renderStats(state, cgpaInfo.totalCredits);
    renderTrendPreview(state, scale);
    renderRecentSemesters(state, scale);
  }

  // Tapping a semester card anywhere (Dashboard or later, Semesters
  // list) navigates to Semester Detail with that semester selected.
  function bindSemesterCardClicks() {
    document.addEventListener('click', function (e) {
      const card = e.target.closest('.semester-card');
      if (!card) return;
      const id = card.getAttribute('data-semester-id');
      if (!id) return;
      GradeTrack.Selection.setSemesterId(id);
      GradeTrack.Router.navigate('semester-detail');
    });
  }

  function init() {
    const settingsBtn = document.getElementById('dashboard-settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', function () {
      GradeTrack.Router.navigate('settings');
    });

    // Opens the Add Semester sheet; Semester Management (next step)
    // wires the actual save logic to this same modal's form.
    const addSemesterBtn = document.getElementById('qa-add-semester');
    if (addSemesterBtn) addSemesterBtn.addEventListener('click', function () {
      GradeTrack.Selection.setSemesterId(null);
      GradeTrack.Modal.open('semester');
    });

    bindSemesterCardClicks();

    GradeTrack.Router.onEnter('dashboard', render);
    GradeTrack.State.subscribe(function (state) {
      if (GradeTrack.Router.current() === 'dashboard') render(state);
    });
  }

  return { init, render };
})();

/* ================================================================
   >>> FUTURE STEPS APPEND NEW FEATURE MODULES BELOW THIS LINE <<<
================================================================= */
