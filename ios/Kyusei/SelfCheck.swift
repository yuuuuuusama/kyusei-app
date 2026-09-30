import Foundation
import WebKit

/// 器の働きを、中から確かめる。
///
///     xcrun simctl launch --console <udid> jp.myodenji.kyusei -kyusei.selfCheck YES
///
/// 頁の受け渡し・記録の持ち越し・書き出しの口が揃っているかを見る。
/// 引数を渡さないかぎり動かない。使い手には何も起きない。
///
/// 中身（計算そのもの）は Chrome で確かめている（scripts/test-*.mjs）。
/// 束に何が入ったかは scripts/check-bundle.sh が見る。
/// ここで見るのは、器に入れたことで壊れていないか、である。
enum SelfCheck {

    static var requested: Bool {
        UserDefaults.standard.bool(forKey: "kyusei.selfCheck")
    }

    /// print では simctl の console に流れないことがある。
    /// NSLog なら端末の記録に必ず残り、--console でも拾える。
    private static func log(_ message: String) {
        NSLog("[自己確認] %@", message)
    }

    @MainActor
    static func run(on view: WKWebView) async {
        var failed = 0

        func say(_ ok: Bool, _ name: String, _ detail: String = "") {
            if !ok { failed += 1 }
            let tail = detail.isEmpty ? "" : "  " + detail
            log("\(ok ? "OK " : "NG ") \(name)\(tail)")
        }

        func js(_ code: String) async -> String {
            await withCheckedContinuation { cont in
                view.evaluateJavaScript(code) { value, error in
                    if let error {
                        cont.resume(returning: "！" + error.localizedDescription)
                    } else {
                        cont.resume(returning: String(describing: value ?? ""))
                    }
                }
            }
        }

        log("── 器の自己確認 ──")

        let title = await js("document.title")
        say(title.contains("鑑定書"), "入口の頁が出る", title)

        let origin = await js("location.origin")
        say(origin.hasPrefix("kyusei://"), "生い立ちが一つに定まる", origin)

        // 記録の持ち越し
        _ = await js("localStorage.setItem('kyusei.selfcheck','壱')")
        let back = await js("localStorage.getItem('kyusei.selfcheck')")
        say(back == "壱", "記録を書いて読める", back)

        let kept = await js("localStorage.getItem('kyusei.kept')")
        if kept == "弐" {
            say(true, "前回の起動の記録が残っている")
        } else {
            _ = await js("localStorage.setItem('kyusei.kept','弐')")
            log("·  記録を置いた。もう一度起動して、残っているか見ること")
        }

        // 計算まで通るか
        _ = await js(clickCalculate)
        try? await Task.sleep(for: .seconds(2))
        let honmei = await js("(document.getElementById('o-honmei')||{}).innerText||''")
        say(!honmei.isEmpty && honmei != "—", "計算して本命が出る", honmei)

        // 四盤のウィジェットが、鑑定書に描かれる相談日の四盤と一マスも違わないか。
        // ウィジェットと同じ道筋（JavaScriptCore で同じ JS を読む）で組み、画面の盤と比べる。
        if let engine = YonbanEngine() {
            say(true, "四盤の JS を読み込める")
            let f = DateFormatter()
            f.locale = Locale(identifier: "en_US_POSIX")
            f.timeZone = .current
            f.dateFormat = "yyyy-MM-dd'T'HH:mm"
            var compared = 0, shifted = 0, wrong = 0
            for t in yonbanTimes {
                _ = await js(setConsult(t))
                try? await Task.sleep(for: .milliseconds(400))
                let drawnJSON = await js(readBoards)
                guard let date = f.date(from: t), let mine = engine.at(date),
                      let data = drawnJSON.data(using: .utf8),
                      let drawn = try? JSONDecoder().decode([[DrawnCell]].self, from: data),
                      drawn.count == 4
                else { say(false, "四盤 \(t)", "組めない・読めない  \(drawnJSON.prefix(60))"); wrong += 1; continue }
                for (i, board) in mine.boards.enumerated() {
                    let d = drawn[i]
                    guard d.count == 9 else { say(false, "四盤 \(t) \(board.kind)盤", "\(d.count)マス"); wrong += 1; continue }
                    // 盤変化も鑑定書と同じに当てるので、四盤とも外さずに比べる
                    compared += 1
                    if board.shifted {
                        shifted += 1
                        if board.kind == "年" || board.kind == "日" || board.rawCenter == board.center {
                            wrong += 1
                            say(false, "四盤 \(t) \(board.kind)盤", "変わらないはずの盤が変わった・印が合わない")
                        }
                    }
                    for c in board.cells where d[c.pos] != DrawnCell(c) {
                        wrong += 1
                        say(false, "四盤 \(t) \(board.kind)盤 \(c.direction)",
                            "鑑定書 \(d[c.pos].text) / ウィジェット \(DrawnCell(c).text)")
                        break
                    }
                }
            }
            say(wrong == 0 && compared == yonbanTimes.count * 4 && shifted >= 12, "四盤を鑑定書と突き合わせた",
                "\(compared) 盤（うち盤変化 \(shifted)・違い \(wrong)）")
            let now = engine.at(Date())
            say(now?.boards.count == 4, "今の四盤を組める",
                now.map { $0.boards.map { "\($0.kind)\($0.centerName)" }.joined(separator: " ") } ?? "")
        } else {
            say(false, "四盤の JS を読み込める")
        }

        // 器へ渡す橋
        let bridge = await js("typeof window.__kyuseiNative")
        say(bridge == "boolean", "書き出しの橋が架かっている", bridge)
        let handler = await js("typeof window.webkit.messageHandlers.export.postMessage")
        say(handler == "function", "器が書き出しを受けられる", handler)

        // 他の頁へ行けるか。
        //
        // fetch では確かめられない。器が付ける CSP が connect-src 'none' で、
        // 外へ繋がる隙を塞いでいるため（外へ出ないことは器の狙いでもある）。
        // 使い手と同じように、実際に頁を移って確かめる。
        for (page, expect) in [("clients.html", "相談者"),
                               ("history.html", "履歴"),
                               ("privacy.html", "個人情報"),
                               ("privacy", "個人情報")] {
            _ = await js("location.href='kyusei://app/\(page)'")
            var title = ""
            for _ in 0..<20 {
                try? await Task.sleep(for: .milliseconds(250))
                title = await js("document.title")
                if title.contains(expect) { break }
            }
            say(title.contains(expect), "\(page) へ行ける", title)
        }

        // 書き出しが器まで届くか。
        // 頁の a.download は器の中では何も起きない。器が受け取って共有の板を出す。
        _ = await js("location.href='kyusei://app/history.html'")
        try? await Task.sleep(for: .seconds(2))
        _ = await js(putOneRecord)
        try? await Task.sleep(for: .milliseconds(500))
        let pressed = await js("(function(){var b=document.getElementById('btn-export'); if(!b) return 'ない'; b.click(); return 'ok';})()")
        say(pressed == "ok", "書き出しの札を押せる", pressed)
        // 届いたかどうかは ExportPayload が記録に残す（上の行のすぐ後に出る）
        try? await Task.sleep(for: .seconds(2))

        // 置いた記録は片づける。試験の跡を残さない。
        _ = await js("Storage.remove('selfcheck-1'); localStorage.removeItem('kyusei.selfcheck')")

        // 入口へ戻す
        _ = await js("location.href='kyusei://app/index.html'")
        try? await Task.sleep(for: .seconds(2))
        let backHome = await js("document.title")
        say(backHome.contains("鑑定書"), "入口へ戻れる", backHome)

        log(failed == 0 ? "── すべて通りました ──" : "── 通らなかったもの \(failed)件 ──")
    }

    /// 四盤を突き合わせる日時。陽遁・陰遁、23 時（翌日の日干）、立春・節入りの前後、遁の切り替わりの前後。
    /// 後の段は盤変化が起きる日時（年月・月日・日時・月日時・年月日の重なり、五黄の変化、対冲が逆の隣と被る定位）。
    private static let yonbanTimes = [
        "2026-09-29T10:30", "2026-09-29T23:15", "2026-09-30T00:10", "2026-06-21T12:00", "2026-12-22T05:00",
        "2026-02-03T20:00", "2026-02-04T08:00", "2026-02-05T08:00", "2027-01-05T12:00", "2027-01-06T12:00",
        "2025-07-15T16:40", "2025-12-31T22:59", "2030-03-05T09:00", "2031-08-08T13:00", "2019-05-01T00:00",
        // 年月 重なり（一白が対冲の九紫でなく定位の五黄へ）・月日・日時・月日時・年月日
        "2026-09-08T10:30", "2026-09-09T14:30", "2026-01-07T10:30", "2026-01-01T10:30", "2026-11-11T14:30",
        "2026-09-16T10:30",
        // 五黄の時盤（陽遁は八白、陰遁は二黒）・2029〜2030 年
        "2027-01-07T02:20", "2027-06-18T20:20", "2029-03-03T10:30", "2029-07-05T10:30", "2030-05-04T10:30",
        "2030-10-04T10:30",
    ]

    /// 生年月日は固定し、相談日時だけを替えて計算させる
    private static func setConsult(_ t: String) -> String {
        """
        (function(){var b=document.getElementById('f-birth'),c=document.getElementById('f-consult');
          b.value='1970-05-15T10:00'; b.dispatchEvent(new Event('dt-picker-set'));
          c.value='\(t)'; c.dispatchEvent(new Event('dt-picker-set'));
          document.getElementById('btn-compute').click(); return 'ok';})()
        """
    }

    /// 相談日の四盤を画面から読む。drawBan は 南東,南,南西,東,中,西,北東,北,北西（宮 8→0）の順に置く
    private static let readBoards = """
    (function(){
      return JSON.stringify(['ban-y','ban-m','ban-d','ban-h'].map(function(id){
        var out=[];
        [].slice.call(document.querySelectorAll('#'+id+' .ban-cell-inner')).forEach(function(c,i){
          out[8-i]={star:(c.querySelector('.star')||{}).textContent||'', eto:(c.querySelector('.eto')||{}).textContent||'',
                    anken:!!c.querySelector('.mark.anken'), ha:!!c.querySelector('.mark.ha')};
        });
        return out;
      }));
    })()
    """

    /// 画面の盤の一マス
    private struct DrawnCell: Decodable, Equatable {
        let star: String
        let eto: String
        let anken: Bool
        let ha: Bool

        init(_ c: Yonban.Cell) { star = c.starName; eto = c.eto; anken = c.anken; ha = c.ha }

        var text: String { "\(star)\(eto)\(anken ? "ア" : "")\(ha ? "ハ" : "")" }
    }

    /// 書き出しを試すための一件。終わったら片づける。
    private static let putOneRecord = """
    Storage.upsert({
      id: 'selfcheck-1', name: '試 太郎', gender: '男', age: '56',
      topic: '確かめ', consult: '2026-08-26', birth: '1970-05-15',
      handan: { honnin: '', nengetsu: '', naizou: '', sougou: '' }
    })
    """

    /// 「計算する」を押す
    private static let clickCalculate = """
    (function () {
      var b = [].slice.call(document.querySelectorAll('button'))
                .filter(function (x) { return /計算/.test(x.textContent); })[0];
      if (b) { b.click(); return 'ok'; }
      return 'ボタンが無い';
    })()
    """

}
