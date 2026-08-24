// form-ui.js
// 入力欄のうち、素の HTML では出せない挙動だけを受け持つ。
//
// 性別のセグメント: 見た目はボタン3つだが、値を持っているのは今までどおり
// <select id="f-gender">。保存・読み込み・新規のコードは一切変えずに済む。

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.seg[data-target]').forEach(setupSegment);
  });

  function setupSegment(seg) {
    const sel = document.getElementById(seg.dataset.target);
    if (!sel) return;
    const btns = Array.from(seg.querySelectorAll('.seg-btn'));

    // select の値 → ボタンの選択状態
    function paint() {
      const v = sel.value || '';
      btns.forEach(b => {
        const on = (b.dataset.v || '') === v;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
    }

    // ボタン → select。change を出して既存の再計算にも乗せる
    function pick(b) {
      sel.value = b.dataset.v || '';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      paint();
    }

    btns.forEach(b => b.addEventListener('click', () => pick(b)));

    // 左右キーで隣へ
    seg.addEventListener('keydown', e => {
      const i = btns.findIndex(b => b.classList.contains('is-on'));
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = btns[(i + 1) % btns.length];
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   next = btns[(i - 1 + btns.length) % btns.length];
      if (!next) return;
      e.preventDefault();
      pick(next);
      next.focus();
    });

    // 履歴の読み込みや「新規」は sel.value に直接代入するだけでイベントを出さない。
    // この select に限って代入を捕まえ、ボタンの側を追従させる。
    const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (desc && desc.get && desc.set) {
      Object.defineProperty(sel, 'value', {
        configurable: true,
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, v); paint(); }
      });
    }
    sel.addEventListener('change', paint);

    paint();
  }
})();
