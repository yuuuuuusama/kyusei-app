// houi-analysis.js — 凶神方位・吉方位計算
(function (global) {
  'use strict';
  const Kyusei = global.Kyusei;

  // 8方位 position indices (中宮=4 を除く)
  const DIRS = [
    { pos: 1, label: '北',   short: '坎' },
    { pos: 2, label: '北東', short: '艮' },
    { pos: 5, label: '東',   short: '震' },
    { pos: 8, label: '南東', short: '巽' },
    { pos: 7, label: '南',   short: '離' },
    { pos: 6, label: '南西', short: '坤' },
    { pos: 3, label: '西',   short: '兌' },
    { pos: 0, label: '北西', short: '乾' }
  ];

  const BRANCH_NATURAL_POS = [1, 2, 2, 5, 8, 8, 7, 6, 6, 3, 0, 0];

  // 五行属性 (Kyusei.STAR_ELEMENTS と同期)
  const STAR_ELEM = ['', '水','土','木','木','土','金','金','土','火'];
  const PRODUCES = { '木':'火','火':'土','土':'金','金':'水','水':'木' };

  // 本命星にとっての吉相生か (五行 比和 / 我生 / 生我 を吉とする)
  function isRelationKichi(honmeisei, otherStar) {
    if (!otherStar || otherStar === 5) return false;
    const a = STAR_ELEM[honmeisei], b = STAR_ELEM[otherStar];
    if (!a || !b) return false;
    return a === b || PRODUCES[a] === b || PRODUCES[b] === a;
  }

  // 盤の凶神位置を抽出
  function analyzeBoard(center, periodBranchIdx, honmeisei) {
    const out = { center, periodBranchIdx, honmeisei };
    out.gokousatsu      = (center === 5) ? null : Kyusei.findPositionOfStar(center, 5);
    out.ankenSatsu      = (out.gokousatsu == null) ? null : 8 - out.gokousatsu;
    out.hasatsu         = (typeof periodBranchIdx === 'number') ? 8 - BRANCH_NATURAL_POS[periodBranchIdx] : null;
    out.honmeisatsu     = (honmeisei === center) ? null : Kyusei.findPositionOfStar(center, honmeisei);
    out.honmeitekisatsu = (out.honmeisatsu == null) ? null : 8 - out.honmeisatsu;
    const centerDefPos  = Kyusei.DEFAULT_POSITION_STARS.indexOf(center);
    out.teiitaichu      = (centerDefPos === 4 || centerDefPos < 0) ? null : 8 - centerDefPos;
    return out;
  }

  // 各方位 pos → 凶神名の配列
  function getKyoushinByDir(analysis) {
    const map = {};
    DIRS.forEach(d => map[d.pos] = []);
    function add(pos, name) {
      if (pos == null) return;
      if (pos === 4) return;
      if (!map[pos]) map[pos] = [];
      map[pos].push(name);
    }
    add(analysis.gokousatsu, '五黄殺');
    add(analysis.ankenSatsu, '暗剣殺');
    add(analysis.hasatsu, '歳/月破');
    add(analysis.honmeisatsu, '本命殺');
    add(analysis.honmeitekisatsu, '本命的殺');
    add(analysis.teiitaichu, '定位対冲');
    return map;
  }

  // 月吉方位: 月盤の各方位の九星が本命と相生 かつ 年盤・月盤いずれも凶神でない
  function getMonthKichihoui(monthCenter, monthBranchIdx, yearCenter, yearBranchIdx, honmeisei) {
    const monthA = analyzeBoard(monthCenter, monthBranchIdx, honmeisei);
    const yearA  = analyzeBoard(yearCenter,  yearBranchIdx,  honmeisei);
    const stars  = Kyusei.getPositionStars(monthCenter);
    const monthBad = getKyoushinByDir(monthA);
    const yearBad  = getKyoushinByDir(yearA);
    return DIRS.map(d => {
      const star = stars[d.pos];
      const kichi = isRelationKichi(honmeisei, star);
      const bad = [...monthBad[d.pos], ...yearBad[d.pos]];
      return {
        pos: d.pos, label: d.label, star,
        starName: Kyusei.STAR_NAMES[star],
        kichi: kichi && bad.length === 0,
        bad
      };
    });
  }

  global.HouiAnalysis = {
    DIRS, analyzeBoard, getKyoushinByDir, getMonthKichihoui, isRelationKichi
  };
})(typeof window !== 'undefined' ? window : globalThis);
