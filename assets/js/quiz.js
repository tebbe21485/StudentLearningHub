// Very small interactive quiz pulling from data/quizzes.json
(async function(){
  async function loadQuiz(){
    const res = await fetch('data/quizzes.json');
    return await res.json();
  }
  function renderQuestion(q, idx){
    const div = document.createElement('div');
    div.className = 'card';
    const promptDiv = document.createElement('div');
    promptDiv.innerHTML = `<strong>${idx+1}. ${q.prompt}</strong>`;
    const choicesDiv = document.createElement('div');
    
    q.choices.forEach((c, i) => {
      const letter = String.fromCharCode(65 + i); // A, B, C, D, etc.
      const label = document.createElement('label');
      label.className = 'quiz-choice';
      
      const checkboxContainer = document.createElement('span');
      checkboxContainer.className = 'checkbox-container';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `q${idx}`;
      input.value = String(i);
      
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
      
      const br = document.createElement('br');
      choicesDiv.appendChild(label);
      choicesDiv.appendChild(br);
    });
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result';
    resultDiv.id = `r${idx}`;
    
    div.appendChild(promptDiv);
    div.appendChild(choicesDiv);
    div.appendChild(resultDiv);
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
