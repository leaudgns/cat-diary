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

/* ---------- Water / calorie calculator ---------- */
function calcAndRenderCalorie() {
  const kg = parseFloat(document.getElementById('calcWeight').value);
  const factor = parseFloat(document.getElementById('calcActivity').value);
  const result = document.getElementById('calcResult');
  if (!kg || kg <= 0) { result.innerHTML = '<div class="weight-empty">몸무게를 입력해주세요</div>'; return; }
  const rer = 70 * Math.pow(kg, 0.75);
  const der = rer * factor;
  const waterMin = Math.round(kg * 40);
  const waterMax = Math.round(kg * 50);
  result.innerHTML = `
    <div class="calc-tile"><div class="calc-label">기초대사량 (RER)</div><div class="calc-value">${Math.round(rer)}</div><div class="calc-unit">kcal/일</div></div>
    <div class="calc-tile"><div class="calc-label">일일 권장 칼로리 (DER)</div><div class="calc-value">${Math.round(der)}</div><div class="calc-unit">kcal/일</div></div>
    <div class="calc-tile"><div class="calc-label">권장 음수량</div><div class="calc-value">${waterMin}~${waterMax}</div><div class="calc-unit">ml/일</div></div>
  `;
}
async function initCalculator() {
  const weights = await DB.listWeights(CAT);
  const note = document.getElementById('calcWeightNote');
  if (weights.length) {
    const latest = weights[weights.length - 1];
    document.getElementById('calcWeight').value = latest.weight_kg;
    note.textContent = `최근 몸무게 ${latest.weight_kg}kg (${latest.measured_date}) 기준으로 채워놨어요 — 필요하면 직접 수정하세요`;
    calcAndRenderCalorie();
  } else {
    note.textContent = '몸무게 기록이 없어요 — 직접 입력해주세요';
  }
}
document.getElementById('calcBtn').addEventListener('click', calcAndRenderCalorie);

/* ---------- Litter log (potty tracking) ---------- */
const PEE_CONDITIONS = { normal: '정상', blood: '혈뇨', little: '양 적음', lots: '양 많음' };
const POOP_CONDITIONS = { normal: '정상', soft: '무름', diarrhea: '설사', constipation: '변비', blood: '혈변' };
const LITTER_BAD = ['blood', 'diarrhea'];
const LITTER_WARN = ['soft', 'constipation', 'little', 'lots'];

function isToday(isoString) { return isoString.slice(0, 10) === todayStr(); }
function litterTimeLabel(iso) { return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); }

function renderLitterStatus(entries) {
  const el = document.getElementById('litterStatus');
  const todays = entries.filter(e => isToday(e.logged_at));
  if (!todays.length) {
    el.className = 'toy-status toy-green';
    el.innerHTML = `<span class="toy-emoji">🚻</span><div class="toy-text"><strong>오늘 기록이 아직 없어요</strong><span>버튼을 눌러 기록해보세요</span></div>`;
    return;
  }
  const hasBad = todays.some(e => LITTER_BAD.includes(e.condition));
  const hasWarn = todays.some(e => LITTER_WARN.includes(e.condition));
  let level = 'green', emoji = '🚻', title = '오늘 화장실 상태 좋아요';
  if (hasBad) { level = 'red'; emoji = '🚨'; title = '오늘 이상 징후가 있어요'; }
  else if (hasWarn) { level = 'yellow'; emoji = '⚠️'; title = '관찰이 필요해요'; }
  const peeCount = todays.filter(e => e.type === 'pee').length;
  const poopCount = todays.filter(e => e.type === 'poop').length;
  el.className = `toy-status toy-${level}`;
  el.innerHTML = `<span class="toy-emoji">${emoji}</span><div class="toy-text"><strong>${title}</strong><span>오늘 감자 ${peeCount}번 · 맛동산 ${poopCount}번</span></div>`;
}

async function renderLitterSection() {
  const entries = await DB.listLitter(CAT);
  renderLitterStatus(entries);
  const todays = entries.filter(e => isToday(e.logged_at));
  document.getElementById('litterCountPee').textContent = todays.filter(e => e.type === 'pee').length;
  document.getElementById('litterCountPoop').textContent = todays.filter(e => e.type === 'poop').length;

  const list = document.getElementById('litterList');
  list.innerHTML = '';
  entries.slice(0, 15).forEach(e => {
    const div = document.createElement('div');
    div.className = 'log-item litter-item';
    const conditions = e.type === 'pee' ? PEE_CONDITIONS : POOP_CONDITIONS;
    const tagClass = LITTER_BAD.includes(e.condition) ? 'tag-bad' : LITTER_WARN.includes(e.condition) ? 'tag-warn' : '';
    div.innerHTML = `
      <div class="litter-row">
        <span>${e.type === 'pee' ? '🥔' : '🍫'}</span>
        <span class="litter-time">${litterTimeLabel(e.logged_at)}</span>
        ${e.condition !== 'normal' ? `<span class="litter-tag ${tagClass}">${conditions[e.condition] || e.condition}</span>` : ''}
        ${e.photo_url ? `<img class="litter-photo-thumb" src="${e.photo_url}" alt="">` : ''}
        ${e.memo ? `<span style="font-size:0.78rem;color:var(--ink-soft)">${escapeHTML(e.memo)}</span>` : ''}
        <button class="litter-detail-btn" type="button">상세</button>
        <button class="log-del" type="button">삭제</button>
      </div>
      <div class="litter-detail-panel" style="display:none;">
        <select class="litter-cond-select">
          ${Object.entries(conditions).map(([v, l]) => `<option value="${v}" ${e.condition === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <input type="text" class="litter-memo-input" placeholder="메모" value="${e.memo ? escapeHTML(e.memo) : ''}">
        <label class="upload-btn" style="font-size:0.75rem;padding:6px 12px;">
          사진 첨부
          <input type="file" accept="image/*" hidden class="litter-photo-input">
        </label>
        <button type="button" class="litter-save-btn">저장</button>
      </div>
    `;
    div.querySelector('.litter-detail-btn').addEventListener('click', () => {
      const panel = div.querySelector('.litter-detail-panel');
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });
    div.querySelector('.log-del').addEventListener('click', async () => {
      await DB.deleteLitter(e.id);
      renderLitterSection();
    });
    div.querySelector('.litter-save-btn').addEventListener('click', async () => {
      const condition = div.querySelector('.litter-cond-select').value;
      const memo = div.querySelector('.litter-memo-input').value.trim();
      const photoFile = div.querySelector('.litter-photo-input').files[0];
      await DB.updateLitter(e.id, { condition, memo });
      if (photoFile) await DB.uploadLitterPhoto(e.id, photoFile);
      renderLitterSection();
    });
    list.appendChild(div);
  });
}
async function quickLogLitter(type) {
  await DB.addLitter({ cat: CAT, type });
  renderLitterSection();
}
document.getElementById('litterQuickPee').addEventListener('click', () => quickLogLitter('pee'));
document.getElementById('litterQuickPoop').addEventListener('click', () => quickLogLitter('poop'));

/* ---------- Init ---------- */
(async function init() {
  [settings, profile] = await Promise.all([DB.getSettings(), DB.getCatProfile(CAT)]);
  renderHero();
  renderInfoDisplay();
  await renderWeightSection();
  await initCalculator();
  await renderPlaySection();
  await renderGroomingSection();
  await renderLitterSection();
})();
