// Calendar that renders as a single table
(async function(){
  async function loadSessions(){
    const res = await fetch("data/sessions.json");
    return await res.json();
  }

  function toDate(dateStr, timeStr){
    const [y, m, d] = dateStr.split("-").map(Number);
    let [t, ampm] = timeStr.split(" ");
    let [hh, mm] = t.split(":").map(Number);
    if (ampm.toUpperCase() === "PM" && hh < 12) hh += 12;
    if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
    return new Date(y, m-1, d, hh, mm);
  }

  function formatGoogleLink(event){
    const start = toDate(event.date, event.time);
    const end = new Date(start.getTime() + 60*60*1000); // +1h
    function fmt(d){
      return d.toISOString().replace(/[-:]/g, "").split(".")[0]+"Z";
    }
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.subject)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("Tutor: "+event.tutor)}`;
  }

  function renderCalendar(sessions, monthOffset=0){
    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth()+monthOffset, 1);
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    document.getElementById("calendar-month").textContent =
      viewDate.toLocaleString("default", {month:"long", year:"numeric"});

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();

    const tbody = document.getElementById("calendar-body");
    tbody.innerHTML = "";

    let row = document.createElement("tr");

    // Empty cells before the first day
    for (let i=0; i<firstDay; i++){
      row.appendChild(document.createElement("td"));
    }

    // Fill in all days
    for (let day = 1; day <= daysInMonth; day++) {
      const td = document.createElement("td");
      td.innerHTML = `<div class="date">${day}</div>`;

      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      sessions.filter(s => s.date === dateStr).forEach(s => {
        td.innerHTML += `<div class="event"><strong>${s.subject}</strong><br>${s.time} - ${s.tutor}<br><a target="_blank" href="${formatGoogleLink(s)}">Add to Google</a></div>`;
      });

      row.appendChild(td);

      // End of week
      if ((firstDay + day) % 7 === 0) {
        tbody.appendChild(row);
        row = document.createElement("tr");
      }
    }

    // After the loop, check if the last row is partially filled
    if (row.children.length > 0) {
      while (row.children.length < 7) {
        row.appendChild(document.createElement("td")); // pad with empty cells
      }
      tbody.appendChild(row);
    }

  }

  const sessions = await loadSessions();
  let offset = 0;
  renderCalendar(sessions, offset);

  document.getElementById("prev-month").addEventListener("click", ()=>{offset--; renderCalendar(sessions, offset);});
  document.getElementById("next-month").addEventListener("click", ()=>{offset++; renderCalendar(sessions, offset);});
})();
