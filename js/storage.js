// storage.js
// 鑑定データの保存・読み込み (localStorage)

(function (global) {
  'use strict';

  const KEY = 'kyusei_records_v1';

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn('storage parse failed', e);
      return [];
    }
  }

  function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function get(id) {
    return loadAll().find(r => r.id === id) || null;
  }

  function upsert(record) {
    const list = loadAll();
    if (!record.id) record.id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    record.updatedAt = new Date().toISOString();
    const idx = list.findIndex(r => r.id === record.id);
    if (idx >= 0) list[idx] = record; else list.unshift(record);
    saveAll(list);
    return record;
  }

  function remove(id) {
    const list = loadAll().filter(r => r.id !== id);
    saveAll(list);
  }

  function exportJSON() {
    return JSON.stringify(loadAll(), null, 2);
  }

  function importJSON(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Invalid format');
    saveAll(data);
  }

  global.Storage = { loadAll, get, upsert, remove, exportJSON, importJSON };
})(typeof window !== 'undefined' ? window : globalThis);
