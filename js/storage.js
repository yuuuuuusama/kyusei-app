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

  // 取り込みの直前に取る控え。取り込みを誤ったときの戻り先。
  const UNDO_KEY = 'kyusei_records_undo';

  /** 一件が鑑定の記録として通るかを検める。 */
  function looksLikeRecord(r) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
    // id は必須。無ければ他の記録と衝突する。
    if (typeof r.id !== 'string' || !r.id) return false;
    // 相談者にまつわる欄は、あれば文字列であること
    for (const k of ['name', 'gender', 'age', 'topic', 'consult', 'birth']) {
      if (k in r && typeof r[k] !== 'string') return false;
    }
    if ('handan' in r && (typeof r.handan !== 'object' || r.handan === null)) return false;
    return true;
  }

  /**
   * 読み込んだ記録を取り込む。
   *
   * 以前はここで既存を丸ごと捨てていた。壊れた控えを一度読ませれば、
   * それまでの鑑定が全部消えた。戻す手立ても無かった。
   *
   * @param {string} text  読み込んだ JSON
   * @param {'replace'|'merge'} mode
   *   replace … 入れ替える（元は控えに残す）
   *   merge   … 足す。同じ id は新しいほうを採る
   * @returns {{added:number, updated:number, skipped:number, before:number}}
   */
  function importJSON(text, mode = 'merge') {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('JSON として読めません');
    }
    if (!Array.isArray(data)) throw new Error('鑑定の記録の一覧ではありません');

    const good = data.filter(looksLikeRecord);
    const skipped = data.length - good.length;
    if (good.length === 0) {
      throw new Error(
        data.length === 0 ? '中身が空です'
                          : `鑑定の記録として読める行がありません（${data.length}件すべて）`
      );
    }

    const before = loadAll();
    // 何をするより先に控える
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify({
        at: new Date().toISOString(),
        records: before,
      }));
    } catch (e) {
      // 控えが取れないなら、取り込みは進めない。戻れなくなる。
      throw new Error('控えを取れませんでした。端末の空きを確かめてください');
    }

    if (mode === 'replace') {
      saveAll(good);
      return { added: good.length, updated: 0, skipped, before: before.length };
    }

    const byId = new Map(before.map((r) => [r.id, r]));
    let added = 0, updated = 0;
    for (const r of good) {
      if (byId.has(r.id)) updated++; else added++;
      byId.set(r.id, r);
    }
    saveAll([...byId.values()]);
    return { added, updated, skipped, before: before.length };
  }

  /** 直前の取り込みを取り消せるか。 */
  function undoAvailable() {
    try {
      const raw = localStorage.getItem(UNDO_KEY);
      if (!raw) return null;
      const u = JSON.parse(raw);
      return { at: u.at, count: (u.records || []).length };
    } catch (e) {
      return null;
    }
  }

  /** 直前の取り込みを取り消し、控えの中身へ戻す。 */
  function undoImport() {
    const raw = localStorage.getItem(UNDO_KEY);
    if (!raw) throw new Error('戻れる控えがありません');
    const u = JSON.parse(raw);
    saveAll(u.records || []);
    localStorage.removeItem(UNDO_KEY);
    return (u.records || []).length;
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

  global.Storage = {
    loadAll, get, upsert, remove, exportJSON, importJSON, getGroups,
    undoAvailable, undoImport, UNDO_KEY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
