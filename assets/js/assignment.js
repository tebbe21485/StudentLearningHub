// Loads an assignment by id and displays the doc or quiz. Saves quiz progress back to assignments.
(function(){
  const ASSIGN_KEY = 'slh-assignments';

  function qsParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }
  function loadAssignments(){
    try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveAssignments(a){ localStorage.setItem(ASSIGN_KEY, JSON.stringify(a)); window.dispatchEvent(new Event('assignments-changed')); }

  function renderText(url, container){
    (async ()=>{
      const tryFetch = async (p) => {
        try {
          const r = await fetch(encodeURI(p));
          return r;
        } catch (e) {
          return null;
        }
      };

      const candidates = [url, './' + url, '/' + url];
      for (const p of candidates) {
        const res = await tryFetch(p);
        if (!res) continue;
        if (!res.ok) {
          // try next candidate
          continue;
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        const text = await res.text();
        // if server returned HTML (likely a fallback page), try next candidate
        if (ct.includes('text/html') || String(text).trim().toLowerCase().startsWith('<!doctype') || String(text).trim().toLowerCase().startsWith('<html')) {
          continue;
        }
        const pre = document.createElement('pre'); pre.textContent = text; pre.style.whiteSpace = 'pre-wrap';
        container.appendChild(pre);
        return;
      }
      container.innerHTML = `<p>Unable to load document. Tried: ${candidates.map(c=>escapeHtml(c)).join(', ')}</p>`;
    })();
  }

  function escapeHtml(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function renderQuiz(assignment, container, metaEl){
    metaEl.innerHTML = '';
    const heading = document.createElement('p'); heading.textContent = `Progress: ${assignment.progress || 0}%`;
    metaEl.appendChild(heading);

    // load quiz data
    const res = await fetch('data/quizzes.json');
    const data = await res.json();

    // render questions
    data.questions.forEach((q, i) => {
      const div = document.createElement('div'); div.className = 'card';
      const prompt = document.createElement('strong'); prompt.textContent = `${i+1}. ${q.prompt}`;
      const choicesWrap = document.createElement('div');
      q.choices.forEach((c, idx) => {
        const label = document.createElement('label');
        label.style.display = 'block';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = `q${i}`; input.value = String(idx);
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + c));
        choicesWrap.appendChild(label);
      });
      const res = document.createElement('div'); res.className = 'result'; res.id = `r${i}`;
      div.appendChild(prompt);
      div.appendChild(choicesWrap);
      div.appendChild(res);
      container.appendChild(div);
    });

    // restore previous answers if present
    if (Array.isArray(assignment.answers)) {
      assignment.answers.forEach((val, i) => {
        if (val == null) return;
        const el = document.querySelector(`input[name="q${i}"][value="${val}"]`);
        if (el) el.checked = true;
      });
    }

    const submit = document.createElement('button'); submit.type = 'button'; submit.textContent = 'Submit';
    const scoreEl = document.createElement('div'); scoreEl.id = 'quiz-score';
    submit.addEventListener('click', () => {
      let correct = 0;
      const given = [];
      data.questions.forEach((q, i) => {
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        const result = document.getElementById(`r${i}`);
        if (!sel) { result.textContent = 'Select an answer.'; given[i] = null; return; }
        const val = Number(sel.value);
        given[i] = val;
        const ok = val === q.answerIndex;
        result.textContent = ok ? 'Correct' : 'Try again';
        if (ok) correct++;
      });
      scoreEl.textContent = `Score: ${correct} / ${data.questions.length}`;
      // compute percent and save to assignment (including answers)
      const percent = Math.round((correct / data.questions.length) * 100);
      const a = loadAssignments();
      const idx = a.findIndex(x => x.id === assignment.id);
      if (idx !== -1) {
        a[idx].progress = percent;
        a[idx].answers = given;
        saveAssignments(a);
        metaEl.innerHTML = `<p>Progress: ${percent}%</p>`;
      }
    });

    container.appendChild(submit);
    container.appendChild(scoreEl);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const id = qsParam('id');
    const hrefParam = qsParam('href');
    const titleParam = qsParam('title');
    const titleEl = document.getElementById('assignment-title');
    const content = document.getElementById('assignment-content');
    const meta = document.getElementById('assignment-meta');
    const assignments = loadAssignments();
    let assignment = null;
    let isPreview = false;

    if (id) {
      assignment = assignments.find(a => a.id === id);
      if (!assignment) { titleEl.textContent = 'Assignment not found'; content.textContent = 'Assignment ID not found.'; return; }
    } else if (hrefParam) {
      isPreview = true;
      assignment = { id: null, title: titleParam || hrefParam, href: hrefParam, progress: 0, notes: '', answers: [], fontSize: null };
    } else {
      titleEl.textContent = 'Assignment not found'; content.textContent = 'No assignment id or href provided.'; return;
    }

    titleEl.textContent = assignment.title;
    // If assignment has an href, try to load or redirect
    if (assignment.href) {
      const href = assignment.href;
      // simple heuristic: PDFs -> embed with Done button; text files -> display; html -> redirect; others try fetch then fallback
      if (href.endsWith('.pdf')) {
        const iframe = document.createElement('iframe');
        iframe.src = href;
        iframe.style.width = '100%';
        iframe.style.height = '80vh';
        iframe.style.border = 'none';
        content.appendChild(iframe);
        const controls = document.getElementById('assignment-controls');
        if (controls) {
          controls.innerHTML = '';
          const done = document.createElement('button');
            done.type = 'button';
            // show toggle text depending on state
            if (assignment.progress === 100) done.textContent = 'Mark as Incomplete';
            else done.textContent = 'Mark as Done';
            done.addEventListener('click', () => {
              const a = loadAssignments();
              const idx = a.findIndex(x => x.id === assignment.id);
              if (idx === -1) return;
              if (a[idx].progress === 100) {
                // un-complete
                a[idx].progress = 0;
                saveAssignments(a);
                done.textContent = 'Mark as Done';
                meta.innerHTML = `<p>Progress: 0%</p>`;
              } else {
                // complete
                a[idx].progress = 100;
                saveAssignments(a);
                done.textContent = 'Mark as Incomplete';
                meta.innerHTML = `<p>Progress: 100%</p>`;
              }
            });
            controls.appendChild(done);
        }
      } else if (href.endsWith('.txt') || href.endsWith('.md')) {
        renderText(href, content);
        // Move font-size controls to the top toolbar and prepare bottom controls area
        const toolbar = document.getElementById('assignment-toolbar');
        const controls = document.getElementById('assignment-controls');
        if (toolbar) toolbar.innerHTML = '';
        if (controls) controls.innerHTML = '';

        const fsDecTop = document.createElement('button'); fsDecTop.type = 'button'; fsDecTop.textContent = 'Text size -';
        const fsIncTop = document.createElement('button'); fsIncTop.type = 'button'; fsIncTop.textContent = 'Text size +';
        fsDecTop.style.marginRight = '0.5rem';
        if (toolbar) { toolbar.appendChild(fsDecTop); toolbar.appendChild(fsIncTop); }

        // Notes and Done only for real assignments
        if (!isPreview && assignment.id) {
          const notes = document.createElement('textarea');
          notes.rows = 6; notes.style.width = '100%'; notes.placeholder = 'Your notes / answers...';
          notes.value = assignment.notes || '';
          const saveBtn = document.createElement('button'); saveBtn.type = 'button'; saveBtn.textContent = 'Save Answers';
          saveBtn.style.marginRight = '0.5rem';
          saveBtn.addEventListener('click', () => {
            const a = loadAssignments();
            const idx = a.findIndex(x => x.id === assignment.id);
            if (idx !== -1) {
              a[idx].notes = notes.value;
              saveAssignments(a);
              saveBtn.textContent = 'Saved';
              setTimeout(()=> saveBtn.textContent = 'Save Answers', 1200);
            }
          });

          const done = document.createElement('button');
          done.type = 'button';
          if (assignment.progress === 100) done.textContent = 'Mark as Incomplete';
          else done.textContent = 'Mark as Done';
          done.addEventListener('click', () => {
            const a = loadAssignments();
            const idx = a.findIndex(x => x.id === assignment.id);
            if (idx === -1) return;
            if (a[idx].progress === 100) {
              a[idx].progress = 0;
              saveAssignments(a);
              done.textContent = 'Mark as Done';
              meta.innerHTML = `<p>Progress: 0%</p>`;
            } else {
              a[idx].progress = 100;
              saveAssignments(a);
              done.textContent = 'Mark as Incomplete';
              meta.innerHTML = `<p>Progress: 100%</p>`;
            }
          });

          if (controls) {
            controls.appendChild(notes);
            controls.appendChild(document.createElement('div'));
            controls.appendChild(saveBtn);
            controls.appendChild(done);
          }
        } else if (isPreview) {
          if (controls) {
            const info = document.createElement('div');
            info.textContent = 'Preview mode — assign to save progress.';
            controls.appendChild(info);
          }
        }

        // font size behavior (top toolbar)
        setTimeout(() => {
          const pre = content.querySelector('pre');
          if (!pre) return;
          let size = 16;
          if (!isPreview && assignment.fontSize) size = Number(assignment.fontSize);
          if (isPreview) {
            const key = 'preview-font-' + href;
            const saved = sessionStorage.getItem(key);
            if (saved) size = Number(saved);
          }
          pre.style.fontSize = size + 'px';
          fsDecTop.addEventListener('click', () => {
            size = Math.max(10, size - 1); pre.style.fontSize = size + 'px';
            if (!isPreview && assignment.id) { const a = loadAssignments(); const idx = a.findIndex(x=>x.id===assignment.id); if (idx!==-1){ a[idx].fontSize = size; saveAssignments(a); } }
            if (isPreview) { sessionStorage.setItem('preview-font-' + href, String(size)); }
          });
          fsIncTop.addEventListener('click', () => {
            size = Math.min(36, size + 1); pre.style.fontSize = size + 'px';
            if (!isPreview && assignment.id) { const a = loadAssignments(); const idx = a.findIndex(x=>x.id===assignment.id); if (idx!==-1){ a[idx].fontSize = size; saveAssignments(a); } }
            if (isPreview) { sessionStorage.setItem('preview-font-' + href, String(size)); }
          });
        }, 80);
        // end text handling
        // show/hide assign button at bottom
        const assignBtn = document.getElementById('assign-to-dashboard');
        if (assignBtn) {
          if (!isPreview) assignBtn.style.display = 'none';
          else assignBtn.style.display = 'inline-block';
          assignBtn.addEventListener('click', () => {
            // create or enable assignment and redirect to id view
            const aList = loadAssignments();
            const idx = aList.findIndex(x => (x.href||'') === href && x.title === assignment.title);
            let newId = null;
            // detect current font size
            const pre = content.querySelector('pre');
            const curSize = pre ? parseInt(window.getComputedStyle(pre).fontSize, 10) : null;
            if (idx !== -1) {
              aList[idx].assigned = true;
              aList[idx].assignedAt = new Date().toISOString();
              if (curSize) aList[idx].fontSize = curSize;
              saveAssignments(aList);
              newId = aList[idx].id;
            } else {
              newId = Date.now() + '-' + Math.random().toString(36).slice(2,8);
              const item = { id: newId, title: assignment.title, href: href, progress: 0, assigned: true, assignedAt: new Date().toISOString(), notes: '', fontSize: curSize };
              aList.push(item);
              saveAssignments(aList);
            }
            if (newId) window.location.href = `assignment.html?id=${encodeURIComponent(newId)}`;
          });
        }
      } else if (href.endsWith('.html')) {
        // redirect to resource page
        window.location.href = href;
      } else {
        // try fetch and display as text, fallback to redirect
        fetch(href).then(r => r.text()).then(t => { const pre = document.createElement('pre'); pre.textContent = t; pre.style.whiteSpace = 'pre-wrap'; content.appendChild(pre); }).catch(() => { window.location.href = href; });
      }
    } else {
      // treat as quiz if title contains 'Quiz' or no href
      if (/quiz/i.test(assignment.title)) {
        renderQuiz(assignment, content, meta);
          // handle assign-to-dashboard for quizzes (no href)
          const assignBtnQ = document.getElementById('assign-to-dashboard');
          if (assignBtnQ) {
            // hide assign button when viewing a saved assignment
            if (!isPreview && assignment.id) {
              assignBtnQ.style.display = 'none';
            } else {
              assignBtnQ.style.display = isPreview ? 'inline-block' : 'none';
            }
            // disable if already assigned
            if (assignment.assigned) { assignBtnQ.textContent = 'Assigned'; assignBtnQ.disabled = true; assignBtnQ.style.display = 'none'; }
            assignBtnQ.addEventListener('click', () => {
              const aList = loadAssignments();
              const idx = aList.findIndex(x => (x.href||'') === (assignment.href||'') && x.title === assignment.title);
              let newId = null;
              if (idx !== -1) {
                aList[idx].assigned = true;
                aList[idx].assignedAt = new Date().toISOString();
                saveAssignments(aList);
                newId = aList[idx].id;
              } else {
                newId = Date.now() + '-' + Math.random().toString(36).slice(2,8);
                const item = { id: newId, title: assignment.title, href: assignment.href || null, progress: 0, assigned: true, assignedAt: new Date().toISOString(), notes: '', fontSize: null };
                aList.push(item);
                saveAssignments(aList);
              }
              if (newId) window.location.href = `assignment.html?id=${encodeURIComponent(newId)}`;
            });
          }
      } else {
        content.textContent = 'No preview available for this assignment.';
      }
    }
    // Return to dashboard button
    const returnBtn = document.getElementById('return-dashboard');
    if (returnBtn) returnBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  });
})();
