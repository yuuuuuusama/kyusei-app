// snippets.js — 定型コメント辞書 (本人運気 / 年月運 / 内蔵法 用)
(function (global) {
  'use strict';
  const KEY = 'kyusei_snippets_v1';

  // section: 'honnin' | 'nengetsu' | 'naizou' | 'sougou'
  const DEFAULT_SNIPPETS = [
    // 本人運気
    { id:'h1', section:'honnin', label:'宮傾斜の総括',
      body:'本命星◯◯、月命星◯◯。宮傾斜は◯宮傾斜にて、内面は…。' },
    { id:'h2', section:'honnin', label:'強みと注意点',
      body:'潜在的な強みは粘り強さと丁寧さ、注意点は決断の遅れと内向き思考。' },
    { id:'h3', section:'honnin', label:'対人関係の所見',
      body:'対人関係では誠実さが武器。一方で気の遣いすぎから疲労を溜めやすい。' },
    // 年月運
    { id:'n1', section:'nengetsu', label:'本年の位相',
      body:'本年は◯気の年。攻めるべき/守るべき性質を意識し、◯月以降に動きを集中。' },
    { id:'n2', section:'nengetsu', label:'同会の解釈',
      body:'年同会は◯宮、月同会は◯宮。今年は人脈・家庭・財運のうち…が動く。' },
    { id:'n3', section:'nengetsu', label:'凶神への留意',
      body:'年盤の◯方位に五黄殺/暗剣殺/歳破あり。引越・契約・大金移動は避けるのが無難。' },
    { id:'n4', section:'nengetsu', label:'方位取りの提案',
      body:'本命吉方は◯方位。◯月◯日前後の吉日に、◯km以上の移動で取得を検討。' },
    // 内蔵法
    { id:'z1', section:'naizou', label:'蔵気の傾向',
      body:'蔵気の星が示す内面の傾向は…。表に出ない動機・本能として観察する。' },
    { id:'z2', section:'naizou', label:'宿命のテーマ',
      body:'宿命の支は人生の通奏低音として持つテーマ。◯◯の課題が繰り返し巡る。' },
    // 総合
    { id:'g1', section:'sougou', label:'まとめ・行動指針',
      body:'今期の主軸は…。次回相談まで意識すべきは◯◯と◯◯。神社参拝は◯月◯日が吉。' }
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return seedDefaults();
  }

  function seedDefaults() {
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_SNIPPETS));
    return DEFAULT_SNIPPETS.slice();
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function getAll() { return load(); }
  function getBySection(sec) { return load().filter(s => s.section === sec); }

  function add(snip) {
    const list = load();
    snip.id = 'u' + Date.now();
    list.push(snip);
    save(list);
    return snip;
  }

  function update(id, patch) {
    const list = load();
    const i = list.findIndex(s => s.id === id);
    if (i < 0) return null;
    list[i] = Object.assign({}, list[i], patch);
    save(list);
    return list[i];
  }

  function remove(id) {
    const list = load().filter(s => s.id !== id);
    save(list);
  }

  function resetDefaults() {
    localStorage.removeItem(KEY);
    return seedDefaults();
  }

  const SECTION_LABELS = {
    honnin:   '本人運気',
    nengetsu: '年月運',
    naizou:   '内蔵法',
    sougou:   '総合'
  };

  global.Snippets = {
    getAll, getBySection, add, update, remove, resetDefaults,
    SECTION_LABELS
  };
})(typeof window !== 'undefined' ? window : globalThis);
