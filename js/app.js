/* ---------- In-memory cache (refreshed from Supabase on load / tab switch) ---------- */
let settings = { site_title: '우리 냥이 다이어리', cat1_name: '양갱', cat2_name: '곤약', cat1_avatar_url: null, cat2_avatar_url: null };
let events = [];   // [{id, date, title, cat, category, memo}]
let foodLog = [];  // [{id, name, type, cat, rating, memo, date}]

const catLabel = (cat) => cat === 'cat1' ? settings.cat1_name : cat === 'cat2' ? settings.cat2_name : `${settings.cat1_name} & ${settings.cat2_name}`;
const FALLBACK_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23eee2d0"/><text x="32" y="40" font-size="28" text-anchor="middle">🐾</text></svg>');

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.goto)));
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  if (tab === 'calendar') refreshEvents().then(renderCalendar);
  if (tab === 'gallery') renderGallery();
  if (tab === 'food') refreshFood().then(renderFoodList);
  if (tab === 'home') renderHome();
}

/* ---------- Settings modal ---------- */
const settingsModal = document.getElementById('settingsModal');
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsSiteTitle').value = settings.site_title;
  document.getElementById('settingsCat1Name').value = settings.cat1_name;
  document.getElementById('settingsCat2Name').value = settings.cat2_name;
  settingsModal.classList.add('open');
});
document.getElementById('settingsCancelBtn').addEventListener('click', () => settingsModal.classList.remove('open'));
document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
  const patch = {
    site_title: document.getElementById('settingsSiteTitle').value.trim() || settings.site_title,
    cat1_name: document.getElementById('settingsCat1Name').value.trim() || settings.cat1_name,
    cat2_name: document.getElementById('settingsCat2Name').value.trim() || settings.cat2_name,
  };
  await DB.updateSettings(patch);
  Object.assign(settings, patch);
  applySettingsToUI();
  settingsModal.classList.remove('open');
});
function applySettingsToUI() {
  document.getElementById('pageTitle').textContent = settings.site_title;
  document.getElementById('siteTitleText').textContent = settings.site_title;
  document.getElementById('cat1NameInput').value = settings.cat1_name;
  document.getElementById('cat2NameInput').value = settings.cat2_name;
  document.getElementById('cat1Avatar').src = settings.cat1_avatar_url || FALLBACK_AVATAR;
  document.getElementById('cat2Avatar').src = settings.cat2_avatar_url || FALLBACK_AVATAR;
  document.querySelectorAll('#eventCat option[value="cat1"], #foodCat option[value="cat1"]').forEach(o => o.textContent = settings.cat1_name);
  document.querySelectorAll('#eventCat option[value="cat2"], #foodCat option[value="cat2"]').forEach(o => o.textContent = settings.cat2_name);
  document.querySelectorAll('.filter-btn[data-filter="cat1"]').forEach(b => b.textContent = settings.cat1_name);
  document.querySelectorAll('.filter-btn[data-filter="cat2"]').forEach(b => b.textContent = settings.cat2_name);
}
document.getElementById('cat1NameInput').addEventListener('change', async (e) => {
  const val = e.target.value.trim() || settings.cat1_name;
  await DB.updateSettings({ cat1_name: val });
  settings.cat1_name = val;
  applySettingsToUI();
});
document.getElementById('cat2NameInput').addEventListener('change', async (e) => {
  const val = e.target.value.trim() || settings.cat2_name;
  await DB.updateSettings({ cat2_name: val });
  settings.cat2_name = val;
  applySettingsToUI();
});

/* ---------- Cat avatar photos (editable, shared) ---------- */
function wireAvatarUpload(catKey, inputId) {
  document.getElementById(inputId).addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = await DB.uploadAvatar(file, catKey);
    settings[catKey === 'cat1' ? 'cat1_avatar_url' : 'cat2_avatar_url'] = url;
    applySettingsToUI();
    e.target.value = '';
  });
}
wireAvatarUpload('cat1', 'cat1AvatarUpload');
wireAvatarUpload('cat2', 'cat2AvatarUpload');

/* ---------- Calendar ---------- */
let viewYear, viewMonth;
let selectedDate = null;
const todayStr = () => DB.todayStr();
(function initCalendarView() { const now = new Date(); viewYear = now.getFullYear(); viewMonth = now.getMonth(); })();

async function refreshEvents() { events = await DB.listEvents(); }
function eventsOnDate(dateStr) { return events.filter(e => e.event_date === dateStr); }

document.getElementById('prevMonthBtn').addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); });
document.getElementById('nextMonthBtn').addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderCalendar(); });
document.getElementById('todayBtn').addEventListener('click', () => { const now = new Date(); viewYear = now.getFullYear(); viewMonth = now.getMonth(); selectedDate = todayStr(); renderCalendar(); });

function renderCalendar() {
  document.getElementById('calendarMonthLabel').textContent = `${viewYear}년 ${viewMonth + 1}월`;
  const grid = document.getElementById('calendarDays');
  grid.innerHTML = '';
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, other: true, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false, dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  let nextMonthDay = 1;
  while (cells.length % 7 !== 0) cells.push({ day: nextMonthDay++, other: true, dateStr: null });

  cells.forEach(c => {
    const cell = document.createElement('div');
    cell.className = 'day-cell' + (c.other ? ' other-month' : '');
    if (c.dateStr === todayStr()) cell.classList.add('today');
    if (c.dateStr && c.dateStr === selectedDate) cell.classList.add('selected');
    const num = document.createElement('div');
    num.className = 'day-num'; num.textContent = c.day;
    cell.appendChild(num);
    if (c.dateStr) {
      const dayEvents = eventsOnDate(c.dateStr);
      if (dayEvents.length) {
        const dots = document.createElement('div'); dots.className = 'day-dots';
        dayEvents.forEach(ev => { const dot = document.createElement('span'); dot.className = `day-dot dot-${ev.category}`; dots.appendChild(dot); });
        cell.appendChild(dots);
      }
      cell.addEventListener('click', () => { selectedDate = c.dateStr; renderCalendar(); renderDayPanel(); });
    }
    grid.appendChild(cell);
  });
  renderDayPanel();
}

function renderDayPanel() {
  const dateLabel = document.getElementById('dayPanelDate');
  const list = document.getElementById('dayEventList');
  list.innerHTML = '';
  if (!selectedDate) { dateLabel.textContent = '날짜를 선택하세요'; document.getElementById('eventForm').style.display = 'none'; return; }
  document.getElementById('eventForm').style.display = 'flex';
  const [y, m, d] = selectedDate.split('-');
  dateLabel.textContent = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
  const dayEvents = eventsOnDate(selectedDate);
  if (!dayEvents.length) {
    list.innerHTML = '<li class="event-item" style="color:var(--ink-soft)">등록된 일정이 없어요</li>';
  } else {
    const catIcon = { hospital: '🏥', grooming: '✂️', birthday: '🎂', snack: '🍖', etc: '📌' };
    dayEvents.forEach(ev => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `<span>${catIcon[ev.category] || '📌'}</span><span class="ev-title">${escapeHTML(ev.title)}</span><span class="ev-tag">${catLabel(ev.cat)}${ev.memo ? ' · ' + escapeHTML(ev.memo) : ''}</span><button class="ev-del">삭제</button>`;
      li.querySelector('.ev-del').addEventListener('click', async () => {
        await DB.deleteEvent(ev.id);
        events = events.filter(x => x.id !== ev.id);
        renderCalendar();
      });
      list.appendChild(li);
    });
  }
}

document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedDate) return;
  const title = document.getElementById('eventTitle').value.trim();
  if (!title) return;
  const newEvent = await DB.addEvent({
    event_date: selectedDate, title,
    cat: document.getElementById('eventCat').value,
    category: document.getElementById('eventCategory').value,
    memo: document.getElementById('eventMemo').value.trim(),
  });
  events.push(newEvent);
  document.getElementById('eventTitle').value = ''; document.getElementById('eventMemo').value = '';
  renderCalendar();
});

/* ---------- Gallery ---------- */
let galleryFilter = 'all';
document.getElementById('galleryFilter').addEventListener('click', (e) => {
  if (!e.target.classList.contains('filter-btn')) return;
  document.querySelectorAll('#galleryFilter .filter-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active'); galleryFilter = e.target.dataset.filter; renderGallery();
});
document.getElementById('photoUpload').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  for (const file of files) await DB.addPhoto(file, 'both');
  e.target.value = ''; renderGallery(); renderHome();
});
async function renderGallery() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '<div class="empty-state">불러오는 중...</div>';
  const all = await DB.listPhotos();
  let filtered = all;
  if (galleryFilter !== 'all') filtered = all.filter(p => p.cat === galleryFilter || p.cat === 'both');
  grid.innerHTML = '';
  if (!filtered.length) { grid.innerHTML = '<div class="empty-state">사진이 없어요. "사진 추가" 버튼으로 올려보세요 🐾</div>'; return; }
  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'photo-item';
    item.innerHTML = `<img src="${p.url}" alt=""><span class="photo-tag">${p.is_default ? '기본사진' : catLabel(p.cat)}</span>`;
    item.addEventListener('click', () => openLightbox(p));
    grid.appendChild(item);
  });
}
const lightboxModal = document.getElementById('lightboxModal');
let currentLightboxPhoto = null;
function openLightbox(photo) {
  currentLightboxPhoto = photo;
  document.getElementById('lightboxImg').src = photo.url;
  document.getElementById('lightboxCat').textContent = photo.is_default ? '기본사진' : catLabel(photo.cat);
  document.getElementById('lightboxDate').textContent = photo.taken_date || '';
  document.getElementById('lightboxDeleteBtn').style.display = photo.is_default ? 'none' : 'inline-block';
  lightboxModal.classList.add('open');
}
document.getElementById('lightboxCloseBtn').addEventListener('click', () => lightboxModal.classList.remove('open'));
lightboxModal.addEventListener('click', (e) => { if (e.target === lightboxModal) lightboxModal.classList.remove('open'); });
document.getElementById('lightboxDeleteBtn').addEventListener('click', async () => {
  if (!currentLightboxPhoto || currentLightboxPhoto.is_default) return;
  await DB.deletePhoto(currentLightboxPhoto.id, currentLightboxPhoto.url);
  lightboxModal.classList.remove('open'); renderGallery(); renderHome();
});

/* ---------- Food log ---------- */
let foodFilter = 'all';
document.getElementById('foodFilter').addEventListener('click', (e) => {
  if (!e.target.classList.contains('filter-btn')) return;
  document.querySelectorAll('#foodFilter .filter-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active'); foodFilter = e.target.dataset.filter; renderFoodList();
});
async function refreshFood() { foodLog = await DB.listFood(); }

const ratingInput = document.getElementById('ratingInput');
ratingInput.addEventListener('click', (e) => {
  const star = e.target.closest('span[data-star]');
  if (!star) return;
  ratingInput.dataset.value = star.dataset.star; updateStarDisplay();
});
function updateStarDisplay() {
  const val = parseInt(ratingInput.dataset.value || '0');
  ratingInput.querySelectorAll('span').forEach(s => s.classList.toggle('filled', parseInt(s.dataset.star) <= val));
}
document.getElementById('foodDate').value = todayStr();

document.getElementById('foodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('foodName').value.trim();
  if (!name) return;
  const newEntry = await DB.addFood({
    name,
    type: document.getElementById('foodType').value,
    cat: document.getElementById('foodCat').value,
    rating: parseInt(ratingInput.dataset.value || '0'),
    memo: document.getElementById('foodMemo').value.trim(),
    log_date: document.getElementById('foodDate').value || todayStr(),
  });
  foodLog.unshift(newEntry);
  document.getElementById('foodForm').reset();
  document.getElementById('foodDate').value = todayStr();
  ratingInput.dataset.value = '0'; updateStarDisplay();
  renderFoodList(); renderHome();
});

const typeLabel = { snack: '간식', food: '사료', can: '캔/습식', etc: '기타' };
function renderFoodList() {
  const list = document.getElementById('foodList');
  let items = foodLog;
  if (foodFilter !== 'all') items = items.filter(f => f.cat === foodFilter || f.cat === 'both');
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<div class="empty-state">아직 기록이 없어요. 위에서 추가해보세요 🍖</div>'; return; }
  items.forEach(f => {
    const div = document.createElement('div');
    div.className = 'food-item';
    div.innerHTML = `
      <div class="food-main">
        <span class="food-name">${escapeHTML(f.name)}</span>
        <span class="food-meta">${typeLabel[f.type]} · ${catLabel(f.cat)} · ${f.log_date}</span>
        <div class="food-stars">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
        ${f.memo ? `<div class="food-memo">${escapeHTML(f.memo)}</div>` : ''}
      </div>
      <button class="food-del">삭제</button>`;
    div.querySelector('.food-del').addEventListener('click', async () => {
      await DB.deleteFood(f.id);
      foodLog = foodLog.filter(x => x.id !== f.id);
      renderFoodList(); renderHome();
    });
    list.appendChild(div);
  });
}

/* ---------- Home widgets ---------- */
async function renderHome() {
  await refreshEvents();
  const upcoming = [];
  const todayD = todayStr();
  events.filter(ev => ev.event_date >= todayD).sort((a, b) => a.event_date.localeCompare(b.event_date)).forEach(ev => upcoming.push(ev));
  const upcomingList = document.getElementById('upcomingEventsList');
  upcomingList.innerHTML = '';
  if (!upcoming.length) upcomingList.innerHTML = '<li class="empty">예정된 일정이 없어요</li>';
  else upcoming.slice(0, 4).forEach(ev => {
    const li = document.createElement('li'); const [, m, d] = ev.event_date.split('-');
    li.textContent = `${parseInt(m)}/${parseInt(d)} · ${ev.title} (${catLabel(ev.cat)})`;
    upcomingList.appendChild(li);
  });

  const allPhotos = await DB.listPhotos();
  const recent = allPhotos.slice(-3).reverse();
  document.getElementById('heroImg1').src = allPhotos[0] ? allPhotos[0].url : '';
  document.getElementById('heroImg2').src = allPhotos[1] ? allPhotos[1].url : '';
  document.getElementById('heroImg3').src = allPhotos[2] ? allPhotos[2].url : '';
  document.getElementById('recentPhotos').innerHTML = recent.map(p => `<img src="${p.url}" alt="">`).join('');

  await refreshFood();
  const recentFoodEl = document.getElementById('recentFoodList');
  recentFoodEl.innerHTML = '';
  if (!foodLog.length) recentFoodEl.innerHTML = '<li class="empty">기록이 없어요</li>';
  else foodLog.slice(0, 4).forEach(f => { const li = document.createElement('li'); li.textContent = `${f.name} ${'★'.repeat(f.rating)} · ${catLabel(f.cat)}`; recentFoodEl.appendChild(li); });
}

function escapeHTML(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

/* ---------- Init ---------- */
(async function init() {
  settings = await DB.getSettings();
  applySettingsToUI();
  updateStarDisplay();
  await renderHome();
  renderCalendar();
})();
