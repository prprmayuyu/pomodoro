(() => {
  const RECORDS_KEY = 'records_v1';
  const HIDDEN_KEY = 'task_shortcuts_hidden_v2';
  const task = document.getElementById('task');
  const start = document.getElementById('start');
  if (!task || !start) return;

  task.placeholder = '可留空，默认记为“专注”';

  const style = document.createElement('style');
  style.textContent = `
    .task-history-wrap{max-width:440px;margin:10px auto 0}
    .task-history-help{font-size:11px;color:var(--muted);margin-bottom:7px}
    .task-history{display:flex;flex-wrap:wrap;gap:7px}
    .task-chip{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:999px;padding:7px 11px;font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:none;-webkit-user-select:none;touch-action:manipulation}
    .task-chip.on{border-color:var(--primary)}
    .task-chip:disabled{opacity:.45}
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'task-history-wrap';
  wrap.style.display = 'none';
  wrap.innerHTML = '<div class="task-history-help">最近做过 · 轻点选择，长按删除</div><div class="task-history"></div>';
  const field = task.closest('.field');
  field.insertAdjacentElement('afterend', wrap);
  const list = wrap.querySelector('.task-history');

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function timerState() {
    return readJson('timer_v1', { running: false, paused: false, name: '' });
  }

  function hiddenNames() {
    const value = readJson(HIDDEN_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function recentNames() {
    const records = readJson(RECORDS_KEY, []);
    const hidden = new Set(hiddenNames());
    const seen = new Set();
    const names = [];
    if (!Array.isArray(records)) return names;
    records.slice().reverse().forEach(record => {
      const name = String(record && record.name || '').trim();
      if (!name || name === '专注' || hidden.has(name) || seen.has(name)) return;
      seen.add(name);
      names.push(name);
    });
    return names.slice(0, 12);
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('on');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('on'), 1500);
  }

  function removeShortcut(name) {
    const hidden = hiddenNames();
    if (!hidden.includes(name)) hidden.push(name);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
    renderShortcuts();
    showToast('已删除常用词条');
  }

  function renderShortcuts() {
    const names = recentNames();
    const state = timerState();
    const busy = !!(state.running || state.paused);
    wrap.style.display = names.length ? 'block' : 'none';
    list.innerHTML = '';

    names.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'task-chip' + (task.value.trim() === name ? ' on' : '');
      button.textContent = name;
      button.disabled = busy;
      button.setAttribute('aria-label', `${name}，轻点选择，长按删除`);

      let holdTimer = null;
      let longPressed = false;
      button.addEventListener('pointerdown', () => {
        longPressed = false;
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          longPressed = true;
          removeShortcut(name);
        }, 600);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
        button.addEventListener(type, () => clearTimeout(holdTimer));
      });
      button.addEventListener('contextmenu', event => event.preventDefault());
      button.addEventListener('click', event => {
        if (longPressed) {
          event.preventDefault();
          longPressed = false;
          return;
        }
        if (timerState().running || timerState().paused) return;
        task.value = name;
        renderShortcuts();
      });
      list.appendChild(button);
    });
  }

  function prepareDefaultFocus() {
    const state = timerState();
    if (state.running || state.paused || task.value.trim()) return;
    task.value = '专注';
    setTimeout(() => {
      const next = timerState();
      if ((next.running || next.paused) && next.name === '专注') task.value = '';
    }, 0);
  }

  start.addEventListener('click', prepareDefaultFocus, true);
  task.addEventListener('keydown', event => {
    if (event.key === 'Enter') prepareDefaultFocus();
  }, true);
  task.addEventListener('input', renderShortcuts);

  let lastRecords = localStorage.getItem(RECORDS_KEY) || '';
  setInterval(() => {
    const state = timerState();
    if ((state.running || state.paused) && state.name === '专注' && task.disabled && task.value === '专注') {
      task.value = '';
    }
    const currentRecords = localStorage.getItem(RECORDS_KEY) || '';
    if (currentRecords !== lastRecords) {
      lastRecords = currentRecords;
      renderShortcuts();
    } else {
      const busy = !!(state.running || state.paused);
      list.querySelectorAll('.task-chip').forEach(button => { button.disabled = busy; });
    }
  }, 500);

  renderShortcuts();
})();
