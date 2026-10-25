/* StudyMate AI - Vanilla JS Complete Version - Subject Removed */
const STORAGE_KEY = 'studymate_v2';

const defaultState = {
  studentPrefs: { name: '', dailyHours: 4, startTime: '09:00', sessionDuration: 45 },
  subjects: [],
  summaries: [],
  plans: [],
  currentPlanId: null
};

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  }catch{ return structuredClone(defaultState); }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const uid = () => Math.random().toString(36).slice(2,9);
const fmtDate = (d) => new Date(d).toLocaleDateString();
const escapeHtml = (s) => (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// ---------- NAV ----------
document.querySelectorAll('.nav-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById(`${b.dataset.target}-section`).classList.add('active');
    document.getElementById('pageTitle').textContent = b.textContent.trim();
    document.getElementById('sidebar').classList.remove('open');
  });
});
document.querySelectorAll('[data-jump]').forEach(b=>{
  b.addEventListener('click', ()=> document.querySelector(`[data-target="${b.dataset.jump}"]`).click());
});
document.getElementById('menuToggle').onclick = ()=> document.getElementById('sidebar').classList.toggle('open');

// ---------- PREFS ----------
function renderPrefs(){
  const p = state.studentPrefs;
  document.getElementById('studentName').value = p.name || '';
  document.getElementById('dailyHours').value = p.dailyHours;
  document.getElementById('sessionDuration').value = p.sessionDuration;
  document.getElementById('startTime').value = p.startTime;
  document.getElementById('studentNameDisplay').textContent = p.name ? `Hello, ${escapeHtml(p.name)}!` : 'Hello, Student!';
}
document.getElementById('prefsForm').addEventListener('submit', e=>{
  e.preventDefault();
  state.studentPrefs = {
    name: document.getElementById('studentName').value.trim(),
    dailyHours: parseInt(document.getElementById('dailyHours').value),
    sessionDuration: parseInt(document.getElementById('sessionDuration').value),
    startTime: document.getElementById('startTime').value
  };
  saveState(); renderPrefs(); renderDashboard(); alert('Preferences saved');
});

// ---------- SUBJECTS ----------
document.getElementById('subjectForm').addEventListener('submit', e=>{
  e.preventDefault();
  const name = document.getElementById('subjectName').value.trim();
  const examDate = document.getElementById('examDate').value;
  if(!name) return;
  state.subjects.push({ id: uid(), name, examDate, topics: [] });
  saveState(); e.target.reset(); renderSubjects(); renderDashboard();
});
function renderSubjects(){
  const list = document.getElementById('subjectsList');
  if(state.subjects.length===0){ list.innerHTML='<div class="card empty">No subjects yet. Add one above.</div>'; return; }
  list.innerHTML = state.subjects.map(s=>`
    <div class="card">
      <div class="card-header"><h3>${escapeHtml(s.name)}</h3><span class="badge">Exam: ${s.examDate?fmtDate(s.examDate):'Not set'}</span></div>
      <p class="muted">${s.topics.length} topics</p>
      <div class="list" style="margin:12px 0">${s.topics.map(t=>`
        <div class="list-item"><div><b>${escapeHtml(t.name)}</b> <span class="badge ${t.difficulty}">${t.difficulty}</span></div>
        <button class="btn danger" onclick="deleteTopic('${s.id}','${t.id}')">Delete</button></div>`).join('') || '<div class="empty">No topics</div>'}
      </div>
      <div class="action-row">
        <button class="btn" onclick="openTopicModal('${s.id}')">+ Topic</button>
        <button class="btn danger" onclick="deleteSubject('${s.id}')">Delete Subject</button>
      </div>
    </div>`).join('');
}
window.deleteSubject = (id)=>{
  if(!confirm('Delete subject and its topics?')) return;
  state.subjects = state.subjects.filter(s=>s.id!==id); saveState(); renderSubjects();
};
window.deleteTopic = (sid,tid)=>{
  const s = state.subjects.find(x=>x.id===sid); if(!s) return;
  s.topics = s.topics.filter(t=>t.id!==tid); saveState(); renderSubjects();
};
function openTopicModal(sid){ document.getElementById('topicSubjectId').value=sid; document.getElementById('topicModal').classList.remove('hidden'); }
window.openTopicModal = openTopicModal;
document.getElementById('closeTopicModal').onclick = ()=> document.getElementById('topicModal').classList.add('hidden');
document.getElementById('topicForm').addEventListener('submit', e=>{
  e.preventDefault();
  const sid = document.getElementById('topicSubjectId').value;
  const sub = state.subjects.find(s=>s.id===sid); if(!sub) return;
  sub.topics.push({ id: uid(), name: document.getElementById('topicName').value.trim(), difficulty: document.getElementById('topicDifficulty').value });
  saveState(); document.getElementById('topicModal').classList.add('hidden'); e.target.reset(); renderSubjects(); renderDashboard();
});

// ---------- SUMMARIZER - SUBJECT REMOVED ----------
function demoSummarize(text){
  const sentences = text.split(/[.!?]+/).map(s=>s.trim()).filter(Boolean);
  const words = text.toLowerCase().split(/\W+/).filter(w=>w.length>4);
  const freq = {}; words.forEach(w=>freq[w]=(freq[w]||0)+1);
  const topWords = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);
  const explanation = sentences.slice(0,2).join('. ') + (sentences.length?' .':'');
  const keyPoints = sentences.slice(0,5).map(s=>`• ${s}`);
  const definitions = sentences.filter(s=>/ is | means | defined as | refers to /i.test(s)).slice(0,3).map(s=>`• ${s}`);
  if(definitions.length===0) definitions.push(`• Key terms: ${topWords.join(', ')}`);
  const revision = [`Focus on: ${topWords.slice(0,5).join(', ')}`, `Quick recall: ${sentences.length} points in notes, revise hard parts first.`];
  return { explanation, keyPoints, definitions, revisionNotes: revision };
}

document.getElementById('summarizerForm').addEventListener('submit', e=>{
  e.preventDefault();
  const title = document.getElementById('sumTitle').value.trim();
  const subject = "General";
  const notes = document.getElementById('sumNotes').value.trim();
  if(notes.length < 20){ alert('Please paste more content (at least 20 chars)'); return; }

  const summary = demoSummarize(notes);
  const out = document.getElementById('summaryOutput');
  out.classList.remove('hidden');
  out.innerHTML = `
    <div class="card-header"><h3>${escapeHtml(title)} - Summary (Demo)</h3>
    <button class="btn primary" id="saveCurrentSummary">Save Summary</button></div>
    <h4>Short Explanation</h4><p>${escapeHtml(summary.explanation)}</p>
    <h4>Key Points</h4><p>${summary.keyPoints.map(escapeHtml).join('<br>')}</p>
    <h4>Important Definitions</h4><p>${summary.definitions.map(escapeHtml).join('<br>')}</p>
    <h4>Quick Revision Notes</h4><p>${summary.revisionNotes.map(escapeHtml).join('<br>')}</p>
  `;
  out.dataset.temp = JSON.stringify({ title, subject, original: notes, summary });
  document.getElementById('saveCurrentSummary').onclick = ()=>{
    const data = JSON.parse(out.dataset.temp);
    state.summaries.unshift({ id: uid(), title: data.title, subject: data.subject, originalText: data.original, summary: data.summary, createdAt: new Date().toISOString() });
    saveState(); renderSummaries(); renderDashboard(); alert('Summary saved');
  };
});

function renderSummaries(){
  const c = document.getElementById('savedSummariesList');
  if(state.summaries.length===0){ c.innerHTML='<div class="empty">No saved summaries</div>'; return; }
  c.innerHTML = state.summaries.map(s=>`
    <div class="list-item">
      <div><b>${escapeHtml(s.title)}</b><br><small class="muted">${fmtDate(s.createdAt)}</small><br>
      <div style="margin-top:6px;font-size:13px">${escapeHtml(s.summary.explanation).slice(0,120)}...</div></div>
      <div class="action-row"><button class="btn" onclick="viewSummary('${s.id}')">View</button><button class="btn" onclick="editSummary('${s.id}')">Edit</button><button class="btn danger" onclick="deleteSummary('${s.id}')">Delete</button></div>
    </div>`).join('');
}
window.viewSummary = (id)=>{
  const s = state.summaries.find(x=>x.id===id); if(!s) return;
  const out = document.getElementById('summaryOutput'); out.classList.remove('hidden');
  out.innerHTML = `<h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.summary.explanation)}</p><p>${s.summary.keyPoints.map(escapeHtml).join('<br>')}</p><p>${s.summary.definitions.map(escapeHtml).join('<br>')}</p><p>${s.summary.revisionNotes.map(escapeHtml).join('<br>')}</p>`;
};
window.deleteSummary = (id)=>{
  if(!confirm('Delete this summary?')) return;
  state.summaries = state.summaries.filter(s=>s.id!==id); saveState(); renderSummaries();
};
window.editSummary = (id)=>{
  const s = state.summaries.find(x=>x.id===id); if(!s) return;
  const newTitle = prompt('Edit title', s.title); if(newTitle===null) return;
  s.title = newTitle.trim()||s.title; saveState(); renderSummaries();
};

// ---------- TIMETABLE & PLANS & DASHBOARD (same) ----------
function generateTimetable(){
  const prefs = state.studentPrefs;
  const planNameInput = document.getElementById('planName').value.trim() || `Plan ${fmtDate(new Date())}`;
  let all = [];
  state.subjects.forEach(sub=>{
    sub.topics.forEach(t=>{
      all.push({ subjectId: sub.id, subject: sub.name, examDate: sub.examDate ? new Date(sub.examDate) : new Date(Date.now()+7*86400000), topicId: t.id, topic: t.name, difficulty: t.difficulty });
    });
  });
  if(all.length===0){ alert('Add subjects and topics first'); return; }
  const weight = { hard:3, medium:2, easy:1 };
  all.sort((a,b)=>{
    const d = a.examDate - b.examDate;
    if(d!==0) return d;
    return weight[b.difficulty]-weight[a.difficulty];
  });
  const sessionMins = prefs.sessionDuration;
  const dailyHours = prefs.dailyHours;
  const slotsPerDay = Math.max(1, Math.floor((dailyHours*60)/ (sessionMins+10)));
  let sessions = [];
  let dayCursor = new Date(); dayCursor.setHours(0,0,0,0);
  let topicIndex = 0;
  let warning = '';
  const lastExam = all.reduce((max,c)=> c.examDate>max?c.examDate:max, new Date());
  const totalDays = Math.ceil((lastExam - dayCursor)/86400000)+1;
  const totalSlots = totalDays * slotsPerDay;
  if(all.length*1.2 > totalSlots){
    warning = `Warning: You have ${all.length} topics but only ~${totalSlots} slots before last exam (${fmtDate(lastExam)}). Increase daily hours.`;
  }
  let currentDate = new Date(dayCursor);
  let timeCursorMins = (()=>{ const [h,m]=prefs.startTime.split(':').map(Number); return h*60+m; })();
  while(topicIndex < all.length && currentDate <= lastExam){
    for(let slot=0; slot<slotsPerDay && topicIndex < all.length; slot++){
      const item = all[topicIndex];
      const startM = timeCursorMins + slot*(sessionMins+10);
      const endM = startM + sessionMins;
      const toTime = (mins)=> `${String(Math.floor(mins/60)%24).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
      sessions.push({ id: uid(), subject: item.subject, topic: item.topic, topicId: item.topicId, date: new Date(currentDate).toISOString(), start: toTime(startM), end: toTime(endM), difficulty: item.difficulty, type: 'study', completed: false });
      topicIndex++;
      if(item.difficulty==='hard' && topicIndex < totalSlots){
        all.splice(Math.min(all.length, topicIndex+slotsPerDay*2), 0, {...item, isRevision:true});
      }
    }
    if(all[topicIndex]?.isRevision){
      const item = all[topicIndex];
      sessions.push({ id: uid(), subject: item.subject, topic: item.topic + ' (Revision)', topicId: item.topicId, date: new Date(currentDate).toISOString(), start: `09:00`, end: `09:45`, difficulty: item.difficulty, type: 'revision', completed: false });
      topicIndex++;
    }
    currentDate.setDate(currentDate.getDate()+1);
  }
  const plan = { id: uid(), name: planNameInput, createdAt: new Date().toISOString(), studentPrefs: {...prefs}, subjectsSnapshot: structuredClone(state.subjects), sessions };
  state.plans.unshift(plan);
  state.currentPlanId = plan.id;
  saveState();
  document.getElementById('timetableWarning').textContent = warning;
  document.getElementById('timetableWarning').className = warning ? 'alert warn' : 'alert hidden';
  renderTimetable(plan); renderPlans(); renderDashboard(); renderProgress();
}
document.getElementById('generateBtn').addEventListener('click', generateTimetable);
function renderTimetable(plan){
  const container = document.getElementById('timetableList');
  const empty = document.getElementById('timetableEmpty');
  if(!plan || plan.sessions.length===0){ empty.classList.remove('hidden'); container.innerHTML=''; return; }
  empty.classList.add('hidden');
  const groups = {};
  plan.sessions.forEach(s=>{ const d = fmtDate(s.date); if(!groups[d]) groups[d]=[]; groups[d].push(s); });
  container.innerHTML = Object.entries(groups).map(([date, sess])=>`
    <div class="card"><h4>${date}</h4>
      ${sess.map(ss=>`
        <div class="session ${ss.completed?'done':''}">
          <div class="meta">${ss.start} - ${ss.end} • ${ss.type} • <span class="badge ${ss.difficulty}">${ss.difficulty}</span></div>
          <b>${escapeHtml(ss.subject)}: ${escapeHtml(ss.topic)}</b>
          <div class="action-row" style="margin-top:8px">
            <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" ${ss.completed?'checked':''} onchange="toggleSession('${plan.id}','${ss.id}')"> Completed</label>
          </div>
        </div>`).join('')}
    </div>`).join('');
  updateCompletion(plan);
}
window.toggleSession = (planId, sessionId)=>{
  const plan = state.plans.find(p=>p.id===planId) || state.plans.find(p=>p.id===state.currentPlanId);
  if(!plan) return;
  const sess = plan.sessions.find(s=>s.id===sessionId); if(!sess) return;
  sess.completed = !sess.completed; saveState(); renderTimetable(plan); renderDashboard(); renderProgress(); renderPlans();
};
function updateCompletion(plan){
  const total = plan.sessions.length; const done = plan.sessions.filter(s=>s.completed).length;
  const perc = total?Math.round(done/total*100):0;
  document.getElementById('completionPercent').textContent = perc+'%';
  document.getElementById('progressFill').style.width = perc+'%';
  document.getElementById('completionText').textContent = `${done}/${total} sessions completed`;
}
function renderPlans(){
  const list = document.getElementById('plansList');
  if(state.plans.length===0){ list.innerHTML='<div class="empty">No previous plans. Generate one!</div>'; return; }
  list.innerHTML = state.plans.map(p=>{
    const done = p.sessions.filter(s=>s.completed).length;
    const perc = p.sessions.length?Math.round(done/p.sessions.length*100):0;
    return `<div class="list-item">
      <div><b>${escapeHtml(p.name)}</b><br><small class="muted">${fmtDate(p.createdAt)} • ${p.sessions.length} sessions • ${perc}% done ${state.currentPlanId===p.id?'(Current)':''}</small></div>
      <div class="action-row">
        <button class="btn" onclick="openPlan('${p.id}')">Open</button>
        <button class="btn" onclick="renamePlan('${p.id}')">Rename</button>
        <button class="btn" onclick="duplicatePlan('${p.id}')">Duplicate</button>
        <button class="btn danger" onclick="deletePlan('${p.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}
window.openPlan = (id)=>{
  const plan = state.plans.find(p=>p.id===id); if(!plan) return;
  state.currentPlanId = id; saveState(); renderTimetable(plan); renderDashboard(); renderPlans();
  document.querySelector('[data-target="timetable"]').click();
};
window.renamePlan = (id)=>{
  const plan = state.plans.find(p=>p.id===id); if(!plan) return;
  const name = prompt('New plan name', plan.name); if(!name) return;
  plan.name = name.trim(); saveState(); renderPlans();
};
window.duplicatePlan = (id)=>{
  const plan = state.plans.find(p=>p.id===id); if(!plan) return;
  const copy = structuredClone(plan); copy.id = uid(); copy.name = plan.name + ' (Copy)'; copy.createdAt = new Date().toISOString();
  state.plans.unshift(copy); saveState(); renderPlans();
};
window.deletePlan = (id)=>{
  if(!confirm('Delete this plan permanently?')) return;
  state.plans = state.plans.filter(p=>p.id!==id);
  if(state.currentPlanId===id) state.currentPlanId = state.plans[0]?.id || null;
  saveState(); renderPlans(); renderDashboard();
  if(state.currentPlanId){ renderTimetable(state.plans.find(p=>p.id===state.currentPlanId)); } else { document.getElementById('timetableList').innerHTML=''; document.getElementById('timetableEmpty').classList.remove('hidden'); }
};
document.getElementById('newPlanBtn').onclick = ()=>{
  if(!confirm('Start a new blank plan? Current data stays in Previous Plans.')) return;
  state.currentPlanId = null; saveState(); document.getElementById('timetableList').innerHTML=''; document.getElementById('timetableEmpty').classList.remove('hidden'); document.getElementById('timetableWarning').className='alert hidden'; renderDashboard();
};
function renderDashboard(){
  const totalTopics = state.subjects.reduce((a,s)=>a+s.topics.length,0);
  const curPlan = state.plans.find(p=>p.id===state.currentPlanId) || state.plans[0];
  const done = curPlan ? curPlan.sessions.filter(s=>s.completed).length : 0;
  const pending = curPlan ? curPlan.sessions.length - done : 0;
  document.getElementById('statTotalTopics').textContent = totalTopics;
  document.getElementById('statCompleted').textContent = done;
  document.getElementById('statPending').textContent = pending;
  if(curPlan) updateCompletion(curPlan);
  else { document.getElementById('completionPercent').textContent='0%'; document.getElementById('progressFill').style.width='0%'; document.getElementById('completionText').textContent='No plan generated yet'; }
  const recent = document.getElementById('recentSummaries');
  if(state.summaries.length===0) recent.innerHTML='<div class="empty">No summaries yet</div>';
  else recent.innerHTML = state.summaries.slice(0,3).map(s=>`<div style="padding:8px 0;border-bottom:1px solid #eee"><b>${escapeHtml(s.title)}</b></div>`).join('');
  renderProgress();
}
function renderProgress(){
  const plan = state.plans.find(p=>p.id===state.currentPlanId) || state.plans[0];
  const total = plan?plan.sessions.length:0; const done = plan?plan.sessions.filter(s=>s.completed).length:0;
  document.getElementById('pTotal').textContent = total; document.getElementById('pDone').textContent = done;
  document.getElementById('pPerc').textContent = total?Math.round(done/total*100)+'%':'0%';
  const subProg = document.getElementById('subjectProgress');
  if(!plan){ subProg.innerHTML='<div class="empty">No plan</div>'; return; }
  const map = {};
  plan.sessions.forEach(s=>{ if(!map[s.subject]) map[s.subject]={total:0,done:0}; map[s.subject].total++; if(s.completed) map[s.subject].done++; });
  subProg.innerHTML = Object.entries(map).map(([sub,v])=>`<div class="list-item"><span>${escapeHtml(sub)}</span><span>${v.done}/${v.total} (${Math.round(v.done/v.total*100)}%)</span></div>`).join('');
}
function init(){
  renderPrefs(); renderSubjects(); renderSummaries(); renderPlans();
  if(state.currentPlanId){ const p = state.plans.find(x=>x.id===state.currentPlanId); if(p) renderTimetable(p); }
  renderDashboard(); renderProgress();
  if(!Array.isArray(state.subjects)) state.subjects=[];
}
init();