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

  // 鑑定法.docx の盤変化ルール (最新仕様)
  // 日盤(d)は絶対変えない
  //   - 年月日 三つ同じ → 月→定盤(5)
  //   - 月日時 三つ同じ → 月→定盤(5), 時→定盤対冲(10-X)
  //   - 年月 同じ → 月→定盤(5), 日盤と被るなら 10-X
  //   - 月日 同じ → 月→定盤(5), 年盤と被るなら 10-X
  //   - 日時 同じ → 時→定盤対冲(10-X)
  function transformCenters(y, m, d, h) {
    let M = m, H = h;
    let modified = false;
    // 月 transformation
    if (m === d && d === h) {
      // 月日時 三つ同じ
      M = 5;
      modified = true;
    } else if (y === m && m === d) {
      // 年月日 三つ同じ
      M = 5;
      modified = true;
    } else if (y === m) {
      // 年月同じ: 月→定盤(5)、日盤と被るなら 対冲 (10-m)
      M = (d === 5 && m !== 5) ? (10 - m) : 5;
      modified = true;
    } else if (m === d) {
      // 月日同じ: 月→定盤(5)、年盤と被るなら 対冲 (10-m)
      M = (y === 5 && m !== 5) ? (10 - m) : 5;
      modified = true;
    }
    // 時 transformation: 日時同じ (月日時 三つ同じ含む)
    if (d === h) {
      H = (h === 5) ? h : (10 - h);
      modified = true;
    }
    // 日 never changes (日盤絶対)
    return { year: y, month: M, day: d, hour: H, modified };
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
    const cTransformPre = transformCenters(cYearCenter, cMonthCenter, cDayCenter, cHourCenter);
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

    // boardCenter の盤上で、posIdx の宮の情報を返す
    // isInton: その盤が陰遁逆運行を適用するか (日盤・時盤のみ)
    function describeOnBoard(boardCenter, periodBranchIdx, posIdx, isInton) {
      const stars = Kyusei.getPositionStars(boardCenter);
      const star = stars[posIdx];
      const isCenter = posIdx === 4;
      return {
        kyu: isCenter ? '中宮' : Kyusei.POSITION_TO_KYU_NAME[posIdx],
        direction: isCenter ? '中央' : Kyusei.POSITION_TO_DIRECTION[posIdx],
        branches: dynamicBranch(periodBranchIdx, posIdx, !!isInton),
        star,
        starName: Kyusei.STAR_NAMES[star],
        positionIdx: posIdx
      };
    }

    // 陰遁判定 (日盤/時盤のみ干支が逆運行)
    const cIsIntonForCells = Kyusei.isInton(consultDate);

    // 日盤での本命位置 (本命星が日盤の何宮にいるか)
    const honmeiPos = Kyusei.findPositionOfStar(cDayCenter, honmeisei);
    const dayBranchIdx = cDayEto.branchIdx;
    const honmei = describeOnBoard(cDayCenter, dayBranchIdx, honmeiPos, cIsIntonForCells);

    // 対冲宮: 日盤本命の真反対 (8 - posIdx)
    let taichu;
    if (honmeiPos === 4) {
      taichu = describeOnBoard(cDayCenter, dayBranchIdx, 4, cIsIntonForCells);
      taichu.kyu = '(中央)';
    } else {
      taichu = describeOnBoard(cDayCenter, dayBranchIdx, 8 - honmeiPos, cIsIntonForCells);
    }

    // 右宮 = 反時計回り (CCW) 隣 / 左宮 = 時計回り (CW) 隣
    let migi = null, hidari = null;
    if (honmeiPos !== 4) {
      const cwIdx = CLOCKWISE.indexOf(honmeiPos);
      migi   = describeOnBoard(cDayCenter, dayBranchIdx, CLOCKWISE[(cwIdx - 1 + 8) % 8], cIsIntonForCells);
      hidari = describeOnBoard(cDayCenter, dayBranchIdx, CLOCKWISE[(cwIdx + 1) % 8], cIsIntonForCells);
    }

    // 本宮: 本命星 X の後天定位 (固定position)
    const honguPos = Kyusei.DEFAULT_POSITION_STARS.indexOf(honmeisei);
    const hongu = describeOnBoard(cDayCenter, dayBranchIdx, honguPos, cIsIntonForCells);

    // 中宮: 日盤の中央
    const chukyu = describeOnBoard(cDayCenter, dayBranchIdx, 4, cIsIntonForCells);

    // 時 = 日盤本命位置 を 時盤 で見た時 (時盤は陰遁時、干支逆行)
    // 月 = 月盤 (常に陽遁)
    // 年 = 年盤 (常に陽遁)
    const toki  = describeOnBoard(cHourCenter,  cHourEto.branchIdx,  honmeiPos, cIsIntonForCells);
    const tsuki = describeOnBoard(cMonthCenter, cMonthEto.branchIdx, honmeiPos, false);
    const toshi = describeOnBoard(cYearCenter,  cYearEto.branchIdx,  honmeiPos, false);

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
    // 年同会: 相談年盤において、本命星が定位置にある星 (=本命宮を担当する本来の星)
    // 被同会: 相談年盤の本命星定位置に来ている星 (=本命星の定位置にある星)
    //
    // 後天定位における星の定位置:
    //   1(一白): N, 2(二黒): SW, 3(三碧): E, 4(四緑): SE,
    //   5(五黄): C, 6(六白): NW, 7(七赤): W, 8(八白): NE, 9(九紫): S
    function getDoukai(centerStar, targetStar) {
      const posOfTarget = Kyusei.findPositionOfStar(centerStar, targetStar);
      // posOfTarget の本来の星 (定位星)
      return Kyusei.DEFAULT_POSITION_STARS[posOfTarget];
    }
    function getHidoukai(centerStar, targetStar) {
      // targetStar の定位置にある星
      const defPos = Kyusei.DEFAULT_POSITION_STARS.indexOf(targetStar);
      const stars = Kyusei.getPositionStars(centerStar);
      return stars[defPos];
    }

    const toshiDoukai = getDoukai(cYearCenter, honmeisei);
    const toshiHidoukai = getHidoukai(cYearCenter, honmeisei);
    const tsukiDoukai = getDoukai(cMonthCenter, honmeisei);
    const tsukiHidoukai = getHidoukai(cMonthCenter, honmeisei);

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
    function kurakiPair(c1, b1, c2, b2, isInton1, isInton2) {
      const star = findFacingStar(c1, c2);
      if (!star) return '—';
      const pos1 = Kyusei.findPositionOfStar(c1, star);
      const pos2 = Kyusei.findPositionOfStar(c2, star);
      const cell1 = describeOnBoard(c1, b1, pos1, !!isInton1);
      const cell2 = describeOnBoard(c2, b2, pos2, !!isInton2);
      return `${cell1.kyu}${cell1.starName}${cell1.branches}ー${cell2.kyu}${cell2.starName}${cell2.branches}`;
    }
    // 鑑定書「内蔵」 = 蔵気 = 日盤(絶対) + 変換後時盤 の facing pair
    // kurakiPair(c1, b1, c2, b2, isInton1, isInton2)
    const kuraki_nengetsu = kurakiPair(
      cDayCenter,       cDayEto.branchIdx,
      transHourCenter,  cHourEto.branchIdx,
      cIsIntonForCells, cIsIntonForCells
    );
    // 蔵気月日 (判断書用) = 月盤 + 日盤
    const kuraki_getsubi = kurakiPair(
      cMonthCenter, cMonthEto.branchIdx,
      cDayCenter,   cDayEto.branchIdx,
      false, cIsIntonForCells
    );

    // ----- 宮傾斜 -----
    // 簡易解釈: 生日盤において本命星 (or 月命星) のある位置から、その「定位」と異なれば傾斜
    // ここでは「生月盤の中宮 → 月命星 が後天定位とどの宮に傾いているか」を返す
    const keishaPos = Kyusei.findPositionOfStar(cMonthCenter, honmeisei);
    const keishaKyu = honmeisei === 5 ? '中央' : Kyusei.positionToKyu(keishaPos).kyu;

    // ----- 宿命 -----
    // 宿命 = 日盤暗剣殺の位置を時盤で見た値 ー 時盤暗剣殺の位置を日盤で見た値
    // 暗剣殺 = 五黄が居るマスの真反対 (中宮=五黄の盤では存在しない)
    function shukumeiText() {
      // 日盤暗剣殺
      let dayAnkenPos = null;
      if (cDayCenter !== 5) {
        const gokoPosD = Kyusei.findPositionOfStar(cDayCenter, 5);
        dayAnkenPos = 8 - gokoPosD;
      }
      // 時盤(変換後)暗剣殺
      let hourAnkenPos = null;
      if (transHourCenter !== 5) {
        const gokoPosH = Kyusei.findPositionOfStar(transHourCenter, 5);
        hourAnkenPos = 8 - gokoPosH;
      }
      const parts = [];
      if (dayAnkenPos !== null) {
        const cell = describeOnBoard(transHourCenter, cHourEto.branchIdx, dayAnkenPos, cIsIntonForCells);
        parts.push(`${cell.kyu}${cell.starName}${cell.branches}`);
      }
      if (hourAnkenPos !== null) {
        const cell = describeOnBoard(cDayCenter, cDayEto.branchIdx, hourAnkenPos, cIsIntonForCells);
        parts.push(`${cell.kyu}${cell.starName}${cell.branches}`);
      }
      return parts.length ? parts.join('ー') : '—';
    }
    const shukumei_nengetsu = shukumeiText();

    // ----- 内蔵法 -----
    const naizou = {
      kuraki_nengetsu: kuraki_nengetsu,
      shukumei_nengetsu: shukumei_nengetsu,
      kuraki_getsubi: kuraki_getsubi,
      shukumei_getsubi: cMonthEto.name + cDayEto.name
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

    // 生年月日側の盤変化
    const bTransform = transformCenters(
      Kyusei.getYearStar(bSM.setsuYear),
      Kyusei.getMonthStar(bYearEto.branchIdx, bSM.setsuMonth),
      bDayCenter, bHourCenter
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
        doukai: { toshi: toshiDoukai, tsuki: tsukiDoukai },
        hidoukai: { toshi: toshiHidoukai, tsuki: tsukiHidoukai },
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

  global.Kantei = {
    computeKantei,
    compute60YearFlow,
    computeYearFlowDetail
  };
})(typeof window !== 'undefined' ? window : globalThis);
