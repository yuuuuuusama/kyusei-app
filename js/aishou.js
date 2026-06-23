// aishou.js — 本命星同士の相性 (五行 比和/相生/相剋)
(function (global) {
  'use strict';
  const Kyusei = global.Kyusei;

  const PRODUCES = { '木':'火','火':'土','土':'金','金':'水','水':'木' };
  const CONTROLS = { '木':'土','土':'水','水':'火','火':'金','金':'木' };

  function elemOf(star) {
    if (!star || star < 1 || star > 9) return null;
    return Kyusei.STAR_ELEMENTS[star];
  }

  // 自分から見た相手の関係
  function relate(self, other) {
    const a = elemOf(self), b = elemOf(other);
    if (!a || !b) return { name: '—', kind: 'neutral', desc: '' };
    if (a === b) return { name: '比和', kind: 'good', desc: '同質。安定するが刺激は少ない。' };
    if (PRODUCES[a] === b) return { name: '我生(相手を生む)', kind: 'good', desc: '相手を伸ばす。与え疲れに注意。' };
    if (PRODUCES[b] === a) return { name: '生我(相手に生まれる)', kind: 'good', desc: '相手から助けられる関係。最良。' };
    if (CONTROLS[a] === b) return { name: '我剋(相手を剋す)', kind: 'bad', desc: '相手を抑え込みがち。配慮を。' };
    if (CONTROLS[b] === a) return { name: '剋我(相手に剋される)', kind: 'bad', desc: '相手からの圧。距離調整を。' };
    return { name: '—', kind: 'neutral', desc: '' };
  }

  const ALL_STARS = [
    { v:1, name:'一白水星' }, { v:2, name:'二黒土星' }, { v:3, name:'三碧木星' },
    { v:4, name:'四緑木星' }, { v:5, name:'五黄土星' }, { v:6, name:'六白金星' },
    { v:7, name:'七赤金星' }, { v:8, name:'八白土星' }, { v:9, name:'九紫火星' }
  ];

  global.Aishou = { relate, ALL_STARS };
})(typeof window !== 'undefined' ? window : globalThis);
