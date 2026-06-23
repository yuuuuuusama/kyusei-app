// eto-relations.js — 干支相関 (三合・六合・冲・刑・害・破) 自動判定
(function (global) {
  'use strict';

  const SANGOU = [
    { name: '寅午戌 火局', members: ['寅','午','戌'] },
    { name: '申子辰 水局', members: ['申','子','辰'] },
    { name: '亥卯未 木局', members: ['亥','卯','未'] },
    { name: '巳酉丑 金局', members: ['巳','酉','丑'] }
  ];

  const RIKUGOU = [
    ['子','丑'], ['寅','亥'], ['卯','戌'],
    ['辰','酉'], ['巳','申'], ['午','未']
  ];

  const SHICHU = {
    '子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥',
    '午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳'
  };

  const SHIKEI = {
    '寅':['巳','申'], '巳':['寅','申'], '申':['寅','巳'],
    '丑':['戌','未'], '戌':['丑','未'], '未':['丑','戌'],
    '子':['卯'], '卯':['子'],
    '辰':['辰'], '午':['午'], '酉':['酉'], '亥':['亥']
  };

  const SHIGAI = {
    '子':'未','未':'子','丑':'午','午':'丑',
    '寅':'巳','巳':'寅','卯':'辰','辰':'卯',
    '申':'亥','亥':'申','酉':'戌','戌':'酉'
  };

  const SHIHA = {
    '子':'酉','酉':'子','丑':'辰','辰':'丑',
    '寅':'亥','亥':'寅','卯':'午','午':'卯',
    '巳':'申','申':'巳','未':'戌','戌':'未'
  };

  // 二つの支 (a, b) の関係名の配列
  function relate(a, b) {
    const rel = [];
    if (!a || !b) return rel;
    if (a === b) rel.push({ name: '比和', kind: 'good' });
    if (SHICHU[a] === b) rel.push({ name: '冲', kind: 'bad' });
    if (SHIKEI[a] && SHIKEI[a].indexOf(b) >= 0) rel.push({ name: '刑', kind: 'bad' });
    if (SHIGAI[a] === b) rel.push({ name: '害', kind: 'bad' });
    if (SHIHA[a] === b) rel.push({ name: '破', kind: 'bad' });
    for (const pair of RIKUGOU) {
      if (pair.indexOf(a) >= 0 && pair.indexOf(b) >= 0 && a !== b) {
        rel.push({ name: '六合', kind: 'good' });
        break;
      }
    }
    for (const g of SANGOU) {
      if (g.members.indexOf(a) >= 0 && g.members.indexOf(b) >= 0 && a !== b) {
        rel.push({ name: '三合(' + g.name + ')', kind: 'good' });
        break;
      }
    }
    return rel;
  }

  global.EtoRelations = { relate, SANGOU, RIKUGOU, SHICHU, SHIKEI, SHIGAI, SHIHA };
})(typeof window !== 'undefined' ? window : globalThis);
