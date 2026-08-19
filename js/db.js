/* ---------- Supabase-backed data layer ----------
   Every other file talks to the backend only through the functions below.
   Swapping backends later means rewriting this file only. */

const DB = (() => {
  const BASE = window.SUPABASE_URL;
  const KEY = window.SUPABASE_KEY;
  const REST = `${BASE}/rest/v1`;
  const STORAGE = `${BASE}/storage/v1`;
  const BUCKET = 'cat-photos';

  const headers = (extra = {}) => ({
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    ...extra,
  });

  async function rest(path, options = {}) {
    const res = await fetch(`${REST}${path}`, {
      ...options,
      headers: headers({ 'Content-Type': 'application/json', ...(options.headers || {}) }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`DB error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /* ---------- settings ---------- */
  async function getSettings() {
    const rows = await rest('/settings?id=eq.1&select=*');
    return rows && rows[0] ? rows[0] : {
      site_title: '우리 냥이 다이어리', cat1_name: '양갱', cat2_name: '곤약',
      cat1_avatar_url: null, cat2_avatar_url: null,
    };
  }
  async function updateSettings(patch) {
    return rest('/settings?id=eq.1', {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
  }

  /* ---------- events (calendar) ---------- */
  async function listEvents() {
    return rest('/events?select=*&order=event_date.asc');
  }
  async function addEvent(ev) {
    const rows = await rest('/events', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(ev),
    });
    return rows[0];
  }
  async function deleteEvent(id) {
    return rest(`/events?id=eq.${id}`, { method: 'DELETE' });
  }

  /* ---------- food log ---------- */
  async function listFood() {
    return rest('/food_log?select=*&order=log_date.desc,created_at.desc');
  }
  async function addFood(entry) {
    const rows = await rest('/food_log', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(entry),
    });
    return rows[0];
  }
  async function deleteFood(id) {
    return rest(`/food_log?id=eq.${id}`, { method: 'DELETE' });
  }

  /* ---------- photos (gallery) ---------- */
  async function listPhotos() {
    return rest('/photos?select=*&order=is_default.desc,created_at.asc');
  }
  async function uploadFile(file, pathPrefix) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const res = await fetch(`${STORAGE}/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: headers({ 'Content-Type': file.type || 'application/octet-stream' }),
      body: file,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upload error ${res.status}: ${text}`);
    }
    return `${STORAGE}/object/public/${BUCKET}/${path}`;
  }
  async function addPhoto(file, cat) {
    const url = await uploadFile(file, 'photos');
    const rows = await rest('/photos', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ url, cat, taken_date: todayStr(), is_default: false }),
    });
    return rows[0];
  }
  async function deletePhoto(id, url) {
    const path = url.split(`/public/${BUCKET}/`)[1];
    if (path) {
      await fetch(`${STORAGE}/object/${BUCKET}/${path}`, { method: 'DELETE', headers: headers() }).catch(() => {});
    }
    return rest(`/photos?id=eq.${id}`, { method: 'DELETE' });
  }

  /* ---------- avatars ---------- */
  async function uploadAvatar(file, catKey) {
    const url = await uploadFile(file, 'avatars');
    const field = catKey === 'cat1' ? 'cat1_avatar_url' : 'cat2_avatar_url';
    await updateSettings({ [field]: url });
    return url;
  }

  /* ---------- cat profile (fixed info) ---------- */
  async function getCatProfile(cat) {
    const rows = await rest(`/cat_profile?cat=eq.${cat}&select=*`);
    return rows && rows[0] ? rows[0] : { cat, arrival_date: null, breed: '', birthday: null, gender: '', neutered: false, microchip: '', personality: '', notes: '' };
  }
  async function updateCatProfile(cat, patch) {
    return rest(`/cat_profile?cat=eq.${cat}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
  }

  /* ---------- weight log ---------- */
  async function listWeights(cat) {
    return rest(`/weight_log?cat=eq.${cat}&select=*&order=measured_date.asc`);
  }
  async function addWeight(entry) {
    const rows = await rest('/weight_log', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(entry),
    });
    return rows[0];
  }
  async function deleteWeight(id) {
    return rest(`/weight_log?id=eq.${id}`, { method: 'DELETE' });
  }

  /* ---------- play log ---------- */
  async function listPlays(cat) {
    return rest(`/play_log?cat=eq.${cat}&select=*&order=played_date.desc,created_at.desc`);
  }
  async function addPlay(entry) {
    const rows = await rest('/play_log', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(entry),
    });
    return rows[0];
  }
  async function deletePlay(id) {
    return rest(`/play_log?id=eq.${id}`, { method: 'DELETE' });
  }

  /* ---------- grooming log (bath / nail trim) ---------- */
  async function listGrooming(cat) {
    return rest(`/grooming_log?cat=eq.${cat}&select=*&order=done_date.desc,created_at.desc`);
  }
  async function addGrooming(entry) {
    const rows = await rest('/grooming_log', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(entry),
    });
    return rows[0];
  }
  async function deleteGrooming(id) {
    return rest(`/grooming_log?id=eq.${id}`, { method: 'DELETE' });
  }

  /* ---------- litter log (pee / poop) ---------- */
  async function listLitter(cat) {
    return rest(`/litter_log?cat=eq.${cat}&select=*&order=logged_at.desc&limit=200`);
  }
  async function addLitter(entry) {
    const rows = await rest('/litter_log', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ logged_at: new Date().toISOString(), condition: 'normal', ...entry }),
    });
    return rows[0];
  }
  async function updateLitter(id, patch) {
    const rows = await rest(`/litter_log?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    return rows[0];
  }
  async function uploadLitterPhoto(id, file) {
    const url = await uploadFile(file, 'litter');
    await updateLitter(id, { photo_url: url });
    return url;
  }
  async function deleteLitter(id) {
    return rest(`/litter_log?id=eq.${id}`, { method: 'DELETE' });
  }

  return {
    getSettings, updateSettings,
    listEvents, addEvent, deleteEvent,
    listFood, addFood, deleteFood,
    listPhotos, addPhoto, deletePhoto,
    uploadAvatar,
    getCatProfile, updateCatProfile,
    listWeights, addWeight, deleteWeight,
    listPlays, addPlay, deletePlay,
    listGrooming, addGrooming, deleteGrooming,
    listLitter, addLitter, updateLitter, uploadLitterPhoto, deleteLitter,
    todayStr,
  };
})();
