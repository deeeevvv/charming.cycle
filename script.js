(function ensureUiContainers(){
  // Toast
  if(!document.getElementById('toast')){
    const t = document.createElement('div');
    t.id = 'toast';
    t.style.position = 'fixed';
    t.style.bottom = '26px';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%) translateY(0)';
    t.style.background = 'var(--card)';
    t.style.color = 'var(--accent)';
    t.style.padding = '12px 16px';
    t.style.borderRadius = '10px';
    t.style.boxShadow = '0 8px 30px rgba(0,0,0,0.18)';
    t.style.opacity = '0';
    t.style.pointerEvents = 'none';
    t.style.transition = 'opacity .32s ease, transform .32s ease';
    t.style.zIndex = '9999';
    document.body.appendChild(t);
  }

  // Modal overlay
  if(!document.getElementById('modal')){
    const overlay = document.createElement('div');
    overlay.id = 'modal';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.backdropFilter = 'blur(3px)';
    overlay.style.display = 'none';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';

    const box = document.createElement('div');
    box.id = 'modalBox';
    box.style.background = 'var(--card)';
    box.style.padding = '18px';
    box.style.borderRadius = '12px';
    box.style.width = '320px';
    box.style.boxShadow = '0 10px 40px rgba(0,0,0,0.25)';
    box.style.color = 'var(--muted)';

    const msg = document.createElement('div');
    msg.id = 'modalMessage';
    msg.style.fontWeight = '600';
    msg.style.marginBottom = '14px';
    msg.style.color = 'var(--muted)';

    const btnWrap = document.createElement('div');
    btnWrap.style.display = 'flex';
    btnWrap.style.justifyContent = 'flex-end';
    btnWrap.style.gap = '10px';

    const cancel = document.createElement('button');
    cancel.id = 'modalCancel';
    cancel.className = 'btn secondary';
    cancel.textContent = 'Cancel';

    const confirm = document.createElement('button');
    confirm.id = 'modalConfirm';
    confirm.className = 'btn';
    confirm.textContent = 'Confirm';

    btnWrap.appendChild(cancel);
    btnWrap.appendChild(confirm);
    box.appendChild(msg);
    box.appendChild(btnWrap);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
})();

function qs(id){ return document.getElementById(id); }

/* Toast */
function showToast(msg, timeout = 2200){
  const t = qs('toast');
  if(!t) return; // safety
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(-6px)';
  // clear any previous timer stored
  if(t._timer) clearTimeout(t._timer);
  t._timer = setTimeout(()=>{
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(0)';
    t._timer = null;
  }, timeout);
}

/* Modal (returns Promise<boolean>) */
function showModal(message){
  return new Promise(resolve=>{
    const overlay = qs('modal');
    const msgBox = qs('modalMessage');
    const btnCancel = qs('modalCancel');
    const btnConfirm = qs('modalConfirm');
    if(!overlay || !msgBox || !btnCancel || !btnConfirm){
      // fallback to window.confirm if UI missing
      resolve(window.confirm(message));
      return;
    }

    msgBox.textContent = message;
    overlay.style.display = 'flex';

    // one-time handlers
    function onCancel(){
      cleanup();
      resolve(false);
    }
    function onConfirm(){
      cleanup();
      resolve(true);
    }
    function onOverlayClick(e){
      if(e.target === overlay){
        // clicking background cancels
        cleanup();
        resolve(false);
      }
    }
    function cleanup(){
      btnCancel.removeEventListener('click', onCancel);
      btnConfirm.removeEventListener('click', onConfirm);
      overlay.removeEventListener('click', onOverlayClick);
      overlay.style.display = 'none';
    }

    btnCancel.addEventListener('click', onCancel);
    btnConfirm.addEventListener('click', onConfirm);
    overlay.addEventListener('click', onOverlayClick);
  });
}
/* --- keys & helpers --- */
const STORAGE_KEY = 'charm_history_v2';
const SETTINGS_KEY = 'charm_settings_v2';
const LAST_DATE_KEY = 'charm_last_date_v2';

function fmtDateIsoToFriendly(isoOrYMD){
  const d = new Date(isoOrYMD);
  if (isNaN(d)) return isoOrYMD;
  return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
}
function stripTime(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/* --- load saved settings (theme, inputs, last date) --- */
(function initSettings(){
  try{
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if(s.theme) document.body.setAttribute('data-theme', s.theme);
    if(s.lastDate) qs('lastPeriod').value = s.lastDate;
    if(s.cycle) qs('cycleLength').value = s.cycle;
    // set period length default to 6 (diagram) if none saved
    if(s.periodLen) qs('periodLength').value = s.periodLen;
    else qs('periodLength').value = 6;

    // ensure aria/state for theme toggle if function exists
    if(typeof updateThemeToggleAria === 'function') updateThemeToggleAria();
  }catch(e){
    console.warn('Could not load settings', e);
  }
})();

/* --- phase detection (fixed ranges) ---
   Menstruation: days 1-6
   Follicular:   days 7-13
   Ovulation:    day 14
   Luteal:       days 15-28
   >28:          Post-luteal / Late cycle
*/
function getPhaseFixed(daysSince){
  if(daysSince <= 0) return 'Cycle has Not started yet';
  if(daysSince >= 1 && daysSince <= 6) return 'Menstrual Phase (days 1–6)';
  if(daysSince >= 7 && daysSince <= 13) return 'Proliferative or Follicular Phase (days 7–13)';
  if(daysSince === 14) return 'Ovulatory Phase (day 14)';
  if(daysSince >= 15 && daysSince <= 28) return 'Secretory or Luteal Phase (days 15–28)';
  if(daysSince > 28 && daysSince<=34) return 'Post-luteal / Late cycle Phase (day >28)';
  if(daysSince>34) return 'Your Menstrual cycle might have Ended';

  return '';
}

/* --- calculator --- */
function calculateCycle(show=true){
  const lastVal = qs('lastPeriod').value;
  if(!lastVal){
    if(show) showToast('Select your last period start date.');
    return null;
  }
  const last = new Date(lastVal);
  const today = stripTime(new Date());
  const cycle = parseInt(qs('cycleLength').value,10) || 28;
  const periodLenInput = parseInt(qs('periodLength').value,10) || 6;

  const daysSince = Math.floor((today - stripTime(last)) / (1000*60*60*24));
  const next = new Date(last);
  next.setDate(last.getDate() + cycle);

  // compute ovulation and fertile window for display (approx)
  const ovulation = new Date(last); ovulation.setDate(last.getDate() + 14); 
  const fertileStart = new Date(ovulation); fertileStart.setDate(ovulation.getDate() - 4);
  const fertileEnd = new Date(ovulation); fertileEnd.setDate(ovulation.getDate() + 2);

  const progressPct = Math.min(100, Math.max(0, Math.round((daysSince / cycle) * 100)));
  const phaseText = getPhaseFixed(daysSince);

  // show UI
  const resultEl = qs('result');
  if(resultEl){
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div style="font-weight:700;color:var(--accent)">${fmtDateIsoToFriendly(lastVal)} → ${fmtDateIsoToFriendly(next.toISOString())}</div>
      <div class="small" style="margin-top:8px">Days since last period: <strong>${daysSince}</strong></div>
      <div class="small" style="margin-top:6px">Estimated next period: <strong>${fmtDateIsoToFriendly(next.toISOString())}</strong></div>
      <div class="small" style="margin-top:6px">Fertile window (estimate): <strong>${fmtDateIsoToFriendly(fertileStart.toISOString())}</strong> — <strong>${fmtDateIsoToFriendly(fertileEnd.toISOString())}</strong></div>
      <div class="small" style="margin-top:6px">Period length: <strong>1–6 days</strong></div>
      <div style="margin-top:10px;font-weight:700;color:var(--accent)">Current Probable Status: ${phaseText}</div>
    `;
  }

  // update progress bar
  const pb = qs('progressBar');
  if(pb) pb.style.width = progressPct + '%';

  // persist last-selected date
  localStorage.setItem(LAST_DATE_KEY, lastVal);

  return {
    last: lastVal,
    next: next.toISOString(),
    cycle,
    periodLen: periodLenInput,
    daysSince,
    progressPct,
    phase: phaseText
  };
}

/* --- save settings helper --- */
function saveSettings(){
  const payload = {
    theme: document.body.getAttribute('data-theme') || 'light',
    lastDate: qs('lastPeriod').value || '',
    cycle: qs('cycleLength').value,
    periodLen: qs('periodLength').value
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
}

/* --- history management --- */
function loadHistory(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveHistory(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); renderHistory(); }

function renderHistory(){
  const list = qs('historyList');
  list.innerHTML = '';
  const arr = loadHistory();
  if(!arr || arr.length === 0){
    list.innerHTML = '<div class="small">No history yet. Save a cycle after it finishes.</div>';
    return;
  }

  arr.forEach((e,i) => {
    const div = document.createElement('div');
    div.style = 'padding:10px;border:0.05px solid #908f8fff;border-radius:10px;background:var(--glass);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center';

    const left = document.createElement('div');
    left.innerHTML = `
      <div style="font-weight:700">${fmtDateIsoToFriendly(e.start)}</div>
      <div style="font-size:11px;color:var(--muted)">Cycle: ${e.cycle}d • Period: ${e.periodLen || 'n/a'}d</div>
      <div style="font-size:7px;color:var(--accent);font-weight:600">${e.phase || ''}</div>
    `;

    const right = document.createElement('div');
    right.style = 'display:flex;gap:8px;align-items:center';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editEntry(i));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      const ok = await showModal('Delete this entry?');
      if(!ok) return;
      deleteEntry(i);
      showToast('Entry deleted.');
    });

    right.appendChild(editBtn);
    right.appendChild(deleteBtn);

    div.appendChild(left);
    div.appendChild(right);
    list.appendChild(div);
  });
}

function addToHistory(entry){
  const arr = loadHistory();
  arr.unshift(entry);
  if(arr.length > 50) arr.pop();
  saveHistory(arr);
}

function editEntry(index){
  const arr = loadHistory();
  const e = arr[index];
  if(!e) return;
  // load into inputs
  qs('lastPeriod').value = e.start;
  qs('cycleLength').value = e.cycle;
  if(e.periodLen) qs('periodLength').value = e.periodLen;
  calculateCycle(false);
  saveSettings();
  const btn = qs('saveBtn');
  if(btn){
    btn.textContent = 'Loaded';
    setTimeout(()=> btn.textContent = 'Save to History', 900);
  }
}

function deleteEntry(index){
  const arr = loadHistory();
  arr.splice(index,1);
  saveHistory(arr);
}

/* --- UI wiring --- */
(function wireUi(){
  const saveBtn = qs('saveBtn');
  if(saveBtn) saveBtn.addEventListener('click', ()=>{
    const data = calculateCycle(true);
    if(!data) return showToast('Cannot save, fill details.');
    const entry = {
      start: data.last,
      cycle: data.cycle,
      periodLen: data.periodLen,
      phase: data.phase,
      created: new Date().toISOString()
    };
    addToHistory(entry);
    saveSettings();
    showToast('Saved to history.');
  });

  const clearBtn = qs('clearHistory');
  if(clearBtn) clearBtn.addEventListener('click', async ()=>{
    const ok = await showModal('Clear all history?');
    if(!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast('History cleared.');
  });

  const resetBtn = qs('resetBtn');
  if(resetBtn) resetBtn.addEventListener('click', async ()=>{
    const ok = await showModal('Reset the displayed date and clear result?');
    if(!ok) return;
    qs('lastPeriod').value = '';
    qs('result').style.display = 'none';
    const pb = qs('progressBar');
    if(pb) pb.style.width = '0%';
    saveSettings();
    showToast('Reset done.');
  });

  const calcBtn = qs('calcBtn');
  if(calcBtn) calcBtn.addEventListener('click', ()=>{
    const d = calculateCycle(true);
    if(d) saveSettings();
  });

  const themeBtn = qs('themeToggle');
  if(themeBtn) themeBtn.addEventListener('click', ()=>{
    const cur = document.body.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    s.theme = next;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    if(typeof updateThemeToggleAria === 'function') updateThemeToggleAria();
    showToast(next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
  });

  // auto-save date change
  const lastPeriodInput = qs('lastPeriod');
  if(lastPeriodInput) lastPeriodInput.addEventListener('change', ()=>{
    const v = qs('lastPeriod').value || '';
    localStorage.setItem(LAST_DATE_KEY, v);
    saveSettings();
    calculateCycle(false);
  });
})();

/* --- auto-run on load --- */
renderHistory();

// restore last saved date from settings or last-date key
(function autoRestore(){
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const lastSaved = (s && s.lastDate) ? s.lastDate : (localStorage.getItem(LAST_DATE_KEY) || '');
  if(lastSaved){
    qs('lastPeriod').value = lastSaved;
    calculateCycle(false);
  }
})();
