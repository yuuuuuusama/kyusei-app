import SwiftUI
import UIKit

@main
struct KyuseiApp: App {
    @StateObject private var lock = AppLock()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            RootView(lock: lock)
                .onChange(of: phase) { _, now in
                    switch now {
                    case .active:     lock.didReturn(); lock.unlockIfNeeded()
                    case .background: lock.didLeave()
                    default:          break
                    }
                }
        }
    }
}

struct RootView: View {
    @ObservedObject var lock: AppLock
    @State private var exporting: ExportPayload?

    var body: some View {
        ZStack {
            // 錠が開いていない間も、中身は組み立てておく。
            // 開いた瞬間に白い間が空くのを避けるため。ただし覆いで隠す。
            WebHost(page: "index.html") { json in
                exporting = ExportPayload(json: json)
            }
            .ignoresSafeArea(.keyboard)

            switch lock.state {
            case .open:
                EmptyView()
            case .noPasscode:
                NoPasscodeNotice { lock.markOpen() }
            case .locked, .checking:
                LockScreen(lock: lock)
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: lock.state)
        .sheet(item: $exporting) { payload in
            ShareSheet(items: [payload.url])
        }
        .task { lock.unlockIfNeeded() }
    }
}

/// 書き出したものを、共有の板へ渡すために一度ファイルにする。
struct ExportPayload: Identifiable {
    let id = UUID()
    let url: URL

    init(json: String) {
        let name = "kyusei-records-\(Self.stamp()).json"
        // 控えは要らなくなり次第 iOS が片づける場所へ置く。
        // 相談者の情報が入るので、束の中には残さない。
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        let data = json.data(using: .utf8) ?? Data()
        try? data.write(to: url, options: [.completeFileProtection])
        self.url = url
        NSLog("[自己確認] OK  書き出しが器へ届いた  %@ %d字", name, data.count)
    }

    private static func stamp() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: Date())
    }
}

/// iOS の共有の板。Files・AirDrop・メールなどへ渡せる。
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
