// Progress tracker and assigned-resources manager using localStorage
(function(){
  const PROG_KEY = 'slh-progress';
  const ASSIGN_KEY = 'slh-assignments';

  function loadAssignments(){
    try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveAssignments(arr){
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(arr));
    window.dispatchEvent(new Event('assignments-changed'));
  }

  function getFallbackProgress(){ return Number(localStorage.getItem(PROG_KEY) || 0); }
  function setFallbackProgress(v){ localStorage.setItem(PROG_KEY, String(Math.max(0, Math.min(100, v)))); }

  function computeAggregate(){
    const a = loadAssignments().filter(x => x.assigned === true);
    if (a.length === 0) return getFallbackProgress();
    const sum = a.reduce((s, it) => s + (Number(it.progress) || 0), 0);
    return Math.round(sum / a.length);
  }

  function renderMainProgress(){
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    if (!bar || !label) return;
    const v = computeAggregate();
    bar.value = v;
    label.textContent = v + '% complete';
    // add completed class when full so CSS can style it
    if (v === 100) bar.classList.add('completed'); else bar.classList.remove('completed');
  }

  function renderAssignments(){
    const list = document.getElementById('assignments-list');
    if (!list) return;
    const assignments = loadAssignments().filter(x => x.assigned === true);
    list.innerHTML = '';
    if (assignments.length === 0) {
      list.innerHTML = '<p>No assigned resources. Assign resources from the Resources page.</p>';
      return;
    }
    assignments.forEach(a => {
      const wrap = document.createElement('div');
      wrap.className = 'card';
      const title = document.createElement('h3');
      title.textContent = a.title;
      const prog = document.createElement('progress');
      prog.max = 100; prog.value = Number(a.progress) || 0;
      prog.className = 'assignment-progress';
      if (Number(a.progress) === 100) prog.classList.add('completed');
      const label = document.createElement('div');
      label.textContent = (Number(a.progress) || 0) + '%';
      const controls = document.createElement('div');
      controls.className = 'event actions';
      const openBtn = document.createElement('button'); openBtn.type='button'; openBtn.textContent='Open';
      const remove = document.createElement('button'); remove.type='button'; remove.textContent='Remove';
      openBtn.addEventListener('click', () => { window.location.href = `assignment.html?id=${encodeURIComponent(a.id)}`; });
      remove.addEventListener('click', () => { removeAssignment(a.id); });
      controls.appendChild(openBtn);
      // removed extra 'Open Source' link per UX request
      controls.appendChild(remove);

      wrap.appendChild(title);
      wrap.appendChild(prog);
      wrap.appendChild(label);
      wrap.appendChild(controls);
      list.appendChild(wrap);
    });
  }

  function changeProgress(id, delta){
    const a = loadAssignments();
    const idx = a.findIndex(x => x.id === id);
    if (idx === -1) return;
    a[idx].progress = Math.max(0, Math.min(100, (Number(a[idx].progress)||0) + delta));
    saveAssignments(a);
    renderAssignments(); renderMainProgress();
  }

  function removeAssignment(id){
    let a = loadAssignments();
    a = a.filter(x => x.id !== id);
    saveAssignments(a);
    renderAssignments(); renderMainProgress();
  }

  window.addEventListener('DOMContentLoaded', () => {
    const inc = document.getElementById('progress-inc');
    const dec = document.getElementById('progress-dec');
    const assignments = loadAssignments();
    if (assignments.length > 0) {
      if (inc) inc.disabled = true; if (dec) dec.disabled = true;
    } else {
      if (inc) inc.addEventListener('click', () => { setFallbackProgress(getFallbackProgress()+10); renderMainProgress(); });
      if (dec) dec.addEventListener('click', () => { setFallbackProgress(getFallbackProgress()-10); renderMainProgress(); });
    }
    renderAssignments(); renderMainProgress();
    const explore = document.getElementById('explore-resources');
    if (explore) explore.addEventListener('click', () => { window.location.href = 'resources.html'; });
  });

  window.addEventListener('assignments-changed', () => {
    const assignments = loadAssignments();
    const inc = document.getElementById('progress-inc');
    const dec = document.getElementById('progress-dec');
    if (assignments.length > 0) { if (inc) inc.disabled = true; if (dec) dec.disabled = true; }
    else { if (inc) inc.disabled = false; if (dec) dec.disabled = false; }
    renderAssignments(); renderMainProgress();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === ASSIGN_KEY) {
      renderAssignments(); renderMainProgress();
    }
  });

})();
