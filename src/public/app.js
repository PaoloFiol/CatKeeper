const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

// "5 minutes ago" for recent times, otherwise a date in the viewer's own time zone.
function friendly(date) {
  const minutes = Math.round((date - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// The database stores UTC times like "2026-11-08 14:22:01"; show them in local time.
function localTimes(root = document) {
  for (const time of root.querySelectorAll('time[datetime]')) {
    const date = new Date(time.dateTime.replace(' ', 'T') + 'Z');
    if (Number.isNaN(date.getTime())) continue;
    time.title = date.toLocaleString();
    time.textContent = friendly(date);
  }
}

localTimes();

// Small enhancements keep the server-rendered pages useful without extra dependencies.
for (const date of document.querySelectorAll('[data-today]')) {
  date.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());
}

const navigationToggle = document.getElementById('nav-toggle');
const menuButton = document.querySelector('button.menu-btn');
const workspaceNavigation = document.getElementById('workspace-navigation');
if (navigationToggle && menuButton && workspaceNavigation) {
  const mobileNavigation = matchMedia('(max-width: 900px)');
  function updateNavigation() {
    const open = navigationToggle.checked;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    workspaceNavigation.inert = mobileNavigation.matches && !open;
  }
  menuButton.addEventListener('click', () => {
    navigationToggle.checked = !navigationToggle.checked;
    updateNavigation();
    if (navigationToggle.checked && mobileNavigation.matches) {
      workspaceNavigation.querySelector('.side-nav a').focus();
    }
  });
  workspaceNavigation.querySelector('.sidebar-close').addEventListener('click', () => {
    navigationToggle.checked = false;
    updateNavigation();
    menuButton.focus();
  });
  navigationToggle.addEventListener('change', updateNavigation);
  mobileNavigation.addEventListener('change', updateNavigation);
  workspaceNavigation.addEventListener('click', (event) => {
    if (event.target.closest('a') && mobileNavigation.matches) {
      navigationToggle.checked = false;
      updateNavigation();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigationToggle.checked) {
      navigationToggle.checked = false;
      updateNavigation();
      menuButton.focus();
    }
    if (event.key === 'Tab' && navigationToggle.checked && mobileNavigation.matches) {
      const links = [...workspaceNavigation.querySelectorAll('a, button')];
      const first = links[0];
      const last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  updateNavigation();
}

// A primary "Add" link opens the corresponding form, including on initial navigation.
function revealLinkedForm(hash) {
  if (!hash) return;
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (target instanceof HTMLDetailsElement) target.open = true;
}
revealLinkedForm(location.hash);
window.addEventListener('hashchange', () => revealLinkedForm(location.hash));
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  const url = new URL(link.href, location.href);
  if (url.origin === location.origin && url.pathname === location.pathname) {
    revealLinkedForm(url.hash);
  }
});

const catSearch = document.querySelector('[data-cat-search]');
if (catSearch) {
  catSearch.addEventListener('input', () => {
    const query = catSearch.value.trim().toLocaleLowerCase();
    const cards = [...document.querySelectorAll('[data-cat-card]')];
    let visible = 0;
    for (const card of cards) {
      card.hidden = !card.textContent.toLocaleLowerCase().includes(query);
      if (!card.hidden) visible++;
    }
    document.querySelector('[data-search-empty]').hidden = !cards.length || visible > 0;
    document.querySelector('.directory-total').textContent =
      `${visible} ${visible === 1 ? 'cat' : 'cats'} in this view`;
  });
}

const attachment = document.querySelector('.photo-attachment input[type=file]');
if (attachment) {
  const label = document.querySelector('[data-photo-label]');
  attachment.addEventListener('change', () => {
    label.textContent = attachment.files[0]?.name || 'Attach photo';
  });
  attachment.form.addEventListener('reset', () => {
    label.textContent = 'Attach photo';
  });
}

// Asks before a button marked data-confirm submits, for actions that can't be undone.
document.addEventListener('submit', (event) => {
  const message = event.submitter?.dataset.confirm;
  if (message && !confirm(message)) event.preventDefault();
});

// Admin pages share one update stream; volunteer chats never request this feed.
const notifications = document.getElementById('notifications');
const adminEvents = notifications ? new EventSource('/admin/events') : null;

if (notifications) {
  const bell = notifications.querySelector('summary');
  const panel = document.getElementById('notifications-panel');
  const content = document.getElementById('notifications-content');
  const error = document.getElementById('notifications-error');
  let refreshing = false;
  let queued = false;

  async function refreshNotifications() {
    queued = true;
    if (refreshing) return;
    refreshing = true;
    try {
      // An update arriving during a fetch must trigger another fetch afterwards.
      while (queued) {
        queued = false;
        const response = await fetch('/admin/notifications', { cache: 'no-store' });
        if (!response.ok) throw new Error(response.statusText);
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        const next = page.getElementById('notifications');
        const focusedId = content.contains(document.activeElement)
          ? document.activeElement.id
          : null;
        const scrollTop = content.scrollTop;

        bell.setAttribute('aria-label', next.querySelector('summary').getAttribute('aria-label'));
        const count = notifications.querySelector('.notification-count');
        const nextCount = next.querySelector('.notification-count');
        count.textContent = nextCount.textContent;
        count.hidden = nextCount.hidden;
        panel.querySelector('.notifications-header p').textContent =
          next.querySelector('.notifications-header p').textContent;
        content.innerHTML = next.querySelector('#notifications-content').innerHTML;
        localTimes(content);
        // Preserve keyboard focus and scroll while the list updates in place.
        if (focusedId) (document.getElementById(focusedId) || bell).focus({ preventScroll: true });
        content.scrollTop = scrollTop;
        error.hidden = true;
      }
    } catch {
      error.hidden = false;
    } finally {
      refreshing = false;
    }
  }

  adminEvents.addEventListener('message', refreshNotifications);
  adminEvents.addEventListener('open', refreshNotifications);
  adminEvents.addEventListener('error', () => (error.hidden = false));
  notifications.addEventListener('toggle', () => {
    if (notifications.open) refreshNotifications();
  });
  window.addEventListener('online', refreshNotifications);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshNotifications();
  });
  document.addEventListener('click', (event) => {
    if (!notifications.contains(event.target) || event.target.closest('.notifications-panel a')) {
      notifications.open = false;
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && notifications.open) {
      notifications.open = false;
      bell.focus();
      event.preventDefault();
    }
  });
  notifications.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !notifications.contains(event.relatedTarget))
      notifications.open = false;
  });
}
