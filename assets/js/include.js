async function inject(id, file) {
  const host = document.getElementById(id);
  if (!host) return;
  try {
    const res = await fetch(file);
    host.innerHTML = await res.text();

    // Activate nav toggle after header loads
    const toggle = host.querySelector('.nav-toggle');
    const menu = host.querySelector('.nav');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.getAttribute('data-open') === 'true';
        menu.setAttribute('data-open', String(!open));
        toggle.setAttribute('aria-expanded', String(!open));
      });
    }
  } catch (e) {
    host.innerHTML = '<div class="notice">Failed to load component: ' + file + '</div>';
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await inject('site-header', 'components/header.html');
  await inject('site-footer', 'components/footer.html');

  // Mark active navigation link
  const map = {
    'index.html': 'home',
    'schedule.html': 'schedule',
    'dashboard.html': 'dashboard',
    'resources.html': 'resources',
    'about.html': 'about'
  };
  const path = location.pathname.split('/').pop() || 'index.html';
  const key = map[path] || 'home';
  const active = document.querySelector(`[data-nav="${key}"]`);
  if (active) active.setAttribute('aria-current', 'page');
});
