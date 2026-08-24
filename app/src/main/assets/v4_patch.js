(() => {
  const $ = id => document.getElementById(id);
  const hasNative = () => typeof Android !== 'undefined';

  function call(method, ...args) {
    try {
      if (hasNative() && typeof Android[method] === 'function') return Android[method](...args);
    } catch (_) {}
    return null;
  }

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('on'), 1800);
  }

  const style = document.createElement('style');
  style.textContent = `
    .v4-alert-box{background:var(--surface);border-radius:17px;padding:12px 13px;margin:0 0 14px}
    .v4-alert-row{display:flex;align-items:center;gap:10px;padding:8px 0}
    .v4-alert-row+.v4-alert-row{border-top:1px solid var(--border)}
    .v4-alert-row>div{flex:1;min-width:0}.v4-alert-row b{font-size:13px}.v4-alert-row small{display:block;color:var(--muted);font-size:11px;margin-top:2px;line-height:1.4}
    .v4-test-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 22px}.v4-test-row .btn{min-height:42px;font-size:12px}
    .v4-warning{border:1px solid var(--border);border-radius:15px;padding:10px 12px;font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:12px}
  `;
  document.head.appendChild(style);

  function boolNative(method, fallback) {
    try {
      const value = call(method);
      return typeof value === 'boolean' ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function buildSwitch(id, checked) {
    return `<label class="switch"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}><i></i></label>`;
  }

  function renderReminderHealth() {
    const page = $('reminderHub');
    if (!page || $('v4ReminderHealth')) return;
    const permission = boolNative('hasNotificationPermission', true);
    const exact = boolNative('canScheduleExactAlarms', true);
    const box = document.createElement('div');
    box.id = 'v4ReminderHealth';
    box.className = 'v4-warning';
    box.innerHTML = permission && exact
      ? '提醒权限正常。若要验证手机后台提醒，可点下面的“10 秒后测试”。'
      : `${permission ? '' : '通知权限未开启；'}${exact ? '' : '精确提醒权限未开启，系统可能大幅延迟提醒。'} 请先到设置中开启。`;
    const anchor = page.querySelector('.life-section-title');
    if (anchor) page.insertBefore(box, anchor);
  }

  function refreshHealth() {
    const old = $('v4ReminderHealth');
    if (old) old.remove();
    renderReminderHealth();
  }

  function installTests() {
    const page = $('reminderHub');
    if (!page || $('v4Tests')) return;
    const row = document.createElement('div');
    row.id = 'v4Tests';
    row.className = 'v4-test-row';
    row.innerHTML = '<button id="v4TestNow" class="btn">立即测试通知</button><button id="v4TestAlarm" class="btn">10 秒后测试</button>';
    const p = page.querySelector('p');
    if (p) p.insertAdjacentElement('afterend', row);

    $('v4TestNow').onclick = () => {
      if (!boolNative('hasNotificationPermission', true)) {
        call('requestNotificationPermission');
        toast('请先允许通知权限');
        setTimeout(refreshHealth, 500);
        return;
      }
      call('sendTestNotification');
      toast('已发送测试通知');
    };
    $('v4TestAlarm').onclick = () => {
      if (!boolNative('hasNotificationPermission', true)) {
        call('requestNotificationPermission');
        toast('请先允许通知权限');
        return;
      }
      if (!boolNative('canScheduleExactAlarms', true)) {
        call('requestExactAlarmAccess');
        toast('请开启“闹钟和提醒”权限后再测试');
        return;
      }
      call('scheduleTestReminder', 10);
      toast('10 秒后会收到测试提醒');
    };
  }

  function installAlertSettings() {
    const settings = $('settings');
    if (!settings || $('v4AlertSettings')) return;
    const sound = boolNative('isReminderSoundEnabled', true);
    const vibrate = boolNative('isReminderVibrationEnabled', true);
    const block = document.createElement('div');
    block.id = 'v4AlertSettings';
    block.innerHTML = `
      <h2>提醒方式</h2>
      <p>番茄钟和生活提醒共用。默认声音与震动都开启。</p>
      <div class="v4-alert-box">
        <div class="v4-alert-row"><div><b>声音提示</b><small>使用手机默认通知声音</small></div>${buildSwitch('v4Sound', sound)}</div>
        <div class="v4-alert-row"><div><b>震动提示</b><small>通知到达时轻振两次</small></div>${buildSwitch('v4Vibrate', vibrate)}</div>
      </div>
    `;
    const fixed = settings.querySelector('.fixed');
    if (fixed) settings.insertBefore(block, fixed);
    else settings.appendChild(block);

    $('v4Sound').onchange = e => {
      call('setReminderSoundEnabled', !!e.target.checked);
      toast(e.target.checked ? '声音提示已开启' : '声音提示已关闭');
    };
    $('v4Vibrate').onchange = e => {
      call('setReminderVibrationEnabled', !!e.target.checked);
      toast(e.target.checked ? '震动提示已开启' : '震动提示已关闭');
    };
  }

  function install() {
    renderReminderHealth();
    installTests();
    installAlertSettings();
  }

  const previousResume = window.onNativeResume;
  window.onNativeResume = () => {
    if (typeof previousResume === 'function') previousResume();
    refreshHealth();
    install();
  };

  install();
})();
