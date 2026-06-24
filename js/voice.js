// voice.js — Web Speech API (SpeechRecognition) ラッパー
//   targetEl.value のカーソル位置に音声テキストを差し込む。
//   start で開始、stop で停止。connect で textarea に紐付け。
(function (global) {
  'use strict';
  const SR = global.SpeechRecognition || global.webkitSpeechRecognition;

  function isSupported() { return !!SR; }

  // textarea にバインド。stateChange(state) で 'recording' | 'stopped' | 'error' を通知
  function bind(textarea, onState) {
    if (!SR) return null;
    let rec = null;
    let baseValue = '';
    let insertAt = 0;
    let finalText = '';

    function start() {
      if (rec) return;
      try {
        rec = new SR();
      } catch (e) { onState && onState('error', e.message); return; }
      rec.lang = 'ja-JP';
      rec.continuous = true;
      rec.interimResults = true;

      baseValue = textarea.value;
      insertAt = (typeof textarea.selectionStart === 'number')
        ? textarea.selectionStart : baseValue.length;
      // 既に末尾でない位置に挿入する場合は前後に改行を入れる調整は呼び出し側に任せる
      finalText = '';

      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interim += result[0].transcript;
        }
        const merged = baseValue.slice(0, insertAt) + finalText + interim + baseValue.slice(insertAt);
        textarea.value = merged;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      };
      rec.onerror = (e) => { onState && onState('error', e.error || ''); };
      rec.onend = () => {
        const merged = baseValue.slice(0, insertAt) + finalText + baseValue.slice(insertAt);
        textarea.value = merged;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        rec = null;
        onState && onState('stopped');
      };
      try {
        rec.start();
        onState && onState('recording');
      } catch (e) {
        rec = null;
        onState && onState('error', e.message);
      }
    }

    function stop() {
      if (rec) { try { rec.stop(); } catch (e) {} }
    }

    function toggle() {
      if (rec) stop(); else start();
    }

    function isRecording() { return !!rec; }

    return { start, stop, toggle, isRecording };
  }

  global.Voice = { isSupported, bind };
})(typeof window !== 'undefined' ? window : globalThis);
