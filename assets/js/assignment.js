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
  function upsertAssignedItem(baseItem){
    const aList = loadAssignments();
    const idx = aList.findIndex(x => (x.href || '') === (baseItem.href || '') && x.title === baseItem.title);
    if (idx !== -1) {
      aList[idx].assigned = true;
      aList[idx].assignedAt = new Date().toISOString();
      if (baseItem.fontSize != null) aList[idx].fontSize = baseItem.fontSize;
      saveAssignments(aList);
      return aList[idx].id;
    }

    const newId = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    const item = Object.assign({
      id: newId,
      progress: 0,
      assigned: true,
      assignedAt: new Date().toISOString()
    }, baseItem);
    aList.push(item);
    saveAssignments(aList);
    return newId;
  }

  function setupPreviewAssignButton(isPreview, assignment, href, extra){
    const assignBtn = document.getElementById('assign-to-dashboard');
    if (!assignBtn) return;

    if (!isPreview) {
      assignBtn.style.display = 'none';
      return;
    }

    assignBtn.style.display = 'inline-block';
    assignBtn.onclick = () => {
      const dynamicExtra = (typeof extra === 'function') ? (extra() || {}) : (extra || {});
      const newId = upsertAssignedItem(Object.assign({
        title: assignment.title,
        href: href
      }, dynamicExtra));
      if (newId) window.location.href = `assignment.html?id=${encodeURIComponent(newId)}`;
    };
  }
  function renderMarkDoneControl(assignment, metaEl, controlsEl){
    if (!controlsEl || !assignment || !assignment.id) return null;
    const done = document.createElement('button');
    done.type = 'button';
    done.textContent = (assignment.progress === 100) ? 'Mark as Incomplete' : 'Mark as Done';
    done.addEventListener('click', () => {
      const a = loadAssignments();
      const idx = a.findIndex(x => x.id === assignment.id);
      if (idx === -1) return;
      if (a[idx].progress === 100) {
        a[idx].progress = 0;
        saveAssignments(a);
        done.textContent = 'Mark as Done';
        metaEl.innerHTML = '<p>Progress: 0%</p>';
      } else {
        a[idx].progress = 100;
        saveAssignments(a);
        done.textContent = 'Mark as Incomplete';
        metaEl.innerHTML = '<p>Progress: 100%</p>';
      }
    });
    controlsEl.appendChild(done);
    return done;
  }

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
        const pre = document.createElement('pre'); 
        pre.textContent = text; 
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.border = '2px solid var(--accentColor)';
        container.appendChild(pre);
        return;
      }
      container.innerHTML = `<p>Unable to load document. Tried: ${candidates.map(c=>escapeHtml(c)).join(', ')}</p>`;
    })();
  }

  function escapeHtml(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function renderQuiz(assignment, container, metaEl, options){
    const isPreview = !!(options && options.isPreview);
    metaEl.innerHTML = '';
    const heading = document.createElement('p'); heading.textContent = `Progress: ${assignment.progress || 0}%`;
    metaEl.appendChild(heading);

    // load quiz data
    const res = await fetch('data/quizzes.json');
    const data = await res.json();

    // Add calculator toggle button with icon
    const calcToggle = document.createElement('button');
    calcToggle.type = 'button';
    // Realistic calculator SVG icon
    calcToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" style="width: 100%; height: 100%;">
      <rect x="8" y="10" width="84" height="120" rx="4" fill="#2c3e50" stroke="#1a252f" stroke-width="2"/>
      <rect x="12" y="20" width="76" height="30" fill="#34495e" rx="2"/>
      <rect x="15" y="25" width="70" height="20" fill="#ecf0f1" rx="1"/>
      <circle cx="20" cy="60" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="35" cy="60" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="50" cy="60" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="65" cy="60" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="80" cy="60" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="20" cy="75" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="35" cy="75" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="50" cy="75" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="65" cy="75" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <rect x="77" y="68" width="12" height="14" fill="#27ae60" stroke="#229954" stroke-width="1" rx="1"/>
      <circle cx="20" cy="90" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="35" cy="90" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="50" cy="90" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="65" cy="90" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <rect x="77" y="83" width="12" height="14" fill="#27ae60" stroke="#229954" stroke-width="1" rx="1"/>
      <circle cx="20" cy="105" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="35" cy="105" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="50" cy="105" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <circle cx="65" cy="105" r="5" fill="#95a5a6" stroke="#7f8c8d" stroke-width="1"/>
      <rect x="77" y="98" width="12" height="14" fill="#27ae60" stroke="#229954" stroke-width="1" rx="1"/>
    </svg>`;
    calcToggle.title = 'Show Graphing Calculator';
    calcToggle.style.fontSize = '1.5rem';
    calcToggle.style.padding = '0.5rem';
    calcToggle.style.width = '3rem';
    calcToggle.style.height = '3rem';
    calcToggle.style.borderRadius = '50%';
    calcToggle.style.display = 'flex';
    calcToggle.style.alignItems = 'center';
    calcToggle.style.justifyContent = 'center';
    calcToggle.className = 'btn calculator-toggle';

    // Create floating calculator container
    const calcFloatingContainer = document.createElement('div');
    calcFloatingContainer.className = 'calculator-floating-container';
    calcFloatingContainer.style.display = 'none';
    calcFloatingContainer.style.position = 'fixed';
    calcFloatingContainer.style.top = '0';
    calcFloatingContainer.style.left = '0';
    calcFloatingContainer.style.width = '100%';
    calcFloatingContainer.style.height = '100%';
    calcFloatingContainer.style.backgroundColor = 'transparent';
    calcFloatingContainer.style.zIndex = '999';
    calcFloatingContainer.style.pointerEvents = 'none';

    // Create calculator window
    const calcWindow = document.createElement('div');
    calcWindow.className = 'calculator-window';
    calcWindow.style.position = 'fixed';
    calcWindow.style.top = '50px';
    calcWindow.style.right = '20px';
    calcWindow.style.width = '450px';
    calcWindow.style.height = '550px';
    calcWindow.style.minWidth = '300px';
    calcWindow.style.minHeight = '250px';
    calcWindow.style.backgroundColor = 'white';
    calcWindow.style.borderRadius = '8px';
    calcWindow.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)';
    calcWindow.style.overflow = 'hidden';
    calcWindow.style.cursor = 'move';
    calcWindow.style.pointerEvents = 'auto';

    // Create window header
    const calcHeader = document.createElement('div');
    calcHeader.className = 'calculator-header';
    calcHeader.style.padding = '10px 15px';
    calcHeader.style.backgroundColor = 'var(--primaryColor, #132840)';
    calcHeader.style.color = 'white';
    calcHeader.style.display = 'flex';
    calcHeader.style.justifyContent = 'space-between';
    calcHeader.style.alignItems = 'center';
    calcHeader.style.cursor = 'move';

    const calcTitle = document.createElement('span');
    calcTitle.textContent = 'Graphing Calculator';
    calcTitle.style.fontWeight = 'bold';

    const calcClose = document.createElement('button');
    calcClose.innerHTML = 'x';
    calcClose.style.background = 'none';
    calcClose.style.border = 'none';
    calcClose.style.color = 'white';
    calcClose.style.fontSize = '1.5rem';
    calcClose.style.cursor = 'pointer';
    calcClose.style.padding = '0';
    calcClose.style.width = '30px';
    calcClose.style.height = '30px';
    calcClose.style.display = 'flex';
    calcClose.style.alignItems = 'center';
    calcClose.style.justifyContent = 'center';
    calcClose.title = 'Hide Calculator';
    calcClose.addEventListener('click', () => {
      calcFloatingContainer.style.display = 'none';
    });

    calcHeader.appendChild(calcTitle);
    calcHeader.appendChild(calcClose);

    // Create calculator container
    const calcContainer = document.createElement('div');
    calcContainer.style.width = '100%';
    calcContainer.style.height = 'calc(100% - 50px)';
    calcContainer.style.overflow = 'hidden';

    calcWindow.appendChild(calcHeader);
    calcWindow.appendChild(calcContainer);
    calcFloatingContainer.appendChild(calcWindow);
    document.body.appendChild(calcFloatingContainer);

    let calculator = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // Make window draggable
    calcHeader.addEventListener('mousedown', (e) => {
      if (e.target === calcClose) return; // Don't drag when clicking close button
      isDragging = true;
      const rect = calcWindow.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      calcWindow.style.cursor = 'grabbing';
      calcHeader.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const newLeft = e.clientX - dragOffset.x;
        const newTop = e.clientY - dragOffset.y;

        // Keep window within viewport bounds
        const maxLeft = window.innerWidth - calcWindow.offsetWidth;
        const maxTop = window.innerHeight - calcWindow.offsetHeight;

        calcWindow.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        calcWindow.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      calcWindow.style.cursor = 'move';
      calcHeader.style.cursor = 'move';
    });

    // Make window resizable
    const resizeHandle = document.createElement('div');
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.right = '0';
    resizeHandle.style.width = '20px';
    resizeHandle.style.height = '20px';
    resizeHandle.style.cursor = 'nw-resize';
    resizeHandle.style.background = 'linear-gradient(-45deg, transparent 0%, transparent 40%, var(--secondaryColor) 40%, var(--secondaryColor) 60%, transparent 60%, transparent 100%)';

    calcWindow.appendChild(resizeHandle);

    let isResizing = false;
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isResizing = true;
    });

    document.addEventListener('mousemove', (e) => {
      if (isResizing) {
        const rect = calcWindow.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const newHeight = e.clientY - rect.top;

        calcWindow.style.width = Math.max(400, newWidth) + 'px';
        calcWindow.style.height = Math.max(300, newHeight) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });

    calcToggle.addEventListener('click', () => {
      calcFloatingContainer.style.display = 'block';
      if (!calculator) {
        // Embed Desmos calculator iframe
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.desmos.com/calculator';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.title = 'Desmos Graphing Calculator';
        calcContainer.appendChild(iframe);
        calculator = iframe; // Mark as loaded
      }
    });

    // Create toolbar for calculator button
    const quizToolbar = document.createElement('div');
    quizToolbar.className = 'quiz-toolbar';
    quizToolbar.style.display = 'flex';
    quizToolbar.style.justifyContent = 'flex-end';
    quizToolbar.style.marginBottom = '1rem';
    quizToolbar.appendChild(calcToggle);
    container.appendChild(quizToolbar);

    // render questions
    data.questions.forEach((q, i) => {
      const div = document.createElement('div'); div.className = 'card';
      const prompt = document.createElement('strong'); prompt.textContent = `${i+1}. ${q.prompt}`;
      const choicesWrap = document.createElement('div');
      q.choices.forEach((c, idx) => {
        const letter = String.fromCharCode(65 + idx); // A, B, C, D, etc.
        const label = document.createElement('label');
        label.className = 'quiz-choice';
        //label.style.display = 'block';
        
        const checkboxContainer = document.createElement('span');
        checkboxContainer.className = 'checkbox-container';
        
        const input = document.createElement('input');
        input.type = 'radio'; input.name = `q${i}`; input.value = String(idx);
        if (isPreview) input.disabled = true;
        
        const letterSpan = document.createElement('span');
        letterSpan.className = 'choice-letter';
        letterSpan.textContent = letter;
        
        checkboxContainer.appendChild(input);
        checkboxContainer.appendChild(letterSpan);
        label.appendChild(checkboxContainer);
        
        const textSpan = document.createElement('span');
        textSpan.className = 'choice-text';
        textSpan.textContent = c;
        label.appendChild(textSpan);
        choicesWrap.appendChild(label);
      });
      const res = document.createElement('div'); res.className = 'result'; res.id = `r${i}`;
      div.appendChild(prompt);
      div.appendChild(choicesWrap);
      div.appendChild(res);
      container.appendChild(div);
    });

    // restore previous answers if present
    if (!isPreview && Array.isArray(assignment.answers)) {
      assignment.answers.forEach((val, i) => {
        if (val == null) return;
        const el = document.querySelector(`input[name="q${i}"][value="${val}"]`);
        if (el) el.checked = true;
      });
    }

    if (isPreview) return;

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
          renderMarkDoneControl(assignment, meta, controls);
        }
      } else if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(href)) {
        const video = document.createElement('video');
        video.src = href;
        video.controls = true;
        video.style.width = '100%';
        video.style.maxHeight = '80vh';
        video.style.borderRadius = '.5rem';
        content.appendChild(video);

        const controls = document.getElementById('assignment-controls');
        if (controls) {
          controls.innerHTML = '';
          if (isPreview) {
            const info = document.createElement('div');
            info.textContent = 'Preview mode - assign to save progress.';
            controls.appendChild(info);
          } else {
            const notes = document.createElement('textarea');
            notes.rows = 6;
            notes.style.width = '100%';
            notes.placeholder = 'Your notes...';
            notes.value = assignment.notes || '';

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.textContent = 'Save Notes';
            saveBtn.style.marginRight = '0.5rem';
            saveBtn.addEventListener('click', () => {
              const a = loadAssignments();
              const idx = a.findIndex(x => x.id === assignment.id);
              if (idx !== -1) {
                a[idx].notes = notes.value;
                saveAssignments(a);
                saveBtn.textContent = 'Saved';
                setTimeout(() => { saveBtn.textContent = 'Save Notes'; }, 1200);
              }
            });

            controls.appendChild(notes);
            controls.appendChild(document.createElement('div'));
            controls.appendChild(saveBtn);

            const doneBtn = renderMarkDoneControl(assignment, meta, controls);
            const saveVideoState = (forceComplete) => {
              const a = loadAssignments();
              const idx = a.findIndex(x => x.id === assignment.id);
              if (idx === -1) return;

              const current = Number(video.currentTime) || 0;
              const duration = Number(video.duration) || 0;
              a[idx].videoTime = Math.floor(forceComplete ? (duration || current) : current);

              if (forceComplete) {
                a[idx].progress = 100;
              } else if (duration > 0 && a[idx].progress !== 100) {
                // keep in-progress playback below 100% until the video actually ends
                const watched = Math.min(99, Math.round((current / duration) * 100));
                if (watched > (Number(a[idx].progress) || 0)) a[idx].progress = watched;
              }

              saveAssignments(a);
              meta.innerHTML = `<p>Progress: ${a[idx].progress || 0}%</p>`;
            };

            video.addEventListener('loadedmetadata', () => {
              const startAt = Number(assignment.videoTime) || 0;
              if (startAt > 0 && startAt < Math.max(0, (Number(video.duration) || 0) - 1)) {
                video.currentTime = startAt;
              }
            });

            let lastSave = 0;
            video.addEventListener('timeupdate', () => {
              const now = Date.now();
              if (now - lastSave < 3000) return;
              lastSave = now;
              saveVideoState(false);
            });
            video.addEventListener('pause', () => { saveVideoState(false); });
            window.addEventListener('beforeunload', () => { saveVideoState(false); });

            video.addEventListener('ended', () => {
              saveVideoState(true);
              if (doneBtn) doneBtn.textContent = 'Mark as Incomplete';
            });
          }
        }
        setupPreviewAssignButton(isPreview, assignment, href, { notes: '', videoTime: 0 });
      } else if (href.endsWith('.json') || href.includes('quizzes')) {
        // Handle quiz JSON files
        renderQuiz(assignment, content, meta, { isPreview: isPreview });
        if (isPreview) {
          const controls = document.getElementById('assignment-controls');
          if (controls) {
            controls.innerHTML = '';
            const info = document.createElement('div');
            info.textContent = 'Preview mode - assign to save progress.';
            controls.appendChild(info);
          }
        }
        setupPreviewAssignButton(isPreview, assignment, href, { answers: [] });
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
        
        // Add download button
        const downloadBtn = document.createElement('button'); 
        downloadBtn.type = 'button'; 
        downloadBtn.textContent = 'Download Resource';
        downloadBtn.style.marginLeft = '0.5rem';
        downloadBtn.addEventListener('click', () => {
          const title = assignment.title || 'download';
          const a = document.createElement('a');
          a.href = href;
          a.download = title;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
        
        if (toolbar) { toolbar.appendChild(fsDecTop); toolbar.appendChild(fsIncTop); toolbar.appendChild(downloadBtn); }

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
          setupPreviewAssignButton(isPreview, assignment, href, () => ({
            notes: '',
            fontSize: (() => {
              const pre = content.querySelector('pre');
              return pre ? parseInt(window.getComputedStyle(pre).fontSize, 10) : null;
            })()
          }));
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
        const quizHref = 'data/quizzes.json';
        renderQuiz(assignment, content, meta, { isPreview: isPreview });
        if (isPreview) {
          const controls = document.getElementById('assignment-controls');
          if (controls) {
            controls.innerHTML = '';
            const info = document.createElement('div');
            info.textContent = 'Preview mode - assign to save progress.';
            controls.appendChild(info);
          }
        }
        setupPreviewAssignButton(isPreview, assignment, quizHref, { answers: [] });
      } else {
        content.textContent = 'No preview available for this assignment.';
      }
    }
    // Return to dashboard button
    const returnBtn = document.getElementById('return-dashboard');
    if (returnBtn) returnBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  });
})();
