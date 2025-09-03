// Very small interactive quiz pulling from data/quizzes.json
(async function(){
  async function loadQuiz(){
    const res = await fetch('data/quizzes.json');
    return await res.json();
  }
  function renderQuestion(q, idx){
    const div = document.createElement('div');
    div.className = 'card';
    const choices = q.choices.map((c, i) => 
      `<label><input type="radio" name="q${idx}" value="${i}"> ${c}</label>`
    ).join('<br>');
    div.innerHTML = `<strong>${idx+1}. ${q.prompt}</strong><div>${choices}</div><div class="result" id="r${idx}"></div>`;
    return div;
  }
  window.addEventListener('DOMContentLoaded', async () => {
    const host = document.getElementById('quiz-host');
    const submit = document.getElementById('quiz-submit');
    if (!host || !submit) return;

    const data = await loadQuiz();
    data.questions.forEach((q, i) => host.appendChild(renderQuestion(q, i)));

    submit.addEventListener('click', () => {
      let correct = 0;
      data.questions.forEach((q, i) => {
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        const result = document.getElementById(`r${i}`);
        if (!sel) { result.textContent = 'Select an answer.'; return; }
        const ok = Number(sel.value) === q.answerIndex;
        result.textContent = ok ? 'Correct' : `Try again`;
        if (ok) correct++;
      });
      const score = document.getElementById('quiz-score');
      if (score) score.textContent = `Score: ${correct} / ${data.questions.length}`;
    });
  });
})();
