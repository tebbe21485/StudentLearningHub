// Calendar that renders as a single table
(async function () {
  async function loadSessions() {
    const res = await fetch("data/sessions.json");
    return await res.json();
  }

  function toDate(dateStr, timeStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    let [t, ampm] = timeStr.split(" ");
    let [hh, mm] = t.split(":").map(Number);
    if (ampm.toUpperCase() === "PM" && hh < 12) hh += 12;
    if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
    return new Date(y, m - 1, d, hh, mm);
  }

  function formatGoogleLink(event) {
    const start = toDate(event.date, event.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1h
    function fmt(d) {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.subject)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("Tutor: " + event.tutor)}`;
  }

  function formatIcs(event) {
    const start = toDate(event.date, event.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1h
    function fmt(d) {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }

    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Student Learning Hub//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${event.subject}`,
      `DESCRIPTION:Tutor: ${event.tutor}`,
      `LOCATION:Online`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    return lines.join("\r\n");
  }

  function renderCalendar(sessions, monthOffset = 0) {
    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    document.getElementById("calendar-month").textContent =
      viewDate.toLocaleString("default", { month: "long", year: "numeric" });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const tbody = document.getElementById("calendar-body");
    tbody.innerHTML = "";

    let row = document.createElement("tr");

    // Empty cells before the first day
    for (let i = 0; i < firstDay; i++) {
      row.appendChild(document.createElement("td"));
    }

    // Fill in all days
    for (let day = 1; day <= daysInMonth; day++) {
      const td = document.createElement("td");
      td.innerHTML = `<div class="date">${day}</div>`;

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      sessions.filter(s => s.date === dateStr).forEach((s, idx) => {
        const eventId = `${dateStr}|${idx}`;
        td.innerHTML += `<div class="event"><strong data-event-id="${eventId}" data-event-date="${dateStr}" data-event-index="${idx}">${s.subject}</strong><br>${s.time} - ${s.tutor}</div>`;
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

  // Extra sessions persisted in localStorage
  function loadExtraSessions() {
    try {
      const raw = localStorage.getItem("extra_sessions");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveExtraSessions(arr) {
    try {
      localStorage.setItem("extra_sessions", JSON.stringify(arr));
    } catch (e) {
      console.warn("Could not save sessions", e);
    }
  }

  const baseSessions = await loadSessions();
  let extraSessions = loadExtraSessions();

  function allSessions() {
    return baseSessions.concat(extraSessions);
  }

  let offset = 0;
  renderCalendar(allSessions(), offset);

  document.getElementById("prev-month").addEventListener("click", () => { offset--; renderCalendar(allSessions(), offset); });
  document.getElementById("next-month").addEventListener("click", () => { offset++; renderCalendar(allSessions(), offset); });

  // Modal functionality
  const modal = document.getElementById("appointment-modal");
  const form = document.getElementById("appointment-form");
  const addBtn = document.getElementById("add-appointment");
  const closeBtn = document.getElementById("modal-close");
  const cancelBtn = document.getElementById("cancel-btn");

  function openModal() {
    modal.classList.remove("hidden");
    form.reset();
  }

  function closeModal() {
    modal.classList.add("hidden");
    form.reset();
  }

  if (addBtn) {
    addBtn.addEventListener("click", openModal);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeModal);
  }

  // Close modal when clicking outside the content
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Handle form submission
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = document.getElementById("apt-date").value;
      const time = document.getElementById("apt-time").value;
      const subject = document.getElementById("apt-subject").value;
      const tutor = document.getElementById("apt-tutor").value;

      if (!date || !time || !subject || !tutor) {
        alert("Please fill out all fields");
        return;
      }

      // Convert time from 24h format to 12h format (e.g., "16:00" -> "4:00 PM")
      const [hh, mm] = time.split(":").map(Number);
      const ampm = hh >= 12 ? "PM" : "AM";
      const h12 = hh % 12 || 12;
      const formattedTime = `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;

      const location = document.getElementById("apt-location").value;
      const ev = { date, time: formattedTime, subject, tutor, location };
      extraSessions.push(ev);
      saveExtraSessions(extraSessions);
      renderCalendar(allSessions(), offset);
      closeModal();
    });
  }

  // Event details modal
  const detailsModal = document.getElementById("event-details-modal");
  const detailsClose = document.getElementById("details-close");
  const detailsDone = document.getElementById("details-done");
  const detailsRemove = document.getElementById("details-remove");
  let currentEventData = null;

  function openDetailsModal(event) {
    currentEventData = event;
    document.getElementById("details-subject").textContent = event.subject;
    document.getElementById("details-time").textContent = event.time;
    document.getElementById("details-tutor").textContent = event.tutor;
    document.getElementById("details-location").textContent = event.location || "Not specified";

    const googleLink = formatGoogleLink(event);
    const ics = formatIcs(event);
    const icsHref = `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
    const fileName = `${event.subject.replace(/[^a-z0-9\- ]/gi, "").replace(/ /g, "_") || 'event'}.ics`;

    document.getElementById("details-google").href = googleLink;
    document.getElementById("details-ics").href = icsHref;
    document.getElementById("details-ics").download = fileName;

    detailsModal.classList.remove("hidden");
  }

  function closeDetailsModal() {
    detailsModal.classList.add("hidden");
    currentEventData = null;
  }

  if (detailsRemove) {
    detailsRemove.addEventListener("click", () => {
      if (currentEventData) {
        // Only remove from extraSessions (user-added appointments)
        const index = extraSessions.findIndex(
          e => e.date === currentEventData.date && 
               e.subject === currentEventData.subject && 
               e.tutor === currentEventData.tutor
        );
        if (index !== -1) {
          extraSessions.splice(index, 1);
          saveExtraSessions(extraSessions);
          renderCalendar(allSessions(), offset);
          closeDetailsModal();
        } else {
          alert("This is a base appointment and cannot be removed.");
        }
      }
    });
  }  if (detailsClose) {
    detailsClose.addEventListener("click", closeDetailsModal);
  }

  if (detailsDone) {
    detailsDone.addEventListener("click", closeDetailsModal);
  }

  if (detailsModal) {
    detailsModal.addEventListener("click", (e) => {
      if (e.target === detailsModal) {
        closeDetailsModal();
      }
    });
  }

  // Delegate click handler for event titles
  const tbody = document.getElementById("calendar-body");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      if (e.target.tagName === "STRONG" && e.target.getAttribute("data-event-id")) {
        const dateStr = e.target.getAttribute("data-event-date");
        const index = parseInt(e.target.getAttribute("data-event-index"), 10);

        // Find all events on that date
        const eventsOnDate = allSessions().filter(s => s.date === dateStr);
        const event = eventsOnDate[index];

        if (event) {
          openDetailsModal(event);
        }
      }
    });
  }
})();
