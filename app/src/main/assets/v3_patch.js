(() => {
  const LIFE_KEY = 'lifestyle_reminders_v3';
  const MIGRATION_KEY = 'lifestyle_migrated_v3';
  const OLD_KEY = 'reminders_v1';
  const ICON_KEY = 'custom_icon_text_v3';
  const $ = id => document.getElementById(id);
  const hasNative = () => typeof Android !== 'undefined';

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('on'), 1700);
  }

  function call(method, ...args) {
    try {
      if (hasNative() && typeof Android[method] === 'function') return Android[method](...args);
    } catch (_) {}
    return null;
  }

  const style = document.createElement('style');
  style.textContent = `
    .nav{gap:0}.nav button{flex:1;padding:3px 0}
    .life-page h2,.icon-settings h2{font-size:17px;margin:0}
    .life-page>p,.icon-settings>p{font-size:13px;color:var(--muted);margin:5px 0 14px;line-height:1.5}
    .life-section-title{display:flex;justify-content:space-between;align-items:center;margin:24px 0 10px}
    .life-section-title b{font-size:15px}.life-section-title small{color:var(--muted);font-size:11px}
    .quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .quick-card{border:1px solid var(--border);background:transparent;color:var(--text);border-radius:17px;padding:13px;text-align:left;min-height:104px;display:flex;flex-direction:column}
    .quick-card.added{opacity:.58}.quick-icon{font-size:24px;line-height:1;margin-bottom:8px}.quick-name{font-weight:650;font-size:14px}.quick-desc{color:var(--muted);font-size:11px;line-height:1.4;margin-top:4px;flex:1}.quick-action{font-size:11px;margin-top:8px;color:var(--primary)}
    .life-list{display:grid;gap:9px}.life-empty{background:var(--surface);border-radius:16px;padding:18px;text-align:center;color:var(--muted);font-size:12px;line-height:1.6}
    .life-item{background:var(--surface);border-radius:17px;padding:12px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center}
    .life-item.off{opacity:.62}.life-item-icon{width:38px;height:38px;border-radius:12px;background:var(--bg);display:grid;place-items:center;font-size:20px}
    .life-item-main{min-width:0}.life-item-title{font-size:14px;font-weight:650;display:flex;align-items:center;gap:6px}.life-item-summary{font-size:11px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.life-item-message{font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .life-item-actions{display:flex;align-items:center;gap:3px}.life-tiny{border:0;background:transparent;color:var(--muted);font-size:11px;padding:7px 4px}
    .life-add{width:100%;margin-top:10px}
    .life-editor{display:none;border:1px solid var(--border);border-radius:18px;padding:13px;margin-top:12px}.life-editor.on{display:block}
    .life-editor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.life-editor-head b{font-size:14px}.life-editor-head button{border:0;background:none;color:var(--muted);font-size:13px}
    .life-grid{display:grid;grid-template-columns:76px 1fr;gap:8px;margin-bottom:8px}.life-grid .input{min-width:0}.life-icon-input{text-align:center;font-size:20px}
    .life-label{font-size:11px;color:var(--muted);margin:11px 0 6px}.life-select{width:100%;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:14px;padding:12px;font-size:14px}
    .life-time-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.life-time-row.one{grid-template-columns:1fr}.life-time-row input{width:100%;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:14px;padding:11px;font-size:14px}
    .weekday-row{display:flex;gap:5px;flex-wrap:wrap}.weekday{width:34px;height:34px;border-radius:11px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:11px}.weekday.on{background:var(--primary);border-color:var(--primary);color:var(--pt)}
    .life-save-row{display:flex;gap:8px;margin-top:13px}.life-save-row .btn.primary{flex:1}
    .icon-settings{margin:0 0 28px}.icon-box{background:var(--surface);border-radius:18px;padding:14px}.icon-layout{display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:center}.icon-preview{width:92px;height:92px;border-radius:24px;background:var(--bg);display:grid;place-items:center;font-size:44px;overflow:hidden;border:1px solid var(--border)}
    .icon-controls .input{background:var(--bg)}.icon-help{font-size:11px;color:var(--muted);line-height:1.45;margin:7px 0 10px}.icon-button{width:100%}
    .v3-version{text-align:center;color:var(--muted);font-size:11px;margin-top:24px}
    @media(max-width:390px){.quick-grid{grid-template-columns:1fr}.icon-layout{grid-template-columns:76px 1fr}.icon-preview{width:76px;height:76px;border-radius:20px;font-size:36px}}
  `;
  document.head.appendChild(style);

  function reminders() {
    const value = readJson(LIFE_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function setReminders(value) {
    saveJson(LIFE_KEY, value);
  }

  function scheduleReminder(reminder) {
    if (!reminder.enabled) {
      call('cancelLifestyleReminder', reminder.id);
      return;
    }
    call('scheduleLifestyleReminder', JSON.stringify(reminder));
  }

  function syncAll() {
    reminders().forEach(scheduleReminder);
  }

  function migrateOldReminders() {
    if (localStorage.getItem(MIGRATION_KEY)) return;
    const old = readJson(OLD_KEY, []);
    const next = reminders();
    if (Array.isArray(old)) {
      old.forEach(item => {
        if (!item || !item.id || next.some(x => x.migratedFrom === item.id)) return;
        const parts = String(item.time || '09:00').split(':').map(Number);
        next.push({
          id: 'life_migrated_' + item.id,
          migratedFrom: item.id,
          template: item.id === 'default_work' ? 'work' : '',
          icon: item.id === 'default_work' ? '☀️' : '🔔',
          title: item.id === 'default_work' ? '开始工作' : '自定义提醒',
          message: String(item.message || '该开始工作了'),
          mode: 'daily',
          enabled: item.enabled !== false,
          hour: Number.isFinite(parts[0]) ? parts[0] : 9,
          minute: Number.isFinite(parts[1]) ? parts[1] : 0,
          daysMask: 127
        });
        call('cancelDailyReminder', item.id);
        item.enabled = false;
      });
      saveJson(OLD_KEY, old);
    }
    setReminders(next);
    localStorage.setItem(MIGRATION_KEY, '1');
  }

  const templates = [
    {key:'work', icon:'☀️', title:'开始工作', desc:'每天 09:00', message:'该开始工作了', mode:'daily', hour:9, minute:0},
    {key:'water', icon:'💧', title:'喝水', desc:'09:00–19:00 · 每 2 小时', message:'喝口水吧 💧', mode:'interval', startHour:9, startMinute:0, endHour:19, endMinute:0, intervalHours:2},
    {key:'move', icon:'🌿', title:'活动一下', desc:'09:00–18:00 · 每 1 小时', message:'坐得有点久了，起来活动一下。', mode:'interval', startHour:9, startMinute:0, endHour:18, endMinute:0, intervalHours:1},
    {key:'exercise', icon:'🏃', title:'运动', desc:'每天 18:30', message:'今天的运动还没做哦。', mode:'daily', hour:18, minute:30}
  ];

  function addTemplate(template) {
    const list = reminders();
    if (list.some(x => x.template === template.key)) {
      toast('这个快捷提醒已经添加了');
      return;
    }
    const reminder = Object.assign({
      id: 'life_' + Date.now(),
      enabled: true,
      template: template.key,
      daysMask: 127
    }, template);
    delete reminder.key;
    delete reminder.desc;
    list.push(reminder);
    setReminders(list);
    scheduleReminder(reminder);
    renderReminderPage();
    toast('提醒已添加');
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function timeOf(r) {
    return `${pad(r.hour == null ? 9 : r.hour)}:${pad(r.minute || 0)}`;
  }

  function intervalTime(r, prefix) {
    return `${pad(r[prefix + 'Hour'] == null ? (prefix === 'start' ? 9 : 19) : r[prefix + 'Hour'])}:${pad(r[prefix + 'Minute'] || 0)}`;
  }

  function weekdayText(mask) {
    const names = ['日','一','二','三','四','五','六'];
    const selected = [];
    for (let i = 1; i <= 6; i++) if (mask & (1 << i)) selected.push('周' + names[i]);
    if (mask & 1) selected.push('周日');
    return selected.join('、') || '未选择日期';
  }

  function summary(r) {
    if (r.mode === 'interval') return `${intervalTime(r,'start')}–${intervalTime(r,'end')} · 每 ${r.intervalHours || 2} 小时`;
    if (r.mode === 'weekdays') return `工作日 ${timeOf(r)}`;
    if (r.mode === 'weekly') return `${weekdayText(r.daysMask || 62)} · ${timeOf(r)}`;
    if (r.mode === 'once') {
      const d = new Date(r.onceAt || 0);
      if (!Number.isFinite(d.getTime())) return '仅一次';
      return `${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return `每天 ${timeOf(r)}`;
  }

  const nav = document.querySelector('.nav');
  const settingsButton = nav && nav.querySelector('[data-v="settings"]');
  const reminderButton = document.createElement('button');
  reminderButton.dataset.v = 'reminderHub';
  reminderButton.textContent = '提醒';
  if (nav && settingsButton) nav.insertBefore(reminderButton, settingsButton);

  const reminderPage = document.createElement('section');
  reminderPage.id = 'reminderHub';
  reminderPage.className = 'view life-page';
  reminderPage.innerHTML = `
    <h2>提醒</h2>
    <p>喝水、活动、运动和日常节奏。番茄钟自己的休息提醒仍由计时器自动处理。</p>
    <div class="life-section-title"><b>快捷提醒</b><small>点一下就添加</small></div>
    <div id="quickReminders" class="quick-grid"></div>
    <div class="life-section-title"><b>我的提醒</b><small id="lifeCount"></small></div>
    <div id="lifeList" class="life-list"></div>
    <button id="newLife" class="btn life-add">＋ 新建提醒</button>
    <div id="lifeEditor" class="life-editor">
      <div class="life-editor-head"><b id="lifeEditorTitle">新建提醒</b><button id="closeLife" type="button">关闭</button></div>
      <div class="life-grid"><input id="lifeIcon" class="input life-icon-input" maxlength="8" value="🔔" aria-label="提醒图标"><input id="lifeTitle" class="input" maxlength="20" placeholder="提醒名称，例如：喝水"></div>
      <input id="lifeMessage" class="input" maxlength="60" placeholder="通知语，例如：喝口水吧">
      <div class="life-label">重复</div>
      <select id="lifeMode" class="life-select"><option value="daily">每天</option><option value="weekdays">工作日</option><option value="weekly">每周选择日期</option><option value="interval">每隔几小时</option><option value="once">仅一次</option></select>
      <div id="normalTimeGroup"><div class="life-label">时间</div><div class="life-time-row one"><input id="lifeTime" type="time" value="09:00"></div></div>
      <div id="weeklyGroup" style="display:none"><div class="life-label">日期</div><div id="weekdayRow" class="weekday-row"></div></div>
      <div id="intervalGroup" style="display:none"><div class="life-label">提醒时间段</div><div class="life-time-row"><input id="lifeStart" type="time" value="09:00"><input id="lifeEnd" type="time" value="19:00"></div><div class="life-label">间隔</div><select id="lifeInterval" class="life-select"><option value="1">每 1 小时</option><option value="2" selected>每 2 小时</option><option value="3">每 3 小时</option><option value="4">每 4 小时</option></select></div>
      <div id="onceGroup" style="display:none"><div class="life-label">日期和时间</div><div class="life-time-row one"><input id="lifeOnce" type="datetime-local"></div></div>
      <div class="life-save-row"><button id="saveLife" class="btn primary">保存提醒</button><button id="deleteLife" class="btn" style="display:none">删除</button></div>
    </div>
  `;
  const settings = $('settings');
  if (settings) settings.insertAdjacentElement('beforebegin', reminderPage);

  const weekdayData = [[1,'一'],[2,'二'],[3,'三'],[4,'四'],[5,'五'],[6,'六'],[0,'日']];
  const weekdayRow = $('weekdayRow');
  weekdayData.forEach(([day,label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'weekday';
    button.dataset.day = day;
    button.textContent = label;
    button.onclick = () => button.classList.toggle('on');
    weekdayRow.appendChild(button);
  });

  function renderQuick() {
    const current = reminders();
    $('quickReminders').innerHTML = '';
    templates.forEach(template => {
      const added = current.some(x => x.template === template.key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-card' + (added ? ' added' : '');
      button.innerHTML = `<div class="quick-icon">${esc(template.icon)}</div><div class="quick-name">${esc(template.title)}</div><div class="quick-desc">${esc(template.desc)}</div><div class="quick-action">${added ? '已添加' : '＋ 添加'}</div>`;
      button.onclick = () => addTemplate(template);
      $('quickReminders').appendChild(button);
    });
  }

  function renderList() {
    const list = reminders();
    $('lifeCount').textContent = `${list.filter(x => x.enabled).length} 个开启`;
    const host = $('lifeList');
    host.innerHTML = '';
    if (!list.length) {
      host.innerHTML = '<div class="life-empty">还没有生活提醒。<br>可以从上面的快捷提醒开始。</div>';
      return;
    }
    list.forEach(reminder => {
      const item = document.createElement('div');
      item.className = 'life-item' + (reminder.enabled ? '' : ' off');
      item.innerHTML = `
        <div class="life-item-icon">${esc(reminder.icon || '🔔')}</div>
        <div class="life-item-main"><div class="life-item-title">${esc(reminder.title || '提醒')}</div><div class="life-item-summary">${esc(summary(reminder))}</div><div class="life-item-message">${esc(reminder.message || '')}</div></div>
        <div class="life-item-actions"><label class="switch"><input type="checkbox" ${reminder.enabled ? 'checked' : ''}><i></i></label><button type="button" class="life-tiny edit">编辑</button></div>`;
      item.querySelector('input').onchange = event => {
        const next = reminders();
        const idx = next.findIndex(x => x.id === reminder.id);
        if (idx < 0) return;
        next[idx].enabled = event.target.checked;
        setReminders(next);
        scheduleReminder(next[idx]);
        renderReminderPage();
        toast(event.target.checked ? '提醒已开启' : '提醒已关闭');
      };
      item.querySelector('.edit').onclick = () => openEditor(reminder);
      host.appendChild(item);
    });
  }

  function renderReminderPage() {
    renderQuick();
    renderList();
  }

  function setModeUI(mode) {
    $('normalTimeGroup').style.display = ['daily','weekdays','weekly'].includes(mode) ? 'block' : 'none';
    $('weeklyGroup').style.display = mode === 'weekly' ? 'block' : 'none';
    $('intervalGroup').style.display = mode === 'interval' ? 'block' : 'none';
    $('onceGroup').style.display = mode === 'once' ? 'block' : 'none';
  }

  function defaultOnceValue() {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    date.setSeconds(0,0);
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function applyWeekMask(mask) {
    document.querySelectorAll('.weekday').forEach(button => {
      const day = Number(button.dataset.day);
      button.classList.toggle('on', !!(mask & (1 << day)));
    });
  }

  function readWeekMask() {
    let mask = 0;
    document.querySelectorAll('.weekday.on').forEach(button => { mask |= 1 << Number(button.dataset.day); });
    return mask;
  }

  function openEditor(reminder) {
    const isEdit = !!reminder;
    const value = reminder || {icon:'🔔',title:'',message:'',mode:'daily',hour:9,minute:0,daysMask:62,intervalHours:2,startHour:9,startMinute:0,endHour:19,endMinute:0};
    $('lifeEditor').classList.add('on');
    $('lifeEditor').dataset.id = isEdit ? value.id : '';
    $('lifeEditorTitle').textContent = isEdit ? '编辑提醒' : '新建提醒';
    $('lifeIcon').value = value.icon || '🔔';
    $('lifeTitle').value = value.title || '';
    $('lifeMessage').value = value.message || '';
    $('lifeMode').value = value.mode || 'daily';
    $('lifeTime').value = timeOf(value);
    $('lifeStart').value = intervalTime(value,'start');
    $('lifeEnd').value = intervalTime(value,'end');
    $('lifeInterval').value = String(value.intervalHours || 2);
    $('lifeOnce').value = value.onceAt ? (() => { const d=new Date(value.onceAt); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : defaultOnceValue();
    applyWeekMask(value.daysMask == null ? 62 : value.daysMask);
    $('deleteLife').style.display = isEdit ? 'block' : 'none';
    setModeUI($('lifeMode').value);
    setTimeout(() => $('lifeEditor').scrollIntoView({behavior:'smooth',block:'nearest'}), 40);
  }

  function closeEditor() {
    $('lifeEditor').classList.remove('on');
    $('lifeEditor').dataset.id = '';
  }

  function parseTime(value, fallbackH, fallbackM) {
    const parts = String(value || '').split(':').map(Number);
    return [Number.isFinite(parts[0]) ? parts[0] : fallbackH, Number.isFinite(parts[1]) ? parts[1] : fallbackM];
  }

  function saveEditor() {
    const title = $('lifeTitle').value.trim();
    const message = $('lifeMessage').value.trim();
    const icon = $('lifeIcon').value.trim() || '🔔';
    if (!title) { $('lifeTitle').focus(); toast('写一个提醒名称'); return; }
    if (!message) { $('lifeMessage').focus(); toast('写一句通知语'); return; }

    const mode = $('lifeMode').value;
    const [hour, minute] = parseTime($('lifeTime').value, 9, 0);
    const [startHour, startMinute] = parseTime($('lifeStart').value, 9, 0);
    const [endHour, endMinute] = parseTime($('lifeEnd').value, 19, 0);
    let onceAt = 0;
    if (mode === 'once') {
      onceAt = new Date($('lifeOnce').value).getTime();
      if (!Number.isFinite(onceAt) || onceAt <= Date.now()) { toast('请选择未来的时间'); return; }
    }
    let daysMask = readWeekMask();
    if (mode === 'weekly' && !daysMask) { toast('至少选择一天'); return; }

    const list = reminders();
    const id = $('lifeEditor').dataset.id;
    const index = list.findIndex(x => x.id === id);
    const old = index >= 0 ? list[index] : null;
    const next = {
      id: old ? old.id : 'life_' + Date.now(),
      template: old ? (old.template || '') : '',
      migratedFrom: old ? (old.migratedFrom || '') : '',
      icon, title, message, mode,
      enabled: true,
      hour, minute,
      daysMask: mode === 'weekly' ? daysMask : 127,
      intervalHours: Number($('lifeInterval').value || 2),
      startHour, startMinute, endHour, endMinute,
      onceAt
    };
    if (old) list[index] = next; else list.push(next);
    setReminders(list);
    scheduleReminder(next);
    closeEditor();
    renderReminderPage();
    toast(old ? '提醒已修改' : '提醒已新增');
  }

  function deleteEditorReminder() {
    const id = $('lifeEditor').dataset.id;
    if (!id) return;
    if (!confirm('删除这个提醒？')) return;
    const list = reminders();
    const index = list.findIndex(x => x.id === id);
    if (index < 0) return;
    call('cancelLifestyleReminder', id);
    list.splice(index, 1);
    setReminders(list);
    closeEditor();
    renderReminderPage();
    toast('提醒已删除');
  }

  $('newLife').onclick = () => openEditor(null);
  $('closeLife').onclick = closeEditor;
  $('lifeMode').onchange = () => setModeUI($('lifeMode').value);
  $('saveLife').onclick = saveEditor;
  $('deleteLife').onclick = deleteEditorReminder;

  reminderButton.onclick = () => {
    document.querySelectorAll('.nav button').forEach(x => x.classList.toggle('on', x === reminderButton));
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    reminderPage.classList.add('on');
    renderReminderPage();
  };

  function cleanOldSettingsReminderUI() {
    if (!settings) return;
    const oldList = $('rems');
    if (oldList) oldList.remove();
    const oldForm = settings.querySelector('.remForm');
    if (oldForm) oldForm.remove();
    const notificationHeading = Array.from(settings.querySelectorAll('h2')).find(h => h.textContent.trim() === '通知');
    if (notificationHeading) {
      notificationHeading.textContent = '通知权限';
      const p = notificationHeading.nextElementSibling;
      if (p && p.tagName === 'P') p.textContent = '生活提醒已经移到“提醒”页。这里仅保留系统权限设置。';
    }
    const fixed = settings.querySelector('.fixed');
    if (fixed) fixed.textContent = '番茄钟固定 25 分钟专注 + 5 分钟休息。专注结束和休息结束通知属于计时器本身，不显示在“提醒”列表里。';
  }

  function addIconSettings() {
    if (!settings || settings.querySelector('.icon-settings')) return;
    const perm = settings.querySelector('.perm');
    const block = document.createElement('div');
    block.className = 'icon-settings';
    block.innerHTML = `
      <h2>桌面图标</h2>
      <p>自由输入一个字、符号或 Emoji，生成一个属于你的桌面入口。</p>
      <div class="icon-box"><div class="icon-layout"><div id="iconPreview" class="icon-preview">🍅</div><div class="icon-controls"><input id="iconText" class="input" maxlength="12" placeholder="例如：番、✦、♡、🍅"><div class="icon-help">建议 1 个字 / 符号 / Emoji。背景会跟随当前主题；添加后原来的 App 图标仍会保留。</div><button id="pinIcon" class="btn primary icon-button">添加到桌面</button></div></div></div>`;
    if (perm) settings.insertBefore(block, perm.previousElementSibling || perm);
    else settings.appendChild(block);

    const stored = localStorage.getItem(ICON_KEY) || '🍅';
    $('iconText').value = stored;
    updateIconPreview();
    $('iconText').addEventListener('input', updateIconPreview);
    $('pinIcon').onclick = () => {
      const text = $('iconText').value.trim();
      if (!text) { $('iconText').focus(); toast('先输入一个字、符号或 Emoji'); return; }
      localStorage.setItem(ICON_KEY, text);
      if (!hasNative()) { toast('APK 中可以添加到桌面'); return; }
      let supported = true;
      try { supported = Android.canPinCustomShortcut(); } catch (_) {}
      if (!supported) { toast('当前桌面启动器不支持添加自定义入口'); return; }
      call('pinCustomShortcut', text, document.body.dataset.theme || 'mono');
      toast('请在系统弹窗中确认添加');
    };

    document.querySelectorAll('.theme').forEach(button => button.addEventListener('click', () => setTimeout(updateIconPreview, 0)));
    const version = document.createElement('div');
    version.className = 'v3-version';
    version.textContent = '一粒番茄茄 · v3';
    settings.appendChild(version);
  }

  function updateIconPreview() {
    const preview = $('iconPreview');
    const input = $('iconText');
    if (!preview || !input) return;
    preview.textContent = input.value.trim() || '🍅';
  }

  migrateOldReminders();
  cleanOldSettingsReminderUI();
  addIconSettings();
  renderReminderPage();
  syncAll();

  const previousResume = window.onNativeResume;
  window.onNativeResume = () => {
    if (typeof previousResume === 'function') previousResume();
    syncAll();
    renderReminderPage();
  };
})();
