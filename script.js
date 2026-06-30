const STORAGE_KEY = "summerStudyPlannerData";

const state = {
  activeTimerTab: "normal",
  timerSeconds: 25 * 60,
  totalTimerSeconds: 25 * 60,
  timerInterval: null,
  isRunning: false,
  pomodoroMode: "focus",
  pomodoroCompleted: 0,
  notes: [],
  gallery: [],
  dailyGoal: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
  todayText: $("#todayText"),
  studyStreak: $("#studyStreak"),
  timerDisplay: $("#timerDisplay"),
  timerModeText: $("#timerModeText"),
  normalMinutes: $("#normalMinutes"),
  focusMinutes: $("#focusMinutes"),
  shortBreakMinutes: $("#shortBreakMinutes"),
  longBreakMinutes: $("#longBreakMinutes"),
  startTimerBtn: $("#startTimerBtn"),
  pauseTimerBtn: $("#pauseTimerBtn"),
  resetTimerBtn: $("#resetTimerBtn"),
  nextPomodoroBtn: $("#nextPomodoroBtn"),
  pomodoroCount: $("#pomodoroCount"),
  plainTitle: $("#plainTitle"),
  plainContent: $("#plainContent"),
  codeTitle: $("#codeTitle"),
  codeLanguage: $("#codeLanguage"),
  codeContent: $("#codeContent"),
  markdownTitle: $("#markdownTitle"),
  markdownContent: $("#markdownContent"),
  markdownPreview: $("#markdownPreview"),
  imageInput: $("#imageInput"),
  galleryGrid: $("#galleryGrid"),
  dailyGoal: $("#dailyGoal"),
  savedList: $("#savedList")
};

function init() {
  loadData();
  setToday();
  bindEvents();
  updateTimerFromInputs();
  renderTimer();
  renderNotes();
  renderGallery();
  renderMarkdownPreview();
  elements.dailyGoal.value = state.dailyGoal || "";
}

function bindEvents() {
  $$('[data-timer-tab]').forEach((button) => {
    button.addEventListener("click", () => switchTimerTab(button.dataset.timerTab));
  });

  $$('[data-note-tab]').forEach((button) => {
    button.addEventListener("click", () => switchNoteTab(button.dataset.noteTab));
  });

  elements.startTimerBtn.addEventListener("click", startTimer);
  elements.pauseTimerBtn.addEventListener("click", pauseTimer);
  elements.resetTimerBtn.addEventListener("click", resetTimer);
  elements.nextPomodoroBtn.addEventListener("click", nextPomodoroStep);

  [elements.normalMinutes, elements.focusMinutes, elements.shortBreakMinutes, elements.longBreakMinutes].forEach((input) => {
    input.addEventListener("change", () => {
      if (!state.isRunning) {
        updateTimerFromInputs();
        renderTimer();
      }
      saveData();
    });
  });

  $("#savePlainBtn").addEventListener("click", savePlainNote);
  $("#saveCodeBtn").addEventListener("click", saveCodeNote);
  $("#saveMarkdownBtn").addEventListener("click", saveMarkdownNote);
  $("#saveGoalBtn").addEventListener("click", saveGoal);
  $("#clearAllBtn").addEventListener("click", clearAllNotes);

  elements.markdownContent.addEventListener("input", renderMarkdownPreview);
  elements.imageInput.addEventListener("change", handleImageUpload);
}

function setToday() {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long"
  });
  elements.todayText.textContent = formatter.format(date);
}

function switchTimerTab(tabName) {
  state.activeTimerTab = tabName;
  pauseTimer();

  $$('[data-timer-tab]').forEach((button) => button.classList.toggle("active", button.dataset.timerTab === tabName));
  $("#normalTimerPanel").classList.toggle("active", tabName === "normal");
  $("#pomodoroPanel").classList.toggle("active", tabName === "pomodoro");
  elements.nextPomodoroBtn.style.display = tabName === "pomodoro" ? "block" : "none";

  updateTimerFromInputs();
  renderTimer();
  saveData();
}

function switchNoteTab(tabName) {
  $$('[data-note-tab]').forEach((button) => button.classList.toggle("active", button.dataset.noteTab === tabName));
  $("#plainPanel").classList.toggle("active", tabName === "plain");
  $("#codePanel").classList.toggle("active", tabName === "code");
  $("#markdownPanel").classList.toggle("active", tabName === "markdown");
}

function updateTimerFromInputs() {
  if (state.activeTimerTab === "normal") {
    const minutes = sanitizeMinutes(elements.normalMinutes.value, 25);
    state.timerSeconds = minutes * 60;
    state.totalTimerSeconds = state.timerSeconds;
    state.pomodoroMode = "normal";
  } else {
    state.pomodoroMode = state.pomodoroMode === "normal" ? "focus" : state.pomodoroMode;
    setPomodoroSeconds(state.pomodoroMode);
  }
}

function sanitizeMinutes(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function setPomodoroSeconds(mode) {
  const focus = sanitizeMinutes(elements.focusMinutes.value, 25);
  const shortBreak = sanitizeMinutes(elements.shortBreakMinutes.value, 5);
  const longBreak = sanitizeMinutes(elements.longBreakMinutes.value, 15);
  const minutesByMode = {
    focus,
    shortBreak,
    longBreak
  };
  state.pomodoroMode = mode;
  state.timerSeconds = minutesByMode[mode] * 60;
  state.totalTimerSeconds = state.timerSeconds;
}

function startTimer() {
  if (state.isRunning) return;

  if (state.timerSeconds <= 0) {
    updateTimerFromInputs();
  }

  state.isRunning = true;
  elements.startTimerBtn.textContent = "진행 중";

  state.timerInterval = setInterval(() => {
    state.timerSeconds -= 1;
    renderTimer();

    if (state.timerSeconds <= 0) {
      pauseTimer();
      playDoneSound();
      if (state.activeTimerTab === "pomodoro") {
        nextPomodoroStep();
        startTimer();
      }
    }
  }, 1000);
}

function pauseTimer() {
  state.isRunning = false;
  elements.startTimerBtn.textContent = "시작";
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  updateTimerFromInputs();
  renderTimer();
}

function nextPomodoroStep() {
  pauseTimer();

  if (state.activeTimerTab !== "pomodoro") {
    switchTimerTab("pomodoro");
    return;
  }

  if (state.pomodoroMode === "focus") {
    state.pomodoroCompleted += 1;
    const isLongBreakTime = state.pomodoroCompleted % 4 === 0;
    setPomodoroSeconds(isLongBreakTime ? "longBreak" : "shortBreak");
  } else {
    setPomodoroSeconds("focus");
  }

  renderTimer();
  saveData();
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const restSeconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${restSeconds}`;
}

function renderTimer() {
  elements.timerDisplay.textContent = formatTime(state.timerSeconds);

  const modeText = {
    normal: "일반 타이머",
    focus: "포모도로 집중 시간",
    shortBreak: "짧은 휴식",
    longBreak: "긴 휴식"
  };

  elements.timerModeText.textContent = modeText[state.pomodoroMode] || "일반 타이머";
  elements.pomodoroCount.textContent = `완료한 포모도로: ${state.pomodoroCompleted}회`;
  elements.studyStreak.textContent = `${state.notes.length} Notes`;
}

function playDoneSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
  } catch (error) {
    console.info("알림음을 재생할 수 없습니다.", error);
  }
}

function savePlainNote() {
  const title = elements.plainTitle.value.trim();
  const content = elements.plainContent.value.trim();
  if (!content && !title) return alert("저장할 학습 노트를 입력해주세요.");

  addNote({
    type: "학습 노트",
    title: title || "제목 없는 학습 노트",
    content,
    language: null
  });

  elements.plainTitle.value = "";
  elements.plainContent.value = "";
}

function saveCodeNote() {
  const title = elements.codeTitle.value.trim();
  const content = elements.codeContent.value.trim();
  if (!content && !title) return alert("저장할 코드를 입력해주세요.");

  addNote({
    type: "코드 메모",
    title: title || "제목 없는 코드 메모",
    content,
    language: elements.codeLanguage.value
  });

  elements.codeTitle.value = "";
  elements.codeContent.value = "";
}

function saveMarkdownNote() {
  const title = elements.markdownTitle.value.trim();
  const content = elements.markdownContent.value.trim();
  if (!content && !title) return alert("저장할 마크다운 내용을 입력해주세요.");

  addNote({
    type: "마크다운",
    title: title || "제목 없는 마크다운",
    content,
    language: null
  });

  elements.markdownTitle.value = "";
  elements.markdownContent.value = "";
  renderMarkdownPreview();
}

function addNote(note) {
  state.notes.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    ...note
  });
  saveData();
  renderNotes();
}

function deleteNote(id) {
  state.notes = state.notes.filter((note) => note.id !== id);
  saveData();
  renderNotes();
}

function clearAllNotes() {
  if (!state.notes.length) return;
  const confirmed = confirm("저장된 메모를 모두 삭제할까요?");
  if (!confirmed) return;
  state.notes = [];
  saveData();
  renderNotes();
}

function renderNotes() {
  elements.savedList.innerHTML = "";

  if (!state.notes.length) {
    elements.savedList.innerHTML = `<div class="empty-state">아직 저장된 메모가 없습니다. 오늘의 공부 기록을 남겨보세요 🐚</div>`;
    elements.studyStreak.textContent = "0 Notes";
    return;
  }

  state.notes.forEach((note) => {
    const item = document.createElement("article");
    item.className = "note-item";

    const contentHtml = note.type === "코드 메모"
      ? `<pre><code>${escapeHtml(note.content)}</code></pre>`
      : note.type === "마크다운"
        ? `<div>${markdownToHtml(note.content)}</div>`
        : `<p>${escapeHtml(note.content)}</p>`;

    item.innerHTML = `
      <header>
        <div>
          <span class="note-type">${escapeHtml(note.type)}${note.language ? ` · ${escapeHtml(note.language)}` : ""}</span>
          <h3>${escapeHtml(note.title)}</h3>
        </div>
      </header>
      ${contentHtml}
      <small>${formatDate(note.createdAt)}</small>
      <div class="note-actions">
        <button class="ghost" data-copy-id="${note.id}">복사</button>
        <button class="small-danger" data-delete-id="${note.id}">삭제</button>
      </div>
    `;

    elements.savedList.appendChild(item);
  });

  $$('[data-delete-id]').forEach((button) => {
    button.addEventListener("click", () => deleteNote(button.dataset.deleteId));
  });

  $$('[data-copy-id]').forEach((button) => {
    button.addEventListener("click", () => copyNote(button.dataset.copyId));
  });

  elements.studyStreak.textContent = `${state.notes.length} Notes`;
}

function copyNote(id) {
  const note = state.notes.find((item) => item.id === id);
  if (!note) return;
  navigator.clipboard.writeText(note.content || note.title).then(() => {
    alert("메모 내용을 복사했습니다.");
  });
}

function renderMarkdownPreview() {
  const markdown = elements.markdownContent.value.trim();
  elements.markdownPreview.innerHTML = markdown ? markdownToHtml(markdown) : "마크다운 미리보기가 여기에 표시됩니다.";
}

function markdownToHtml(markdown) {
  let html = escapeHtml(markdown);

  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");
  html = html.replace(/\n/g, "<br>");

  return html;
}

function handleImageUpload(event) {
  const files = Array.from(event.target.files || []);
  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      state.gallery.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${file.name}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        src: reader.result
      });
      saveData();
      renderGallery();
    };
    reader.readAsDataURL(file);
  });

  event.target.value = "";
}

function renderGallery() {
  elements.galleryGrid.innerHTML = "";

  if (!state.gallery.length) {
    elements.galleryGrid.innerHTML = `<div class="empty-state">이미지를 첨부하면 이곳에 갤러리 카드가 생깁니다 🏖️</div>`;
    return;
  }

  state.gallery.forEach((image) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.innerHTML = `
      <img src="${image.src}" alt="${escapeHtml(image.title)}" />
      <div class="gallery-body">
        <input type="text" value="${escapeHtml(image.title)}" data-image-title="${image.id}" aria-label="이미지 제목" />
        <button class="small-danger" data-image-delete="${image.id}">삭제</button>
      </div>
    `;
    elements.galleryGrid.appendChild(item);
  });

  $$('[data-image-delete]').forEach((button) => {
    button.addEventListener("click", () => {
      state.gallery = state.gallery.filter((image) => image.id !== button.dataset.imageDelete);
      saveData();
      renderGallery();
    });
  });

  $$('[data-image-title]').forEach((input) => {
    input.addEventListener("input", () => {
      const image = state.gallery.find((item) => item.id === input.dataset.imageTitle);
      if (image) {
        image.title = input.value;
        saveData();
      }
    });
  });
}

function saveGoal() {
  state.dailyGoal = elements.dailyGoal.value.trim();
  saveData();
  alert("오늘의 학습 목표를 저장했습니다.");
}

function saveData() {
  const data = {
    notes: state.notes,
    gallery: state.gallery,
    dailyGoal: state.dailyGoal,
    activeTimerTab: state.activeTimerTab,
    pomodoroCompleted: state.pomodoroCompleted,
    timerSettings: {
      normalMinutes: elements.normalMinutes?.value,
      focusMinutes: elements.focusMinutes?.value,
      shortBreakMinutes: elements.shortBreakMinutes?.value,
      longBreakMinutes: elements.longBreakMinutes?.value
    }
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    alert("저장 공간이 부족할 수 있습니다. 큰 이미지를 줄인 뒤 다시 시도해주세요.");
    console.error(error);
  }
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    state.notes = data.notes || [];
    state.gallery = data.gallery || [];
    state.dailyGoal = data.dailyGoal || "";
    state.activeTimerTab = data.activeTimerTab || "normal";
    state.pomodoroCompleted = data.pomodoroCompleted || 0;

    if (data.timerSettings) {
      elements.normalMinutes.value = data.timerSettings.normalMinutes || 25;
      elements.focusMinutes.value = data.timerSettings.focusMinutes || 25;
      elements.shortBreakMinutes.value = data.timerSettings.shortBreakMinutes || 5;
      elements.longBreakMinutes.value = data.timerSettings.longBreakMinutes || 15;
    }

    switchTimerTab(state.activeTimerTab);
  } catch (error) {
    console.error("저장 데이터를 불러오지 못했습니다.", error);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

init();
