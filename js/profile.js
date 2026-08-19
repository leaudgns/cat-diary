/* Shared logic for cat1.html / cat2.html — expects window.CAT_KEY, window.OTHER_CAT_PAGE set beforehand */
const CAT = window.CAT_KEY;
const OTHER_PAGE = window.OTHER_CAT_PAGE;

let settings = null;
let profile = null;

function escapeHTML(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function todayStr() { return DB.todayStr(); }

function daysBetween(dateStr) {
  if (!dateStr) return null;
  const start = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diff = Math.floor((now - start) / 86400000);
  return diff;
}
function ageFromBirthday(dateStr) {
  if (!dateStr) return null;
  const b = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return { years, months };
}

/* ---------- Hero ---------- */
function renderHero() {
  const name = CAT === 'cat1' ? settings.cat1_name : settings.cat2_name;
  const avatarUrl = (CAT === 'cat1' ? settings.cat1_avatar_url : settings.cat2_avatar_url);
  document.getElementById('profileName').textContent = name;
  document.getElementById('pageTitle').textContent = `${name} · 냥이 프로필`;
  document.getElementById('profileAvatar').src = avatarUrl || 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23eee2d0"/></svg>');
  const otherName = CAT === 'cat1' ? settings.cat2_name : settings.cat1_name;
  document.getElementById('otherCatLink').textContent = `${otherName} 프로필 보기 →`;
  document.getElementById('otherCatLink').href = OTHER_PAGE;

  const since = daysBetween(profile.arrival_date);
  document.getElementById('profileSince').textContent = since !== null
    ? `함께한 지 ${since.toLocaleString()}일째 (${profile.arrival_date}부터)`
    : '집에 온 날짜가 아직 없어요';
}

/* ---------- Info card ---------- */
const GENDER_LABEL = { male: '수컷', female: '암컷', unknown: '모름' };
function renderInfoDisplay() {
  const age = ageFromBirthday(profile.birthday);
  const fields = [
    ['집에 온 날', profile.arrival_date || null],
    ['생일', profile.birthday ? `${profile.birthday}${age ? ` (${age.years}살 ${age.months}개월)` : ''}` : null],
    ['품종', profile.breed || null],
    ['성별', profile.gender ? GENDER_LABEL[profile.gender] || profile.gender : null],
    ['중성화', profile.neutered === true ? '완료' : profile.neutered === false ? '안 함' : null],
    ['마이크로칩', profile.microchip || null],
    ['성격/특징', profile.personality || null],
    ['기타 메모', profile.notes || null],
  ];
  const grid = document.getElementById('infoGrid');
  grid.innerHTML = fields.map(([label, val]) => `
    <div class="info-field">
      <label>${label}</label>
      <div class="info-value ${val ? '' : 'empty'}">${val ? escapeHTML(val) : '아직 입력 안 함'}</div>
    </div>
  `).join('');
}
function renderInfoForm() {
  const grid = document.getElementById('infoGrid');
  grid.innerHTML = `
    <div class="info-field"><label>집에 온 날</label><input type="date" id="fArrival" value="${profile.arrival_date || ''}"></div>
    <div class="info-field"><label>생일</label><input type="date" id="fBirthday" value="${profile.birthday || ''}"></div>
    <div class="info-field"><label>품종</label><input type="text" id="fBreed" value="${profile.breed ? escapeHTML(profile.breed) : ''}" placeholder="예: 삼색이, 코리안숏헤어"></div>
    <div class="info-field"><label>성별</label>
      <select id="fGender">
        <option value="" ${!profile.gender ? 'selected' : ''}>선택 안 함</option>
        <option value="male" ${profile.gender === 'male' ? 'selected' : ''}>수컷</option>
        <option value="female" ${profile.gender === 'female' ? 'selected' : ''}>암컷</option>
      </select>
    </div>
    <div class="info-field"><label>중성화</label>
      <select id="fNeutered">
        <option value="" ${profile.neutered === null || profile.neutered === undefined ? 'selected' : ''}>선택 안 함</option>
        <option value="true" ${profile.neutered === true ? 'selected' : ''}>완료</option>
        <option value="false" ${profile.neutered === false ? 'selected' : ''}>안 함</option>
      </select>
    </div>
    <div class="info-field"><label>마이크로칩 번호</label><input type="text" id="fMicrochip" value="${profile.microchip ? escapeHTML(profile.microchip) : ''}"></div>
    <div class="info-field" style="grid-column: 1 / -1;"><label>성격/특징</label><textarea id="fPersonality" rows="2">${profile.personality ? escapeHTML(profile.personality) : ''}</textarea></div>
    <div class="info-field" style="grid-column: 1 / -1;"><label>기타 메모</label><textarea id="fNotes" rows="2">${profile.notes ? escapeHTML(profile.notes) : ''}</textarea></div>
    <div class="info-save-row"><button id="infoSaveBtn" class="btn-primary">저장</button></div>
  `;
  document.getElementById('infoSaveBtn').addEventListener('click', async () => {
    const neuteredVal = document.getElementById('fNeutered').value;
    const patch = {
      arrival_date: document.getElementById('fArrival').value || null,
      birthday: document.getElementById('fBirthday').value || null,
      breed: document.getElementById('fBreed').value.trim() || null,
      gender: document.getElementById('fGender').value || null,
      neutered: neuteredVal === '' ? null : neuteredVal === 'true',
      microchip: document.getElementById('fMicrochip').value.trim() || null,
      personality: document.getElementById('fPersonality').value.trim() || null,
      notes: document.getElementById('fNotes').value.trim() || null,
    };
    await DB.updateCatProfile(CAT, patch);
    Object.assign(profile, patch);
    renderHero();
    renderInfoDisplay();
    document.getElementById('infoEditBtn').textContent = '✎ 수정';
    editMode = false;
  });
}
let editMode = false;
document.getElementById('infoEditBtn').addEventListener('click', () => {
  editMode = !editMode;
  document.getElementById('infoEditBtn').textContent = editMode ? '취소' : '✎ 수정';
  if (editMode) renderInfoForm(); else renderInfoDisplay();
});

/* ---------- Weight ---------- */
async function loadWeights() { return DB.listWeights(CAT); }

function renderWeightChart(entries) {
  const wrap = document.getElementById('weightChartWrap');
  if (!entries.length) { wrap.innerHTML = '<div class="weight-empty">아직 기록이 없어요. 아래에서 몸무게를 추가해보세요</div>'; return; }
  if (entries.length === 1) {
    wrap.innerHTML = `<div class="weight-empty">${entries[0].measured_date} · ${entries[0].weight_kg}kg (1개 기록됨 — 하나 더 추가하면 그래프가 나와요)</div>`;
    return;
  }
  const W = 640, H = 200, padL = 42, padR = 16, padT = 16, padB = 28;
  const weights = entries.map(e => Number(e.weight_kg));
  const min = Math.min(...weights), max = Math.max(...weights);
  const range = (max - min) || 1;
  const yFor = (w) => padT + (1 - (w - min + range * 0.15) / (range * 1.3)) * (H - padT - padB);
  const xFor = (i) => padL + (i / (entries.length - 1)) * (W - padL - padR);

  const points = entries.map((e, i) => `${xFor(i)},${yFor(Number(e.weight_kg))}`).join(' ');
  const dots = entries.map((e, i) => {
    const x = xFor(i), y = yFor(Number(e.weight_kg));
    const isLast = i === entries.length - 1;
    return `<circle cx="${x}" cy="${y}" r="${isLast ? 5 : 3.5}" fill="${isLast ? 'var(--tortie-dark)' : 'var(--tortie)'}"><title>${e.measured_date}: ${e.weight_kg}kg</title></circle>`;
  }).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="var(--border)" />
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="var(--border)" />
      <text x="4" y="${yFor(max) + 4}" font-size="11" fill="var(--ink-soft)">${max}kg</text>
      <text x="4" y="${yFor(min) + 4}" font-size="11" fill="var(--ink-soft)">${min}kg</text>
      <text x="${padL}" y="${H - 8}" font-size="10" fill="var(--ink-soft)">${entries[0].measured_date}</text>
      <text x="${W - padR}" y="${H - 8}" font-size="10" fill="var(--ink-soft)" text-anchor="end">${entries[entries.length - 1].measured_date}</text>
      <polyline points="${points}" fill="none" stroke="var(--tortie)" stroke-width="2.5" />
      ${dots}
    </svg>
  `;
}

async function renderWeightSection() {
  const entries = await loadWeights();
  renderWeightChart(entries);
  const list = document.getElementById('weightList');
  list.innerHTML = '';
  entries.slice().reverse().slice(0, 8).forEach(e => {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-main"><b>${e.weight_kg}kg</b> <span class="log-date">${e.measured_date}</span>${e.memo ? ` · ${escapeHTML(e.memo)}` : ''}</div><button class="log-del">삭제</button>`;
    div.querySelector('.log-del').addEventListener('click', async () => {
      await DB.deleteWeight(e.id);
      renderWeightSection();
    });
    list.appendChild(div);
  });
}
document.getElementById('weightForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const kg = parseFloat(document.getElementById('weightKg').value);
  if (!kg) return;
  await DB.addWeight({
    cat: CAT, weight_kg: kg,
    measured_date: document.getElementById('weightDate').value || todayStr(),
    memo: document.getElementById('weightMemo').value.trim(),
  });
  document.getElementById('weightForm').reset();
  document.getElementById('weightDate').value = todayStr();
  renderWeightSection();
});
document.getElementById('weightDate').value = todayStr();

/* ---------- Play / toy log ---------- */
function renderToyStatus(entries) {
  const el = document.getElementById('toyStatus');
  if (!entries.length) {
    el.className = 'toy-status toy-green';
    el.innerHTML = `<span class="toy-emoji">🧸</span><div class="toy-text"><strong>아직 놀이 기록이 없어요</strong><span>아래에서 장난감 기록을 시작해보세요</span></div>`;
    return;
  }
  const latestToy = entries[0].toy_name;
  let streak = 0;
  for (const e of entries) { if (e.toy_name === latestToy) streak++; else break; }
  const daysSince = daysBetween(entries[entries.length - 1] ? entries.find(e => e.toy_name !== latestToy)?.played_date || entries[0].played_date : entries[0].played_date);

  let level = 'green', emoji = '🧸', title = '새 장난감 사용 중!', sub = `"${latestToy}" 방금 시작했어요`;
  if (streak >= 5) {
    level = 'red'; emoji = '🚨'; title = '장난감 바꿔줄 때예요!'; sub = `"${latestToy}" 연속 ${streak}번째 사용 중이에요`;
  } else if (streak >= 3) {
    level = 'yellow'; emoji = '⚠️'; title = '슬슬 바꿔볼까요?'; sub = `"${latestToy}" 연속 ${streak}번째 사용 중이에요`;
  } else {
    sub = `"${latestToy}" ${streak}번째 사용 중이에요`;
  }
  el.className = `toy-status toy-${level}`;
  el.innerHTML = `<span class="toy-emoji">${emoji}</span><div class="toy-text"><strong>${title}</strong><span>${escapeHTML(sub)}</span></div>`;
}

async function renderPlaySection() {
  const entries = await DB.listPlays(CAT);
  renderToyStatus(entries);
  const list = document.getElementById('playList');
  list.innerHTML = '';
  if (!entries.length) { list.innerHTML = '<div class="weight-empty">기록이 없어요</div>'; return; }
  entries.slice(0, 10).forEach(e => {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-main"><b>${escapeHTML(e.toy_name)}</b> <span class="log-date">${e.played_date}</span>${e.memo ? ` · ${escapeHTML(e.memo)}` : ''}</div><button class="log-del">삭제</button>`;
    div.querySelector('.log-del').addEventListener('click', async () => {
      await DB.deletePlay(e.id);
      renderPlaySection();
    });
    list.appendChild(div);
  });
}
document.getElementById('playForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const toy = document.getElementById('toyName').value.trim();
  if (!toy) return;
  await DB.addPlay({
    cat: CAT, toy_name: toy,
    played_date: document.getElementById('playDate').value || todayStr(),
    memo: document.getElementById('playMemo').value.trim(),
  });
  document.getElementById('playForm').reset();
  document.getElementById('playDate').value = todayStr();
  renderPlaySection();
});
document.getElementById('playDate').value = todayStr();

/* ---------- Grooming (bath / nail trim) ---------- */
const GROOMING_RULES = {
  bath: { label: '목욕', emoji: '🛁', yellow: 30, red: 45 },
  nail: { label: '발톱 관리', emoji: '💅', yellow: 14, red: 21 },
};
function renderGroomingStatus(type, entries) {
  const rule = GROOMING_RULES[type];
  const el = document.getElementById(`groomStatus_${type}`);
  if (!entries.length) {
    el.className = 'toy-status toy-yellow';
    el.innerHTML = `<span class="toy-emoji">${rule.emoji}</span><div class="toy-text"><strong>${rule.label} 기록이 없어요</strong><span>아래 버튼으로 기록을 시작해보세요</span></div>`;
    return;
  }
  const days = daysBetween(entries[0].done_date);
  let level = 'green';
  if (days >= rule.red) level = 'red';
  else if (days >= rule.yellow) level = 'yellow';
  const title = level === 'red' ? `${rule.label} 할 때예요!` : level === 'yellow' ? `슬슬 ${rule.label}할 때예요` : `${rule.label} 잘 관리되고 있어요`;
  el.className = `toy-status toy-${level}`;
  el.innerHTML = `<span class="toy-emoji">${rule.emoji}</span><div class="toy-text"><strong>${title}</strong><span>${rule.label}한 지 ${days}일째 (${entries[0].done_date})</span></div>`;
}
async function renderGroomingSection() {
  const all = await DB.listGrooming(CAT);
  for (const type of ['bath', 'nail']) {
    const entries = all.filter(e => e.type === type);
    renderGroomingStatus(type, entries);
    const list = document.getElementById(`groomList_${type}`);
    list.innerHTML = '';
    entries.slice(0, 5).forEach(e => {
      const div = document.createElement('div');
      div.className = 'log-item';
      div.innerHTML = `<div class="log-main"><span class="log-date">${e.done_date}</span>${e.memo ? ` · ${escapeHTML(e.memo)}` : ''}</div><button class="log-del">삭제</button>`;
      div.querySelector('.log-del').addEventListener('click', async () => {
        await DB.deleteGrooming(e.id);
        renderGroomingSection();
      });
      list.appendChild(div);
    });
  }
}
function wireGroomingQuickLog(type) {
  document.getElementById(`groomQuickBtn_${type}`).addEventListener('click', async () => {
    await DB.addGrooming({ cat: CAT, type, done_date: todayStr(), memo: '' });
    renderGroomingSection();
  });
  document.getElementById(`groomForm_${type}`).addEventListener('submit', async (e) => {
    e.preventDefault();
    await DB.addGrooming({
      cat: CAT, type,
      done_date: document.getElementById(`groomDate_${type}`).value || todayStr(),
      memo: document.getElementById(`groomMemo_${type}`).value.trim(),
    });
    document.getElementById(`groomForm_${type}`).reset();
    document.getElementById(`groomDate_${type}`).value = todayStr();
    renderGroomingSection();
  });
  document.getElementById(`groomDate_${type}`).value = todayStr();
}
wireGroomingQuickLog('bath');
wireGroomingQuickLog('nail');

/* ---------- Init ---------- */
(async function init() {
  [settings, profile] = await Promise.all([DB.getSettings(), DB.getCatProfile(CAT)]);
  renderHero();
  renderInfoDisplay();
  await renderWeightSection();
  await renderPlaySection();
  await renderGroomingSection();
})();
