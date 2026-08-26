import SwiftUI
import WebKit

/// 同梱した鑑定アプリを収める WKWebView。
///
/// file:// では読み込めない。同じ生い立ち（origin）と見なされず、
/// localStorage も service worker も封じられるためである。
/// そこで自前の道筋（kyusei://）を立て、束の中の web/ から読み出す。
///
/// 記録は WKWebView の保存領域に残る。これは app の入れ物の中にあり、
/// Safari のように期限で捨てられることはない。端末の暗号化も掛かる。
struct WebHost: UIViewRepresentable {
    /// 開く頁（web/ からの相対）
    let page: String
    /// 書き出しを頼まれたときに呼ばれる
    let onExport: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onExport: onExport) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: KyuseiScheme.name)

        // 記録を残すため、必ず持ち越す入れ物を使う（既定でもそうだが明示する）
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        // 書き出しを器の側で受ける。Files や AirDrop へ渡せるようにするため。
        config.userContentController.add(context.coordinator, name: "export")
        config.userContentController.addUserScript(WKUserScript(
            source: Self.bridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        ))

        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = false
        view.scrollView.contentInsetAdjustmentBehavior = .always
        // 端の余白を和紙色で埋める。白が覗くと器の中とは見えない。
        view.isOpaque = false
        view.backgroundColor = UIColor(red: 0xF6/255, green: 0xEF/255, blue: 0xE0/255, alpha: 1)
        view.scrollView.backgroundColor = view.backgroundColor

        view.load(URLRequest(url: KyuseiScheme.url(for: page)))

        // 引数で頼まれたときだけ、器の働きを自ら確かめる（SelfCheck.swift）
        if SelfCheck.requested {
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(3))
                await SelfCheck.run(on: view)
            }
        }
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    /// 頁の側から器へ渡す口。
    ///
    /// 履歴の書き出しは a.download で行っているが、器の中では何も起きない。
    /// 押されたことを器が受け取り、共有の板を出す。
    private static let bridgeScript = """
    (function () {
      window.__kyuseiNative = true;
      // 書き出しの札を、器へ渡す形に差し替える
      document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest && e.target.closest('#btn-export');
        if (!a) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        try {
          window.webkit.messageHandlers.export.postMessage(Storage.exportJSON());
        } catch (err) {
          console.warn('書き出せません', err);
        }
      }, true);
    })();
    """

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private let onExport: (String) -> Void
        init(onExport: @escaping (String) -> Void) { self.onExport = onExport }

        func userContentController(_ controller: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "export", let json = message.body as? String else { return }
            onExport(json)
        }

        /// 外の行き先（電話・メールなど）は器の外へ渡す。
        /// 束の中の頁は、そのまま中で開く。
        func webView(_ webView: WKWebView,
                     decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.allow); return }
            if url.scheme == KyuseiScheme.name {
                decisionHandler(.allow)
                return
            }
            decisionHandler(.cancel)
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            }
        }
    }
}

// MARK: - 束の中を読む道筋

enum KyuseiScheme {
    static let name = "kyusei"
    /// 生い立ちを一つに保つ。localStorage はここに紐づく。
    static let host = "app"

    static func url(for page: String) -> URL {
        URL(string: "\(name)://\(host)/\(page)")!
    }
}

/// kyusei://app/… を、束の web/ の中身で返す。
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    /// 同梱した鑑定アプリの置き場
    private static var root: URL? {
        Bundle.main.url(forResource: "web", withExtension: nil)
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url,
              let root = Self.root else {
            task.didFailWithError(Self.error("同梱した鑑定アプリが見あたりません"))
            return
        }

        // 頁の指定が無ければ入口を返す
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }

        // 束の外へ出させない。.. を含む道は受け付けない。
        let cleaned = (path as NSString).standardizingPath
        guard !cleaned.contains("..") else {
            task.didFailWithError(Self.error("道筋が正しくありません"))
            return
        }

        let file = root.appendingPathComponent(String(cleaned.dropFirst()))
        guard let data = try? Data(contentsOf: file) else {
            // 拡張子の無い道（/privacy など）は .html を補って探す
            let withHTML = root.appendingPathComponent(String(cleaned.dropFirst()) + ".html")
            if let data = try? Data(contentsOf: withHTML) {
                Self.respond(task: task, url: url, data: data, path: withHTML.path)
                return
            }
            task.didFailWithError(Self.error("見つかりません: \(cleaned)"))
            return
        }
        Self.respond(task: task, url: url, data: data, path: file.path)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func respond(task: WKURLSchemeTask, url: URL, data: Data, path: String) {
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mime(for: path),
                "Content-Length": String(data.count),
                // 束の中のものしか読まないので、外へ繋がる隙を塞ぐ
                "Content-Security-Policy":
                    "default-src 'self' kyusei: 'unsafe-inline' data: blob:; connect-src 'none'",
            ]
        )!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    private static func mime(for path: String) -> String {
        switch (path as NSString).pathExtension.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "js": return "application/javascript; charset=utf-8"
        case "json", "webmanifest": return "application/json; charset=utf-8"
        case "png": return "image/png"
        case "svg": return "image/svg+xml"
        case "woff2": return "font/woff2"
        default: return "application/octet-stream"
        }
    }

    private static func error(_ message: String) -> NSError {
        NSError(domain: "jp.myodenji.kyusei", code: 404,
                userInfo: [NSLocalizedDescriptionKey: message])
    }
}
