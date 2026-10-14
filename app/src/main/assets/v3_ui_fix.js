(() => {
  const settings = document.getElementById('settings');
  if (!settings) return;
  const icon = settings.querySelector('.icon-settings');
  const permissionHeading = Array.from(settings.querySelectorAll('h2')).find(h => h.textContent.trim() === '通知权限');
  if (icon && permissionHeading) settings.insertBefore(icon, permissionHeading);
})();
