// kantei.js
// 鑑定書の各種宮位 (本命宮・対冲宮・右宮・左宮・本宮・中宮)
// 同会・被同会、宮傾斜、内蔵法、解神 など

(function (global) {
  'use strict';

  const Eto = global.Eto;
  const Kyusei = global.Kyusei;
  const SolarTerms = global.SolarTerms;

  // 鑑定対象データ:
  //  birthDate: Date (生年月日時)
  //  consultDate: Date (相談日時)
  // を受け取り、各種計算結果を返す

  // 五黄重複回避: 変化後の中宮が 5 で逆の隣も 5 のとき
  //   陽遁期間 → 八白(8) 優先、逆の隣が 8 なら 二黒(2)
  //   陰遁期間 → 二黒(2) 優先、逆の隣が 2 なら 八白(8)
  function goouAlt(isInton, oppositeNeighbor) {
    if (isInton) {
      return oppositeNeighbor === 2 ? 8 : 2;
    }
    return oppositeNeighbor === 8 ? 2 : 8;
  }

  // 鑑定法.docx の盤変化ルール
  // 相談日側 (top row): 日盤(d) は絶対変えない
  //   - 年月日 三つ同じ → 月→定盤(5)
  //   - 月日時 三つ同じ → 月→定盤(5), 時→定盤対冲(10-X)
  //   - 年月 同じ → 月→定盤(5), 日盤と被るなら 10-X
  //   - 月日 同じ → 月→定盤(5), 年盤と被るなら 10-X
  //   - 日時 同じ → 時→定盤対冲(10-X)
  //   - 上記で中宮 5 が更に 5 と重なれば 五黄回避 (陽遁→8, 陰遁→2)
  function transformCenters(y, m, d, h, isInton) {
    let M = m, H = h;
    let modified = false;
    isInton = !!isInton;
    // 月 transformation
    if (m === d && d === h) {
      // 月日時 三つ同じ → 月: 年と被らないように 定盤(5) か 対冲(10-m)
      if (m === 5 && y === 5) M = goouAlt(isInton, y);
      else if (y === 5) M = 10 - m;
      else M = 5;
      modified = true;
    } else if (y === m && m === d) {
      // 年月日 三つ同じ → 月→定盤(5)、全て5なら五黄回避 (逆の隣=時)
      if (m === 5) M = goouAlt(isInton, h);
      else M = 5;
      modified = true;
    } else if (y === m) {
      // 年月同じ: 月→定盤(5)、日盤と被るなら 対冲 (10-m)、全て5なら五黄回避 (逆の隣=日)
      if (m === 5 && y === 5) M = goouAlt(isInton, d);
      else if (d === 5 && m !== 5) M = 10 - m;
      else M = 5;
      modified = true;
    } else if (m === d) {
      // 月日同じ: 月→定盤(5)、年盤と被るなら 対冲 (10-m)、全て5なら五黄回避 (逆の隣=年)
      if (m === 5 && d === 5) M = goouAlt(isInton, y);
      else if (y === 5 && m !== 5) M = 10 - m;
      else M = 5;
      modified = true;
    }
    // 時 transformation: 日時同じ (月日時 三つ同じ含む) — 逆の隣なし
    if (d === h) {
      if (d === 5 && h === 5) H = isInton ? 2 : 8;  // 五黄回避 (逆の隣なし=固定)
      else if (h === 5) H = 5;
      else H = 10 - h;
      modified = true;
    }
    // 日 never changes (日盤絶対)
    return { year: y, month: M, day: d, hour: H, modified };
  }

  // 生年月日側 (bottom row) の盤変化ルール
  //   - 生年生月 (九星 or 支) 同じ → 生月→定盤(5)、生日==5 と被るなら 10-m
  //   - 生月生日 (九星 or 支) 同じ → 生日→定盤(5)、生年==5 と被るなら 10-d
  //   - 生日生時 (九星 or 支) 同じ → 生時→定盤(5)
  //   - 上記で中宮 5 が更に 5 と重なれば 五黄回避 (陽遁→8, 陰遁→2)
  function transformCentersBirth(y, m, d, h, yB, mB, dB, hB, isInton) {
    let M = m, D = d, H = h;
    let modified = false;
    isInton = !!isInton;
    const matchPair = (a, b, aB, bB) =>
      a === b || (typeof aB === 'number' && typeof bB === 'number' && aB === bB);

    // 生年 == 生月
    if (matchPair(y, m, yB, mB)) {
      if (y === 5 && m === 5) M = goouAlt(isInton, d);
      else if (d === 5 && m !== 5) M = 10 - m;
      else M = 5;
      modified = true;
    }
    // 生月 == 生日 (逆の隣 = 生時)
    if (matchPair(m, d, mB, dB)) {
      if (m === 5 && d === 5) D = goouAlt(isInton, h);
      else if (y === 5 && d !== 5) D = 10 - d;
      else D = 5;
      modified = true;
    }
    // 生日 == 生時
    if (matchPair(d, h, dB, hB)) {
      if (d === 5 && h === 5) H = goouAlt(isInton, m);
      else H = 5;
      modified = true;
    }
    return { year: y, month: M, day: D, hour: H, modified };
  }

  function computeKantei(birthDate, consultDate) {
    // 生年月日 → setsuYear/Month, 本命星・月命星 等
    const bSM = SolarTerms.getSetsuMonth(birthDate);
    const bYearEto = Eto.getYearEto(bSM.setsuYear);
    const bMonthEto = Eto.getMonthEto(bSM.setsuYear, bSM.setsuMonth);
    const bDayEto = Eto.getDayEto(birthDate);
    const bHourEto = Eto.getHourEto(birthDate);

    const honmeisei = Kyusei.getYearStar(bSM.setsuYear);    // 本命星
    const getsumeisei = Kyusei.getMonthStar(bYearEto.branchIdx, bSM.setsuMonth); // 月命星
    const bDayCenter = Kyusei.getDayStar(birthDate);   // 生日盤中宮
    const bHourCenter = Kyusei.getHourStar(birthDate); // 生時盤中宮

    // 相談日 → setsuYear/Month, 各盤中宮
    const cSM = SolarTerms.getSetsuMonth(consultDate);
    const cYearEto = Eto.getYearEto(cSM.setsuYear);
    const cMonthEto = Eto.getMonthEto(cSM.setsuYear, cSM.setsuMonth);
    const cDayEto = Eto.getDayEto(consultDate);
    const cHourEto = Eto.getHourEto(consultDate);

    const cYearCenter = Kyusei.getYearStar(cSM.setsuYear);
    const cMonthCenter = Kyusei.getMonthStar(cYearEto.branchIdx, cSM.setsuMonth);
    const cDayCenter = Kyusei.getDayStar(consultDate);
    const cHourCenter = Kyusei.getHourStar(consultDate);

    // ----- 盤変化の事前計算 (解決・時本命・時本宮・内蔵 で使用) -----
    const cIsIntonPre = Kyusei.isInton(consultDate);
    const cTransformPre = transformCenters(
      cYearCenter, cMonthCenter, cDayCenter, cHourCenter, cIsIntonPre
    );
    const transHourCenter = cTransformPre.hour; // 変換後の時盤中宮

    // ----- 鑑定書下部の宮位 -----
    // 位置の基準: 「日盤」(相談日の日盤、絶対不変)
    // 各セル: 宮名 + 動的干支 + 九星 (その盤での実星)
    //
    // 動的干支の算定:
    //   - 各盤の中宮にその期間の支 (年支/月支/日支/時支) を置く
    //   - 後天定位の星番号順 (中=5→乾=6→兌=7→艮=8→離=9→坎=1→坤=2→震=3→巽=4) で支を+1ずつ進めて配置

    // 時計回り順: N(1)→NE(2)→E(5)→SE(8)→S(7)→SW(6)→W(3)→NW(0)→N(1)
    const CLOCKWISE = [1, 2, 5, 8, 7, 6, 3, 0];

    function dynamicBranch(periodBranchIdx, posIdx, isInton) {
      if (typeof periodBranchIdx !== 'number') return '';
      const defStar = Kyusei.DEFAULT_POSITION_STARS[posIdx];
      const offset = isInton
        ? ((5 - defStar + 9) % 9)   // 陰遁: 逆運行
        : ((defStar - 5 + 9) % 9);  // 陽遁: 通常
      return Eto.BRANCHES[((periodBranchIdx + offset) % 12 + 12) % 12];
    }

    // 各支の本来の方位 (position index)
    const BRANCH_NATURAL_POS = [1, 2, 2, 5, 8, 8, 7, 6, 6, 3, 0, 0];

    // 盤の暗剣殺(ア)/破(ハ) の位置を返す
    //   暗剣殺: 五黄が居るマスの真反対 (中宮=五黄なら無し)
    //   破:    中宮支の本来の方位の真反対 (中宮支が判らなければ無し)
    function getAnkenHaPos(boardCenter, periodBranchIdx) {
      let ankenPos = null, haPos = null;
      if (boardCenter !== 5) {
        const gokoPos = Kyusei.findPositionOfStar(boardCenter, 5);
        ankenPos = 8 - gokoPos;
      }
      if (typeof periodBranchIdx === 'number') {
        const naturalPos = BRANCH_NATURAL_POS[periodBranchIdx];
        haPos = 8 - naturalPos;
      }
      return { ankenPos, haPos };
    }

    // boardCenter の盤上で、posIdx の宮の情報を返す
    // isInton: その盤が陰遁逆運行を適用するか (日盤・時盤のみ)
    function describeOnBoard(boardCenter, periodBranchIdx, posIdx, isInton) {
      const stars = Kyusei.getPositionStars(boardCenter);
      const star = stars[posIdx];
      const isCenter = posIdx === 4;
      const { ankenPos, haPos } = getAnkenHaPos(boardCenter, periodBranchIdx);
      return {
        kyu: isCenter ? '中宮' : Kyusei.POSITION_TO_KYU_NAME[posIdx],
        direction: isCenter ? '中央' : Kyusei.POSITION_TO_DIRECTION[posIdx],
        branches: dynamicBranch(periodBranchIdx, posIdx, !!isInton),
        star,
        starName: Kyusei.STAR_NAMES[star],
        positionIdx: posIdx,
        anken: posIdx === ankenPos,
        ha: posIdx === haPos
      };
    }

    // 陰遁判定 (日盤/時盤のみ干支が逆運行)
    const cIsIntonForCells = Kyusei.isInton(consultDate);

    // 日盤での本命位置 (本命星が日盤の何宮にいるか)
    const honmeiPos = Kyusei.findPositionOfStar(cDayCenter, honmeisei);
    const dayBranchIdx = cDayEto.branchIdx;
    const honmei = describeOnBoard(cDayCenter, dayBranchIdx, honmeiPos, cIsIntonForCells);

    // 本命が中宮にあるときは「本命の本宮 (後天定位)」を基準に対冲/右宮/左宮/月/年/時 を反映
    // 例: 中宮に三碧 → 三碧の本宮=震宮(posIdx=5) を基準 → 対冲=兌宮(五黄), 右宮=艮宮(六白), 左宮=巽宮(二黒)
    // 本命=五黄 の場合: 陽遁→八白(艮宮)、陰遁→二黒(坤宮) を基準にする
    const honguDefPos = Kyusei.DEFAULT_POSITION_STARS.indexOf(honmeisei);
    let refPos;
    if (honmeiPos === 4) {
      if (honmeisei === 5) {
        const altStar = cIsIntonForCells ? 2 : 8;
        refPos = Kyusei.DEFAULT_POSITION_STARS.indexOf(altStar);
      } else {
        refPos = honguDefPos;
      }
    } else {
      refPos = honmeiPos;
    }

    // 対冲宮: 真反対 (8 - posIdx)
    let taichu;
    if (refPos === 4) {
      taichu = describeOnBoard(cDayCenter, dayBranchIdx, 4, cIsIntonForCells);
      taichu.kyu = '(中央)';
    } else {
      taichu = describeOnBoard(cDayCenter, dayBranchIdx, 8 - refPos, cIsIntonForCells);
    }

    // 右宮 = 反時計回り (CCW) 隣 / 左宮 = 時計回り (CW) 隣
    let migi = null, hidari = null;
    if (refPos !== 4) {
      const cwIdx = CLOCKWISE.indexOf(refPos);
      migi   = describeOnBoard(cDayCenter, dayBranchIdx, CLOCKWISE[(cwIdx - 1 + 8) % 8], cIsIntonForCells);
      hidari = describeOnBoard(cDayCenter, dayBranchIdx, CLOCKWISE[(cwIdx + 1) % 8], cIsIntonForCells);
    }

    // 本宮: 本命星 X の後天定位 (固定position)
    const honguPos = honguDefPos;
    const hongu = describeOnBoard(cDayCenter, dayBranchIdx, honguPos, cIsIntonForCells);

    // 中宮: 日盤の中央
    const chukyu = describeOnBoard(cDayCenter, dayBranchIdx, 4, cIsIntonForCells);

    // 時 = 基準位置を 時盤 で見た時 (時盤は陰遁時、干支逆行)
    // 月 = 月盤 (常に陽遁)
    // 年 = 年盤 (常に陽遁)
    const toki  = describeOnBoard(cHourCenter,  cHourEto.branchIdx,  refPos, cIsIntonForCells);
    const tsuki = describeOnBoard(cMonthCenter, cMonthEto.branchIdx, refPos, false);
    const toshi = describeOnBoard(cYearCenter,  cYearEto.branchIdx,  refPos, false);

    // ----- 右側カラム (変換後の時盤を読み取る、陰遁時干支逆行) -----
    // 解決: 変換後時盤の中宮 を 日盤(絶対) で探し、その位置を変換後時盤で見た値
    const kaiketsuPos = Kyusei.findPositionOfStar(cDayCenter, transHourCenter);
    const kaiketsu = describeOnBoard(transHourCenter, cHourEto.branchIdx, kaiketsuPos, cIsIntonForCells);

    // 時本命: 本命星が変換後時盤のどこにあるか
    const jiHonmeiPos = Kyusei.findPositionOfStar(transHourCenter, honmeisei);
    const jiHonmei = describeOnBoard(transHourCenter, cHourEto.branchIdx, jiHonmeiPos, cIsIntonForCells);

    // 時本宮: 本命星の後天定位 (固定position) を変換後時盤で見た値
    const jiHonguPos = Kyusei.DEFAULT_POSITION_STARS.indexOf(honmeisei);
    const jiHongu = describeOnBoard(transHourCenter, cHourEto.branchIdx, jiHonguPos, cIsIntonForCells);

    // ----- 同会・被同会 -----
    // 年同会:   定位盤[posOf(本命, 年盤)]    本命の年盤上の位置に来る定位星
    // 年被同会: 年盤[本命の定位]              本命の定位置に来る年盤の星
    // 月同会:   月盤[posOf(本命, 年盤)]      本命の年盤上の位置に来る月盤の星
    // 月被同会: 年盤[posOf(本命, 月盤)]      本命の月盤上の位置に来る年盤の星
    const yearStars  = Kyusei.getPositionStars(cYearCenter);
    const monthStars = Kyusei.getPositionStars(cMonthCenter);
    const honmeiPosInYear  = Kyusei.findPositionOfStar(cYearCenter,  honmeisei);
    const honmeiPosInMonth = Kyusei.findPositionOfStar(cMonthCenter, honmeisei);
    const honmeiDefPos     = Kyusei.DEFAULT_POSITION_STARS.indexOf(honmeisei);

    const toshiDoukai    = Kyusei.DEFAULT_POSITION_STARS[honmeiPosInYear];
    const toshiHidoukai  = yearStars[honmeiDefPos];
    const tsukiDoukai    = yearStars[honmeiPosInMonth];
    const tsukiHidoukai  = monthStars[honmeiPosInYear];

    // ----- 蔵気 (内蔵法) -----
    // 蔵気 = 2つの盤を見て、両盤で「対向位置 (positionが8-旧の関係)」にある九星
    //
    // 数式: 盤A中宮C1、盤B中宮C2 のとき、対向にある星X は
    //   2X ≡ (C1+C2) (mod 9)
    //   → X = (5 * (C1+C2)) mod 9 (5は2のmod9逆元)、0は9にマップ
    //
    // 蔵気年月 = 日盤 + 時盤(=NEW rule で中宮=advHourCenter、中宮支=時支)
    // 蔵気月日 = 月盤 + 日盤
    function findFacingStar(c1, c2) {
      const sum = ((c1 + c2) % 9 + 9) % 9;
      let x = (5 * sum) % 9;
      if (x === 0) x = 9;
      // 中央にある場合は無効
      if (x === c1 || x === c2) return null;
      return x;
    }
    function fmtCellWithMarks(cell) {
      let s = `${cell.kyu}${cell.starName}${cell.branches}`;
      if (cell.anken) s += '<span style="color:#d00;font-weight:bold;">ア</span>';
      if (cell.ha)    s += '<span style="color:#06c;font-weight:bold;">ハ</span>';
      return s;
    }
    function kurakiPair(c1, b1, c2, b2, isInton1, isInton2) {
      const star = findFacingStar(c1, c2);
      if (!star) return '—';
      const pos1 = Kyusei.findPositionOfStar(c1, star);
      const pos2 = Kyusei.findPositionOfStar(c2, star);
      const cell1 = describeOnBoard(c1, b1, pos1, !!isInton1);
      const cell2 = describeOnBoard(c2, b2, pos2, !!isInton2);
      return `${fmtCellWithMarks(cell1)}ー${fmtCellWithMarks(cell2)}`;
    }
    // 宿命ペア: 盤A暗剣殺位置を盤Bで見る ー 盤B暗剣殺位置を盤Aで見る
    function shukumeiPair(c1, b1, c2, b2, isInton1, isInton2) {
      const parts = [];
      if (c1 !== 5) {
        const ankenPos = 8 - Kyusei.findPositionOfStar(c1, 5);
        const cell = describeOnBoard(c2, b2, ankenPos, !!isInton2);
        parts.push(fmtCellWithMarks(cell));
      }
      if (c2 !== 5) {
        const ankenPos = 8 - Kyusei.findPositionOfStar(c2, 5);
        const cell = describeOnBoard(c1, b1, ankenPos, !!isInton1);
        parts.push(fmtCellWithMarks(cell));
      }
      return parts.length ? parts.join('ー') : '—';
    }

    // 鑑定書「内蔵」 = 蔵気 = 日盤(絶対) + 変換後時盤 の facing pair
    const kuraki_nichiji = kurakiPair(
      cDayCenter,       cDayEto.branchIdx,
      transHourCenter,  cHourEto.branchIdx,
      cIsIntonForCells, cIsIntonForCells
    );
    // 判断書「蔵気年月」 = 相談年盤 + 相談月盤
    const kuraki_toshigetsu = kurakiPair(
      cYearCenter,  cYearEto.branchIdx,
      cMonthCenter, cMonthEto.branchIdx,
      false, false
    );
    // 判断書「蔵気月日」 = 相談月盤 + 相談日盤
    const kuraki_getsubi = kurakiPair(
      cMonthCenter, cMonthEto.branchIdx,
      cDayCenter,   cDayEto.branchIdx,
      false, cIsIntonForCells
    );

    // ----- 本人運気 (宮傾斜) -----
    // 本命星が「生月盤」のどの宮にいるか。生月盤の中宮 = 月命星。
    // 例: 本命=四緑、月命=七赤 → 生月盤(中宮=7)で 4 は posIdx=6 (坤宮) → 坤傾斜
    const keishaPos = Kyusei.findPositionOfStar(getsumeisei, honmeisei);
    const keishaKyuName = honmeisei === getsumeisei
      ? '中央'
      : Kyusei.positionToKyu(keishaPos).kyu;
    const keishaKyu = keishaKyuName === '中央' ? '中央' : keishaKyuName.replace('宮', '') + '傾斜';

    // ----- 宿命 (鑑定書: 日盤+変換後時盤) -----
    const shukumei_nichiji = shukumeiPair(
      cDayCenter,       cDayEto.branchIdx,
      transHourCenter,  cHourEto.branchIdx,
      cIsIntonForCells, cIsIntonForCells
    );
    // 判断書「宿命年月」 = 相談年盤 + 相談月盤
    const shukumei_toshigetsu = shukumeiPair(
      cYearCenter,  cYearEto.branchIdx,
      cMonthCenter, cMonthEto.branchIdx,
      false, false
    );
    // 判断書「宿命月日」 = 相談月盤 + 相談日盤
    const shukumei_getsubi = shukumeiPair(
      cMonthCenter, cMonthEto.branchIdx,
      cDayCenter,   cDayEto.branchIdx,
      false, cIsIntonForCells
    );

    // ----- 内蔵法 -----
    const naizou = {
      // 鑑定書 右カラム (内蔵/宿命) — 日盤+時盤
      kuraki_nengetsu:   kuraki_nichiji,
      shukumei_nengetsu: shukumei_nichiji,
      // 判断書 内蔵法
      kuraki_toshigetsu:   kuraki_toshigetsu,
      shukumei_toshigetsu: shukumei_toshigetsu,
      kuraki_getsubi:      kuraki_getsubi,
      shukumei_getsubi:    shukumei_getsubi
    };

    // ----- 解神 (12支に対する解神) -----
    // 各支に対し、その支を解く神 (相対の支)
    // 子↔午, 丑↔未, 寅↔申, 卯↔酉, 辰↔戌, 巳↔亥
    const KAIJIN_MAP = {
      0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11, 6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5
    };
    const kaijin = {};
    for (let i = 0; i < 12; i++) {
      kaijin[Eto.BRANCHES[i]] = Eto.BRANCHES[KAIJIN_MAP[i]];
    }

    // 陰遁判定 (盤の12支運行方向)
    const bIsInton = Kyusei.isInton(birthDate);
    const cIsInton = Kyusei.isInton(consultDate);

    // 生年月日側の盤変化 (新ルール: ペア毎に変化、五黄回避)
    const bYearCenterRaw = Kyusei.getYearStar(bSM.setsuYear);
    const bMonthCenterRaw = Kyusei.getMonthStar(bYearEto.branchIdx, bSM.setsuMonth);
    const bTransform = transformCentersBirth(
      bYearCenterRaw, bMonthCenterRaw, bDayCenter, bHourCenter,
      bYearEto.branchIdx, bMonthEto.branchIdx, bDayEto.branchIdx, bHourEto.branchIdx,
      bIsInton
    );
    // 相談日側の盤変化は前段で計算済 (cTransformPre)
    const cTransform = cTransformPre;

    return {
      birth: {
        date: birthDate,
        setsuYear: bSM.setsuYear, setsuMonth: bSM.setsuMonth,
        yearEto: bYearEto, monthEto: bMonthEto, dayEto: bDayEto, hourEto: bHourEto,
        yearCenter: Kyusei.getYearStar(bSM.setsuYear),
        monthCenter: Kyusei.getMonthStar(bYearEto.branchIdx, bSM.setsuMonth),
        dayCenter: bDayCenter,
        hourCenter: bHourCenter,
        honmeisei, getsumeisei,
        isInton: bIsInton,
        // 変換後の中宮 (盤表示用)
        displayYearCenter: bTransform.year,
        displayMonthCenter: bTransform.month,
        displayDayCenter: bTransform.day,
        displayHourCenter: bTransform.hour,
        transformModified: bTransform.modified
      },
      consult: {
        date: consultDate,
        setsuYear: cSM.setsuYear, setsuMonth: cSM.setsuMonth,
        yearEto: cYearEto, monthEto: cMonthEto, dayEto: cDayEto, hourEto: cHourEto,
        yearCenter: cYearCenter, monthCenter: cMonthCenter,
        dayCenter: cDayCenter, hourCenter: cHourCenter,
        isInton: cIsInton,
        displayYearCenter: cTransform.year,
        displayMonthCenter: cTransform.month,
        displayDayCenter: cTransform.day,
        displayHourCenter: cTransform.hour,
        transformModified: cTransform.modified
      },
      bottom: {
        honmei, taichu, migi, hidari, hongu, chukyu,
        toki, tsuki, toshi,
        kaiketsu, jiHonmei, jiHongu,
        naizou, keisha: keishaKyu,
        doukai: {
          toshi: toshiDoukai, tsuki: tsukiDoukai,
          toshiPos: honmeiPosInYear, tsukiPos: honmeiPosInMonth
        },
        hidoukai: {
          toshi: toshiHidoukai, tsuki: tsukiHidoukai,
          toshiPos: honmeiDefPos, tsukiPos: honmeiPosInYear
        },
        kaijin
      }
    };
  }

  // 流年法60年: 生年からの年数 (0,5,10,...,55) に対応する 年盤中宮 & 本命星宮
  function compute60YearFlow(birthDate, ageYears) {
    const SolarTerms = global.SolarTerms;
    const Kyusei = global.Kyusei;
    const bSM = SolarTerms.getSetsuMonth(birthDate);
    const targetYear = bSM.setsuYear + ageYears;
    const center = Kyusei.getYearStar(targetYear);
    const honmeisei = Kyusei.getYearStar(bSM.setsuYear);
    const pos = Kyusei.findPositionOfStar(center, honmeisei);
    return {
      year: targetYear,
      center,
      kyu: honmeisei === 5 ? '中央' : Kyusei.positionToKyu(pos).kyu
    };
  }

  // 月日法: 生年から ageYears 経過した年の各月における月盤での本命星位置
  function computeYearFlowDetail(birthDate, ageYears) {
    const SolarTerms = global.SolarTerms;
    const Kyusei = global.Kyusei;
    const Eto = global.Eto;
    const bSM = SolarTerms.getSetsuMonth(birthDate);
    const targetYear = bSM.setsuYear + ageYears;
    const yearEto = Eto.getYearEto(targetYear);
    const honmeisei = Kyusei.getYearStar(bSM.setsuYear);
    const months = [];
    for (let m = 2; m <= 12; m++) {
      const center = Kyusei.getMonthStar(yearEto.branchIdx, m);
      const pos = Kyusei.findPositionOfStar(center, honmeisei);
      months.push({ month: m, center, kyu: honmeisei === 5 ? '中央' : Kyusei.positionToKyu(pos).kyu });
    }
    // 1月 (翌年扱い)
    const nextYearEto = Eto.getYearEto(targetYear + 1);
    const c1 = Kyusei.getMonthStar(nextYearEto.branchIdx, 1);
    const p1 = Kyusei.findPositionOfStar(c1, honmeisei);
    months.push({ month: 1, center: c1, kyu: honmeisei === 5 ? '中央' : Kyusei.positionToKyu(p1).kyu });
    return { year: targetYear, months };
  }

  // 流年法60年表: 12行 × 5歳刻み (0-5, 5-10, ... 55-60)
  // 生年盤の中宮支の自身の方位から時計回りで巡る
  //   主方位 (N/E/S/W): 1スロット (5年)
  //   隅方位 (NW/NE/SW/SE): 2スロット (10年)
  //   - 主方位の支 (子/卯/午/酉): 自身の方位から開始
  //   - 隅方位 "earlier" (丑/辰/未/戌): 自身の隅から開始、2スロット消化
  //   - 隅方位 "later" (寅/巳/申/亥): 自身の隅から開始、1スロットのみ消化
  //     残り11スロットを時計回り、終端で同じ隅にもう1スロット
  function compute60YearFlowTable(birthDate) {
    const SolarTerms = global.SolarTerms;
    const Kyusei = global.Kyusei;
    const Eto = global.Eto;
    const bSM = SolarTerms.getSetsuMonth(birthDate);
    const bYearEto = Eto.getYearEto(bSM.setsuYear);
    const bYearCenter = Kyusei.getYearStar(bSM.setsuYear);
    const bYearBranchIdx = bYearEto.branchIdx;

    const BRANCH_NATURAL_POS = [1, 2, 2, 5, 8, 8, 7, 6, 6, 3, 0, 0];
    // CW順 (S→SW→W→NW→N→NE→E→SE)
    const CW_ORDER = [7, 6, 3, 0, 1, 2, 5, 8];
    const IS_CARDINAL = { 1: true, 3: true, 5: true, 7: true };
    // 隅方位の支のうち、"later" (時計回り順で対応する隅の後にくる) を判定
    //   寅=2, 巳=5, 申=8, 亥=11
    const LATER_CORNER = new Set([2, 5, 8, 11]);
    // 主方位の支 (cardinal): 子=0, 卯=3, 午=6, 酉=9
    const CARDINAL_BRANCH = new Set([0, 3, 6, 9]);

    const naturalPos = BRANCH_NATURAL_POS[bYearBranchIdx];
    const isCardinalBranch = CARDINAL_BRANCH.has(bYearBranchIdx);
    const isLater = LATER_CORNER.has(bYearBranchIdx);
    // 開始位置は常に「中宮支の自身の方位」
    const startPos = naturalPos;
    let startIdx = CW_ORDER.indexOf(startPos);
    if (startIdx < 0) startIdx = 0;

    // 12 スロット生成
    const positions = [];
    if (!isCardinalBranch && isLater) {
      // 隅"later": 1スロット → 残り7位置 → 同じ隅に1スロット
      positions.push(startPos);
      for (let i = 1; i < 8; i++) {
        const pos = CW_ORDER[(startIdx + i) % 8];
        positions.push(pos);
        if (!IS_CARDINAL[pos]) positions.push(pos);
      }
      positions.push(startPos);
    } else {
      // 主方位 または 隅"earlier": フル巡回
      for (let i = 0; i < 8; i++) {
        const pos = CW_ORDER[(startIdx + i) % 8];
        positions.push(pos);
        if (!IS_CARDINAL[pos]) positions.push(pos);
      }
    }
    // positions.length === 12

    // 生年盤を描画材料に
    const stars = Kyusei.getPositionStars(bYearCenter);
    const POSITION_TO_KYU_NAME = ['乾宮','坎宮','艮宮','兌宮','中宮','震宮','坤宮','離宮','巽宮'];
    const DEFAULT_POSITION_STARS = [6, 1, 8, 7, 5, 3, 2, 9, 4];
    // 暗剣殺/破
    let ankenPos = null, haPos = null;
    if (bYearCenter !== 5) {
      ankenPos = 8 - Kyusei.findPositionOfStar(bYearCenter, 5);
    }
    haPos = 8 - BRANCH_NATURAL_POS[bYearBranchIdx];
    // 動的支配置 (年盤は陽遁)
    function dynBranch(posIdx) {
      const defStar = DEFAULT_POSITION_STARS[posIdx];
      const offset = ((defStar - 5 + 9) % 9);
      const idx = ((bYearBranchIdx + offset) % 12 + 12) % 12;
      return Eto.BRANCHES[idx];
    }

    return positions.map((pos, i) => {
      const ageStart = i * 5;
      const ageEnd   = ageStart + 5;
      const star = stars[pos];
      return {
        ageStart, ageEnd,
        positionIdx: pos,
        kyu: POSITION_TO_KYU_NAME[pos],
        star,
        starName: Kyusei.STAR_NAMES[star],
        branch: dynBranch(pos),
        anken: pos === ankenPos,
        ha:    pos === haPos
      };
    });
  }

  // 流年法 60年: 与えられた支(branchIdx)から、各方位(positionIdx 0-8)に
  // 該当する開始年齢のリストを返す。中宮(4)は含まれない。
  //   例: { 0: [0, 5], 1: [10], 2: [15, 20], ... }
  function computeRyunenAgesByPosition(branchIdx) {
    const BRANCH_NATURAL_POS = [1, 2, 2, 5, 8, 8, 7, 6, 6, 3, 0, 0];
    const CW_ORDER = [7, 6, 3, 0, 1, 2, 5, 8];
    const IS_CARDINAL = { 1: true, 3: true, 5: true, 7: true };
    const LATER_CORNER = new Set([2, 5, 8, 11]);
    const CARDINAL_BRANCH = new Set([0, 3, 6, 9]);

    const naturalPos = BRANCH_NATURAL_POS[branchIdx];
    const isCardinalBranch = CARDINAL_BRANCH.has(branchIdx);
    const isLater = LATER_CORNER.has(branchIdx);
    const startPos = naturalPos;
    let startIdx = CW_ORDER.indexOf(startPos);
    if (startIdx < 0) startIdx = 0;

    const positions = [];
    if (!isCardinalBranch && isLater) {
      positions.push(startPos);
      for (let i = 1; i < 8; i++) {
        const pos = CW_ORDER[(startIdx + i) % 8];
        positions.push(pos);
        if (!IS_CARDINAL[pos]) positions.push(pos);
      }
      positions.push(startPos);
    } else {
      for (let i = 0; i < 8; i++) {
        const pos = CW_ORDER[(startIdx + i) % 8];
        positions.push(pos);
        if (!IS_CARDINAL[pos]) positions.push(pos);
      }
    }

    const map = {};
    positions.forEach((pos, i) => {
      if (!map[pos]) map[pos] = [];
      map[pos].push(i * 5);
    });
    return map;
  }

  // 流年法 60年: 外周12箇所（4隅 + 8 接点）に 5刻みの歳を返す。
  // 周回順序 (perimeter index, 時計回り NW隅 起点):
  //   0: NW隅, 1: 北辺-左接点, 2: 北辺-右接点, 3: NE隅,
  //   4: 東辺-上接点, 5: 東辺-下接点, 6: SE隅,
  //   7: 南辺-右接点, 8: 南辺-左接点, 9: SW隅,
  //   10: 西辺-下接点, 11: 西辺-上接点
  // 0歳は中宮支の「元々の宮」(自然位置) から始まり、時計回りに 5,10,...,55
  // 理論座標 (北上): 亥→NW隅(乾), 子→NW-N間(坎入口), 丑→N-NE間, 寅→NE隅(艮),
  //                 卯→NE-E間, 辰→E-SE間, 巳→SE隅(巽), 午→SE-S間,
  //                 未→S-SW間, 申→SW隅(坤), 酉→SW-W間, 戌→W-NW間(乾入口)
  // 盤は 180°回転表示 (南上・北下) のため、CSS座標では +6 シフト
  // CSS perim = (branchIdx + 1 + 6) mod 12 = (branchIdx + 7) mod 12
  function computeRyunenAgesOnPerimeter(branchIdx) {
    if (typeof branchIdx !== 'number') return null;
    const startIdx = (branchIdx + 7) % 12;
    const ages = {};
    for (let j = 0; j < 12; j++) {
      const perimIdx = (startIdx + j) % 12;
      ages[perimIdx] = j * 5;
    }
    return ages;
  }

  global.Kantei = {
    computeKantei,
    compute60YearFlow,
    compute60YearFlowTable,
    computeYearFlowDetail,
    computeRyunenAgesByPosition,
    computeRyunenAgesOnPerimeter
  };
})(typeof window !== 'undefined' ? window : globalThis);
