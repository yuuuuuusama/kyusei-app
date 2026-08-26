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
