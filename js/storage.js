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

  // 同名の相談者で記録をまとめる
  function getGroups() {
    const list = loadAll();
    const map = new Map();
    list.forEach(r => {
      const key = ((r.name || '').trim()) || '(無名)';
      if (!map.has(key)) map.set(key, { name: key, records: [] });
      map.get(key).records.push(r);
    });
    const groups = [...map.values()];
    groups.forEach(g => g.records.sort((a, b) => (b.consult || '').localeCompare(a.consult || '')));
    groups.sort((a, b) => {
      const al = a.records[0]?.updatedAt || '';
      const bl = b.records[0]?.updatedAt || '';
      return bl.localeCompare(al);
    });
    return groups;
  }

  global.Storage = { loadAll, get, upsert, remove, exportJSON, importJSON, getGroups };
})(typeof window !== 'undefined' ? window : globalThis);
