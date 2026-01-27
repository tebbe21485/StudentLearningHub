// Add "Assign to Dashboard" controls to resource cards and downloads
(function(){
  const KEY = 'slh-assignments';

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch(e){ return []; }
  }
  function save(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); window.dispatchEvent(new Event('assignments-changed')); }

  function makeAssignButton(title, href){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'assign-btn';
    btn.textContent = 'Assign to Dashboard';
    btn.addEventListener('click', () => {
      const assignments = load();
      // find existing by title+href
      const idx = assignments.findIndex(a => a.title === title && (a.href || '') === (href || ''));
      if (idx !== -1) {
        // if found but not marked assigned, mark it assigned
        if (assignments[idx].assigned !== true) {
          assignments[idx].assigned = true;
          assignments[idx].assignedAt = new Date().toISOString();
          save(assignments);
        }
        btn.textContent = 'Assigned';
        btn.disabled = true;
        return;
      }
      const item = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2,8),
        title: title,
        href: href || null,
        progress: 0,
        assigned: true,
        assignedAt: new Date().toISOString()
      };
      assignments.push(item);
      save(assignments);
        btn.textContent = 'Assigned';
        btn.disabled = true;
        // Redirect to dashboard so the newly assigned item appears immediately
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 250);
    });
    return btn;
  }

  function initCards(){
    document.querySelectorAll('.card').forEach(card => {
      const h2 = card.querySelector('h2');
      if (!h2) return;
      // don't add an assign button for the Downloads card
      if (h2.textContent.trim().toLowerCase().includes('download')) return;
      const title = h2.textContent.trim();
      // don't duplicate button
      if (card.querySelector('.assign-btn')) return;
      const btn = makeAssignButton(title, null);
      // place button at end of card
      card.appendChild(btn);
    });
  }

  function initDownloads(){
    const list = document.getElementById('download-list');
    if (!list) return;
    list.querySelectorAll('li').forEach(li => {
      if (li.querySelector('.assign-btn')) return;
      const a = li.querySelector('a');
      const title = a ? a.textContent.trim() : li.textContent.trim();
      // If the link points to assignment.html?href=..., extract the inner href
      let storedHref = null;
      if (a) {
        const raw = a.getAttribute('href') || '';
        try {
          const parsed = new URL(raw, window.location.origin);
          const inner = parsed.searchParams.get('href');
          storedHref = inner || raw;
        } catch (e) {
          // fallback to raw value if URL parsing fails
          storedHref = raw;
        }
      }
      const btn = makeAssignButton(title, storedHref);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btn);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    initCards();
    initDownloads();
    // disable assigned buttons for already assigned and keep in sync when assignments change
    function updateAssignedButtons(){
      const assignments = load();
      document.querySelectorAll('.assign-btn').forEach(btn => {
        const li = btn.closest('li');
        const card = btn.closest('.card');
        let title = '';
        let href = null;
        if (li) {
          const a = li.querySelector('a');
          title = (a ? a.textContent : li.textContent).trim();
          if (a) {
            const raw = a.getAttribute('href') || '';
            try { const parsed = new URL(raw, window.location.origin); const inner = parsed.searchParams.get('href'); href = inner || raw; } catch(e){ href = raw; }
          }
        } else if (card) {
          title = (card.querySelector('h2')?.textContent || '').trim();
        }
        if (assignments.some(a => a.assigned === true && a.title === title && (a.href || '') === (href || ''))) {
          btn.textContent = 'Assigned'; btn.disabled = true;
        } else {
          btn.textContent = 'Assign to Dashboard'; btn.disabled = false;
        }
      });
    }
    updateAssignedButtons();
    window.addEventListener('assignments-changed', updateAssignedButtons);
  });
})();
