// Simple progress tracker using localStorage
(function(){
  const key = 'slh-progress';
  function getProgress(){ return Number(localStorage.getItem(key) || 0); }
  function setProgress(v){ localStorage.setItem(key, String(Math.max(0, Math.min(100, v)))); }

  function render(){
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    if (!bar || !label) return;
    const v = getProgress();
    bar.value = v;
    label.textContent = v + '% complete';
  }

  window.addEventListener('DOMContentLoaded', () => {
    const inc = document.getElementById('progress-inc');
    const dec = document.getElementById('progress-dec');
    if (inc) inc.addEventListener('click', () => { setProgress(getProgress()+10); render(); });
    if (dec) dec.addEventListener('click', () => { setProgress(getProgress()-10); render(); });
    render();
  });
})();
