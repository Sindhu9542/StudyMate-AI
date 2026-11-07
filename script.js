
/* StudyMate AI - Complete JavaScript with Groq AI Integration */

const STORAGE_KEY = 'studymate_v2';

const defaultState = {
  studentPrefs: {
    name: '',
    dailyHours: 4,
    startTime: '09:00',
    sessionDuration: 45
  },
  subjects: [],
  summaries: [],
  plans: [],
  currentPlanId: null
};

let state = loadState();

// ---------- STORAGE ----------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return structuredClone(defaultState);

    const parsed = JSON.parse(raw);

    return {
      ...structuredClone(defaultState),
      ...parsed
    };
  } catch (error) {
    console.error('Could not load saved data:', error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const uid = () => Math.random().toString(36).slice(2, 9);

const fmtDate = (date) => new Date(date).toLocaleDateString();

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

// ---------- NAVIGATION ----------

document.querySelectorAll('.nav-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((item) => {
      item.classList.remove('active');
    });

    button.classList.add('active');

    document.querySelectorAll('.section').forEach((section) => {
      section.classList.remove('active');
    });

    const target = document.getElementById(
      `${button.dataset.target}-section`
    );

    if (target) target.classList.add('active');

    document.getElementById('pageTitle').textContent =
      button.textContent.trim();

    document.getElementById('sidebar').classList.remove('open');
  });
});

document.querySelectorAll('[data-jump]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.querySelector(
      `[data-target="${button.dataset.jump}"]`
    );

    if (target) target.click();
  });
});

document.getElementById('menuToggle').onclick = () => {
  document.getElementById('sidebar').classList.toggle('open');
};

// ---------- STUDENT PREFERENCES ----------

function renderPrefs() {
  const preferences = state.studentPrefs;

  document.getElementById('studentName').value =
    preferences.name || '';

  document.getElementById('dailyHours').value =
    preferences.dailyHours;

  document.getElementById('sessionDuration').value =
    preferences.sessionDuration;

  document.getElementById('startTime').value =
    preferences.startTime;

  document.getElementById('studentNameDisplay').textContent =
    preferences.name
      ? `Hello, ${preferences.name}!`
      : 'Hello, Student!';
}

document.getElementById('prefsForm').addEventListener('submit', (event) => {
  event.preventDefault();

  state.studentPrefs = {
    name: document.getElementById('studentName').value.trim(),
    dailyHours: parseInt(
      document.getElementById('dailyHours').value,
      10
    ),
    sessionDuration: parseInt(
      document.getElementById('sessionDuration').value,
      10
    ),
    startTime: document.getElementById('startTime').value
  };

  saveState();
  renderPrefs();
  renderDashboard();

  alert('Preferences saved!');
});

// ---------- SUBJECTS ----------

document.getElementById('subjectForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('subjectName').value.trim();
  const examDate = document.getElementById('examDate').value;

  if (!name) return;

  state.subjects.push({
    id: uid(),
    name,
    examDate,
    topics: []
  });

  saveState();

  event.target.reset();

  renderSubjects();
  renderDashboard();
});

function renderSubjects() {
  const list = document.getElementById('subjectsList');

  if (state.subjects.length === 0) {
    list.innerHTML =
      '<div class="card empty">No subjects yet. Add one above.</div>';
    return;
  }

  list.innerHTML = state.subjects.map((subject) => `
    <div class="card">
      <div class="card-header">
        <h3>${escapeHtml(subject.name)}</h3>
        <span class="badge">
          Exam: ${subject.examDate ? fmtDate(subject.examDate) : 'Not set'}
        </span>
      </div>

      <p class="muted">${subject.topics.length} topics</p>

      <div class="list" style="margin:12px 0">
        ${subject.topics.map((topic) => `
          <div class="list-item">
            <div>
              <b>${escapeHtml(topic.name)}</b>
              <span class="badge ${escapeHtml(topic.difficulty)}">
                ${escapeHtml(topic.difficulty)}
              </span>
            </div>

            <button class="btn danger"
              onclick="deleteTopic('${subject.id}','${topic.id}')">
              Delete
            </button>
          </div>
        `).join('') || '<div class="empty">No topics</div>'}
      </div>

      <div class="action-row">
        <button class="btn" onclick="openTopicModal('${subject.id}')">
          + Topic
        </button>

        <button class="btn danger"
          onclick="deleteSubject('${subject.id}')">
          Delete Subject
        </button>
      </div>
    </div>
  `).join('');
}

window.deleteSubject = (id) => {
  if (!confirm('Delete subject and its topics?')) return;

  state.subjects = state.subjects.filter((subject) => subject.id !== id);

  saveState();
  renderSubjects();
  renderDashboard();
};

window.deleteTopic = (subjectId, topicId) => {
  const subject = state.subjects.find((item) => item.id === subjectId);

  if (!subject) return;

  subject.topics = subject.topics.filter((topic) => topic.id !== topicId);

  saveState();
  renderSubjects();
  renderDashboard();
};

function openTopicModal(subjectId) {
  document.getElementById('topicSubjectId').value = subjectId;
  document.getElementById('topicModal').classList.remove('hidden');
}

window.openTopicModal = openTopicModal;

document.getElementById('closeTopicModal').onclick = () => {
  document.getElementById('topicModal').classList.add('hidden');
};

document.getElementById('topicForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const subjectId = document.getElementById('topicSubjectId').value;
  const subject = state.subjects.find((item) => item.id === subjectId);

  if (!subject) return;

  subject.topics.push({
    id: uid(),
    name: document.getElementById('topicName').value.trim(),
    difficulty: document.getElementById('topicDifficulty').value
  });

  saveState();

  document.getElementById('topicModal').classList.add('hidden');

  event.target.reset();

  renderSubjects();
  renderDashboard();
});

// ---------- AI TOPIC SUMMARIZER: GROQ API ----------

document.getElementById('summarizerForm').addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    const title =
      document.getElementById('sumTitle').value.trim() || 'Study Topic';

    const notes = document.getElementById('sumNotes').value.trim();

    if (notes.length < 20) {
      alert('Please paste more content (at least 20 characters).');
      return;
    }

    const output = document.getElementById('summaryOutput');

    output.classList.remove('hidden');
    output.textContent = 'Generating your AI summary. Please wait...';

    try {
      const response = await fetch('http://localhost:3000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: notes
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'The AI service could not generate a summary.'
        );
      }

      if (!result.summary || typeof result.summary !== 'string') {
        throw new Error('The AI returned an empty response.');
      }

      const summary = {
        explanation: result.summary,
        keyPoints: [],
        definitions: [],
        revisionNotes: []
      };

      output.innerHTML = `
        <div class="card-header">
          <h3>${escapeHtml(title)} - AI Summary</h3>

          <button class="btn primary" id="saveCurrentSummary">
            Save Summary
          </button>
        </div>

        <h4>AI-Generated Explanation</h4>

        <p style="white-space:pre-wrap">${escapeHtml(summary.explanation)}</p>
      `;

      output.dataset.temp = JSON.stringify({
        title,
        subject: 'General',
        original: notes,
        summary
      });

      document.getElementById('saveCurrentSummary').onclick = () => {
        const data = JSON.parse(output.dataset.temp);

        state.summaries.unshift({
          id: uid(),
          title: data.title,
          subject: data.subject,
          originalText: data.original,
          summary: data.summary,
          createdAt: new Date().toISOString()
        });

        saveState();

        renderSummaries();
        renderDashboard();

        alert('AI summary saved!');
      };

    } catch (error) {
      console.error('AI summarizer error:', error);

      output.textContent =
        `Could not generate the AI summary: ${error.message}`;
    }
  }
);

// ---------- SAVED SUMMARIES ----------

function renderSummaries() {
  const container = document.getElementById('savedSummariesList');

  if (state.summaries.length === 0) {
    container.innerHTML = '<div class="empty">No saved summaries</div>';
    return;
  }

  container.innerHTML = state.summaries.map((item) => `
    <div class="list-item">
      <div>
        <b>${escapeHtml(item.title)}</b>
        <br>
        <small class="muted">${fmtDate(item.createdAt)}</small>
        <br>

        <div style="margin-top:6px;font-size:13px">
          ${escapeHtml(
            (item.summary?.explanation || '').slice(0, 120)
          )}...
        </div>
      </div>

      <div class="action-row">
        <button class="btn" onclick="viewSummary('${item.id}')">
          View
        </button>

        <button class="btn" onclick="editSummary('${item.id}')">
          Edit
        </button>

        <button class="btn danger" onclick="deleteSummary('${item.id}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

window.viewSummary = (id) => {
  const item = state.summaries.find((summary) => summary.id === id);

  if (!item) return;

  const output = document.getElementById('summaryOutput');
  const summary = item.summary || {};

  output.classList.remove('hidden');

  output.innerHTML = `
    <h3>${escapeHtml(item.title)}</h3>

    <h4>Explanation</h4>
    <p style="white-space:pre-wrap">
      ${escapeHtml(summary.explanation || '')}
    </p>

    ${summary.keyPoints?.length ? `
      <h4>Key Points</h4>
      <p>${summary.keyPoints.map(escapeHtml).join('<br>')}</p>
    ` : ''}

    ${summary.definitions?.length ? `
      <h4>Important Definitions</h4>
      <p>${summary.definitions.map(escapeHtml).join('<br>')}</p>
    ` : ''}

    ${summary.revisionNotes?.length ? `
      <h4>Quick Revision Notes</h4>
      <p>${summary.revisionNotes.map(escapeHtml).join('<br>')}</p>
    ` : ''}
  `;
};

window.deleteSummary = (id) => {
  if (!confirm('Delete this summary?')) return;

  state.summaries = state.summaries.filter((item) => item.id !== id);

  saveState();

  renderSummaries();
  renderDashboard();
};

window.editSummary = (id) => {
  const item = state.summaries.find((summary) => summary.id === id);

  if (!item) return;

  const newTitle = prompt('Edit title', item.title);

  if (newTitle === null) return;

  item.title = newTitle.trim() || item.title;

  saveState();

  renderSummaries();
  renderDashboard();
};

// ---------- TIMETABLE GENERATOR ----------

function generateTimetable() {
  const preferences = state.studentPrefs;

  const planName =
    document.getElementById('planName').value.trim() ||
    `Plan ${fmtDate(new Date())}`;

  const topics = [];

  state.subjects.forEach((subject) => {
    subject.topics.forEach((topic) => {
      topics.push({
        subjectId: subject.id,
        subject: subject.name,
        examDate: subject.examDate
          ? new Date(`${subject.examDate}T00:00:00`)
          : new Date(Date.now() + 7 * 86400000),
        topicId: topic.id,
        topic: topic.name,
        difficulty: topic.difficulty
      });
    });
  });

  if (topics.length === 0) {
    alert('Add subjects and topics first.');
    return;
  }

  const difficultyWeight = {
    hard: 3,
    medium: 2,
    easy: 1
  };

  topics.sort((a, b) => {
    const dateDifference = a.examDate - b.examDate;

    if (dateDifference !== 0) return dateDifference;

    return difficultyWeight[b.difficulty] - difficultyWeight[a.difficulty];
  });

  const sessionMinutes = preferences.sessionDuration;
  const dailyHours = preferences.dailyHours;

  const slotsPerDay = Math.max(
    1,
    Math.floor((dailyHours * 60) / (sessionMinutes + 10))
  );

  const sessions = [];

  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  let topicIndex = 0;
  let warning = '';

  const lastExam = topics.reduce(
    (latest, topic) =>
      topic.examDate > latest ? topic.examDate : latest,
    new Date()
  );

  const totalDays = Math.max(
    1,
    Math.ceil((lastExam - currentDate) / 86400000) + 1
  );

  const totalSlots = totalDays * slotsPerDay;

  if (topics.length > totalSlots) {
    warning =
      `Warning: You have ${topics.length} topics but only about ` +
      `${totalSlots} available study slots before the last exam. ` +
      'Consider increasing your daily study hours.';
  }

  const [startHour, startMinute] = preferences.startTime
    .split(':')
    .map(Number);

  const startMinutes = startHour * 60 + startMinute;

  while (topicIndex < topics.length && currentDate <= lastExam) {
    for (
      let slot = 0;
      slot < slotsPerDay && topicIndex < topics.length;
      slot++
    ) {
      const topic = topics[topicIndex];

      const start = startMinutes + slot * (sessionMinutes + 10);
      const end = start + sessionMinutes;

      const toTime = (minutes) =>
        `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:` +
        `${String(minutes % 60).padStart(2, '0')}`;

      sessions.push({
        id: uid(),
        subject: topic.subject,
        topic: topic.topic,
        topicId: topic.topicId,
        date: new Date(currentDate).toISOString(),
        start: toTime(start),
        end: toTime(end),
        difficulty: topic.difficulty,
        type: 'study',
        completed: false
      });

      topicIndex++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (topicIndex < topics.length) {
    warning +=
      (warning ? ' ' : '') +
      `${topics.length - topicIndex} topics could not be scheduled.`;
  }

  const plan = {
    id: uid(),
    name: planName,
    createdAt: new Date().toISOString(),
    studentPrefs: { ...preferences },
    subjectsSnapshot: structuredClone(state.subjects),
    sessions
  };

  state.plans.unshift(plan);
  state.currentPlanId = plan.id;

  saveState();

  document.getElementById('timetableWarning').textContent = warning;
  document.getElementById('timetableWarning').className =
    warning ? 'alert warn' : 'alert hidden';

  renderTimetable(plan);
  renderPlans();
  renderDashboard();
  renderProgress();
}

document.getElementById('generateBtn').addEventListener(
  'click',
  generateTimetable
);

function renderTimetable(plan) {
  const container = document.getElementById('timetableList');
  const empty = document.getElementById('timetableEmpty');

  if (!plan || plan.sessions.length === 0) {
    empty.classList.remove('hidden');
    container.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');

  const groups = {};

  plan.sessions.forEach((session) => {
    const date = fmtDate(session.date);

    if (!groups[date]) groups[date] = [];

    groups[date].push(session);
  });

  container.innerHTML = Object.entries(groups).map(([date, sessions]) => `
    <div class="card">
      <h4>${escapeHtml(date)}</h4>

      ${sessions.map((session) => `
        <div class="session ${session.completed ? 'done' : ''}">
          <div class="meta">
            ${escapeHtml(session.start)} - ${escapeHtml(session.end)}
            • ${escapeHtml(session.type)}
            • <span class="badge ${escapeHtml(session.difficulty)}">
                ${escapeHtml(session.difficulty)}
              </span>
          </div>

          <b>
            ${escapeHtml(session.subject)}:
            ${escapeHtml(session.topic)}
          </b>

          <div class="action-row" style="margin-top:8px">
            <label style="display:flex;gap:6px;align-items:center">
              <input
                type="checkbox"
                ${session.completed ? 'checked' : ''}
                onchange="toggleSession('${plan.id}','${session.id}')"
              >
              Completed
            </label>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  updateCompletion(plan);
}

window.toggleSession = (planId, sessionId) => {
  const plan = state.plans.find((item) => item.id === planId);

  if (!plan) return;

  const session = plan.sessions.find((item) => item.id === sessionId);

  if (!session) return;

  session.completed = !session.completed;

  saveState();

  renderTimetable(plan);
  renderDashboard();
  renderProgress();
  renderPlans();
};

function updateCompletion(plan) {
  const total = plan.sessions.length;
  const completed = plan.sessions.filter((session) => session.completed).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById('completionPercent').textContent =
    `${percentage}%`;

  document.getElementById('progressFill').style.width =
    `${percentage}%`;

  document.getElementById('completionText').textContent =
    `${completed}/${total} sessions completed`;
}

// ---------- PREVIOUS PLANS ----------

function renderPlans() {
  const list = document.getElementById('plansList');

  if (state.plans.length === 0) {
    list.innerHTML =
      '<div class="empty">No previous plans. Generate one!</div>';
    return;
  }

  list.innerHTML = state.plans.map((plan) => {
    const completed = plan.sessions.filter(
      (session) => session.completed
    ).length;

    const percentage = plan.sessions.length
      ? Math.round((completed / plan.sessions.length) * 100)
      : 0;

    return `
      <div class="list-item">
        <div>
          <b>${escapeHtml(plan.name)}</b>
          <br>
          <small class="muted">
            ${fmtDate(plan.createdAt)}
            • ${plan.sessions.length} sessions
            • ${percentage}% done
            ${state.currentPlanId === plan.id ? '(Current)' : ''}
          </small>
        </div>

        <div class="action-row">
          <button class="btn" onclick="openPlan('${plan.id}')">Open</button>
          <button class="btn" onclick="renamePlan('${plan.id}')">Rename</button>
          <button class="btn" onclick="duplicatePlan('${plan.id}')">Duplicate</button>
          <button class="btn danger" onclick="deletePlan('${plan.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.openPlan = (id) => {
  const plan = state.plans.find((item) => item.id === id);

  if (!plan) return;

  state.currentPlanId = id;

  saveState();

  renderTimetable(plan);
  renderDashboard();
  renderPlans();

  document.querySelector('[data-target="timetable"]').click();
};

window.renamePlan = (id) => {
  const plan = state.plans.find((item) => item.id === id);

  if (!plan) return;

  const name = prompt('New plan name', plan.name);

  if (!name) return;

  plan.name = name.trim() || plan.name;

  saveState();
  renderPlans();
};

window.duplicatePlan = (id) => {
  const plan = state.plans.find((item) => item.id === id);

  if (!plan) return;

  const copy = structuredClone(plan);

  copy.id = uid();
  copy.name = `${plan.name} (Copy)`;
  copy.createdAt = new Date().toISOString();

  state.plans.unshift(copy);

  saveState();

  renderPlans();
  renderDashboard();
};

window.deletePlan = (id) => {
  if (!confirm('Delete this plan permanently?')) return;

  state.plans = state.plans.filter((plan) => plan.id !== id);

  if (state.currentPlanId === id) {
    state.currentPlanId = state.plans[0]?.id || null;
  }

  saveState();

  renderPlans();
  renderDashboard();

  if (state.currentPlanId) {
    const currentPlan = state.plans.find(
      (plan) => plan.id === state.currentPlanId
    );

    renderTimetable(currentPlan);
  } else {
    document.getElementById('timetableList').innerHTML = '';
    document.getElementById('timetableEmpty').classList.remove('hidden');
  }
};

document.getElementById('newPlanBtn').onclick = () => {
    if (!confirm('Start a new timetable? Your current subjects and topics will be cleared, but previous plans will remain saved.')) {
        return;
    }

    // Clear subjects and topics
    state.subjects = [];

    // Clear active plan
    state.currentPlanId = null;

    // Save cleared data
    saveState();

    // Clear subject form
    document.getElementById('subjectForm').reset();

    // Update subjects section
    renderSubjects();

    // Clear timetable
    document.getElementById('timetableList').innerHTML = '';
    document.getElementById('timetableEmpty').classList.remove('hidden');

    // Clear warning
    document.getElementById('timetableWarning').className = 'alert hidden';

    // Update dashboard and progress
    renderDashboard();
    renderProgress();

    // Refresh previous plans without deleting them
    renderPlans();

    // Navigate to timetable
    document.querySelector('[data-target="timetable"]').click();

    alert('New timetable started! Add your subjects and topics.');
};

// ---------- DASHBOARD ----------

function renderDashboard() {
  const totalTopics = state.subjects.reduce(
    (total, subject) => total + subject.topics.length,
    0
  );

  const currentPlan =
    state.plans.find((plan) => plan.id === state.currentPlanId) ||
    state.plans[0];

  const completed = currentPlan
    ? currentPlan.sessions.filter((session) => session.completed).length
    : 0;

  const pending = currentPlan
    ? currentPlan.sessions.length - completed
    : 0;

  document.getElementById('statTotalTopics').textContent = totalTopics;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statPending').textContent = pending;

  if (currentPlan) {
    updateCompletion(currentPlan);
  } else {
    document.getElementById('completionPercent').textContent = '0%';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('completionText').textContent =
      'No plan generated yet';
  }

  const recent = document.getElementById('recentSummaries');

  if (state.summaries.length === 0) {
    recent.innerHTML = '<div class="empty">No summaries yet</div>';
  } else {
    recent.innerHTML = state.summaries.slice(0, 3).map((summary) => `
      <div style="padding:8px 0;border-bottom:1px solid #eee">
        <b>${escapeHtml(summary.title)}</b>
      </div>
    `).join('');
  }

  renderProgress();
}

// ---------- PROGRESS TRACKER ----------

function renderProgress() {
  const plan =
    state.plans.find((item) => item.id === state.currentPlanId) ||
    state.plans[0];

  const total = plan ? plan.sessions.length : 0;

  const completed = plan
    ? plan.sessions.filter((session) => session.completed).length
    : 0;

  document.getElementById('pTotal').textContent = total;
  document.getElementById('pDone').textContent = completed;

  document.getElementById('pPerc').textContent =
    total ? `${Math.round((completed / total) * 100)}%` : '0%';

  const subjectProgress = document.getElementById('subjectProgress');

  if (!plan) {
    subjectProgress.innerHTML = '<div class="empty">No plan</div>';
    return;
  }

  const progressMap = {};

  plan.sessions.forEach((session) => {
    if (!progressMap[session.subject]) {
      progressMap[session.subject] = {
        total: 0,
        done: 0
      };
    }

    progressMap[session.subject].total++;

    if (session.completed) {
      progressMap[session.subject].done++;
    }
  });

  subjectProgress.innerHTML = Object.entries(progressMap).map(
    ([subject, values]) => `
      <div class="list-item">
        <span>${escapeHtml(subject)}</span>
        <span>
          ${values.done}/${values.total}
          (${Math.round((values.done / values.total) * 100)}%)
        </span>
      </div>
    `
  ).join('');
}

// ---------- INITIALIZATION ----------

function init() {
  if (!Array.isArray(state.subjects)) state.subjects = [];
  if (!Array.isArray(state.summaries)) state.summaries = [];
  if (!Array.isArray(state.plans)) state.plans = [];

  renderPrefs();
  renderSubjects();
  renderSummaries();
  renderPlans();

  if (state.currentPlanId) {
    const currentPlan = state.plans.find(
      (plan) => plan.id === state.currentPlanId
    );

    if (currentPlan) {
      renderTimetable(currentPlan);
    }
  }

  renderDashboard();
  renderProgress();
}

init();
