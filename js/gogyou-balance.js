// gogyou-balance.js — 4柱(年月日時)の干支から五行バランスを算出
(function (global) {
  'use strict';

  // 干 → 五行
  const STEM_ELEM = ['木','木','火','火','土','土','金','金','水','水'];
  // 支 → 五行
  const BRANCH_ELEM = ['水','土','木','木','土','火','火','土','金','金','土','水'];

  const ELEMS = ['木','火','土','金','水'];

  // 干支4組から五行カウント (4柱*2 = 8)
  function count(yEto, mEto, dEto, hEto) {
    const c = { 木:0, 火:0, 土:0, 金:0, 水:0 };
    [yEto, mEto, dEto, hEto].forEach(e => {
      if (!e) return;
      if (typeof e.stemIdx === 'number')   c[STEM_ELEM[e.stemIdx]]++;
      if (typeof e.branchIdx === 'number') c[BRANCH_ELEM[e.branchIdx]]++;
    });
    return c;
  }

  // 過剰・不足の判定
  function diagnose(counts) {
    return ELEMS.map(el => {
      const n = counts[el] || 0;
      let status;
      if (n === 0) status = '欠';
      else if (n === 1) status = '少';
      else if (n >= 4) status = '過';
      else status = '均';
      return { elem: el, count: n, status };
    });
  }

  // 過剰・不足のコメント生成
  function comment(diag) {
    const overs = diag.filter(d => d.status === '過').map(d => d.elem);
    const lacks = diag.filter(d => d.status === '欠' || d.status === '少').map(d => d.elem);
    const parts = [];
    if (overs.length) parts.push(`過剰: ${overs.join('・')}`);
    if (lacks.length) parts.push(`不足: ${lacks.join('・')}`);
    if (!parts.length) parts.push('五行均衡');
    return parts.join(' / ');
  }

  global.GogyouBalance = { count, diagnose, comment, ELEMS };
})(typeof window !== 'undefined' ? window : globalThis);
