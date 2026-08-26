import LocalAuthentication
import SwiftUI

/// 錠。
///
/// 鑑定の記録には、相談者の氏名・生年月日・お話が入る。端末を人に手渡した
/// とき、そのまま開けては困る。Face ID（無ければパスコード）で一度確かめる。
///
/// 端末に何の錠も掛かっていない場合は、確かめようが無いので素通しにする。
/// そのときは、錠を掛けるよう画面で促す。
@MainActor
final class AppLock: ObservableObject {

    enum State: Equatable {
        case locked          // まだ確かめていない
        case checking        // 確かめている最中
        case open            // 通ってよい
        case noPasscode      // 端末に錠が無い。素通しだが促す
    }

    @Published private(set) var state: State = .locked
    @Published private(set) var lastError: String?

    /// 錠を使うかどうか。使い手が切ることもできる。
    @AppStorage("kyusei.useLock") var useLock: Bool = true

    /// 表へ戻ってから、これだけ経っていたら掛け直す。
    /// すぐに掛け直すと、書き出しの板を出しただけで閉まって煩わしい。
    private static let graceSeconds: TimeInterval = 60
    private var leftAt: Date?

    func unlockIfNeeded() {
        guard useLock else { state = .open; return }
        guard state == .locked else { return }
        authenticate()
    }

    func authenticate() {
        let context = LAContext()
        context.localizedFallbackTitle = "パスコードを使う"

        var problem: NSError?
        // 生体が無い端末もあるので、パスコードまで含めて確かめる
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &problem) else {
            // 端末に錠が掛かっていない。確かめる術が無い。
            state = .noPasscode
            lastError = problem?.localizedDescription
            return
        }

        state = .checking
        context.evaluatePolicy(
            .deviceOwnerAuthentication,
            localizedReason: "鑑定の記録を開きます"
        ) { [weak self] ok, error in
            Task { @MainActor in
                guard let self else { return }
                if ok {
                    self.state = .open
                    self.lastError = nil
                } else {
                    self.state = .locked
                    self.lastError = (error as NSError?)?.code == LAError.userCancel.rawValue
                        ? nil : error?.localizedDescription
                }
            }
        }
    }

    /// 端末に錠が無い旨を読んだうえで、そのまま使うことにした
    func markOpen() {
        state = .open
    }

    /// 表から引っ込んだ
    func didLeave() {
        guard useLock else { return }
        leftAt = Date()
    }

    /// 表へ戻った
    func didReturn() {
        guard useLock, state == .open else { return }
        guard let leftAt else { return }
        if Date().timeIntervalSince(leftAt) >= Self.graceSeconds {
            state = .locked
        }
        self.leftAt = nil
    }
}

/// 錠が開くまで出しておく覆い。中身を覗かせない。
struct LockScreen: View {
    @ObservedObject var lock: AppLock

    var body: some View {
        ZStack {
            Color(red: 0x1A/255, green: 0x12/255, blue: 0x0B/255)
                .ignoresSafeArea()

            VStack(spacing: 22) {
                Image("temple-crest-mark")
                    .resizable()
                    .renderingMode(.template)
                    .scaledToFit()
                    .frame(width: 72, height: 72)
                    .foregroundStyle(Color(red: 0xB8/255, green: 0x92/255, blue: 0x4A/255))
                    .opacity(0.9)

                Text("干支九星気学")
                    .font(.system(size: 17, weight: .semibold))
                    .tracking(4)
                    .foregroundStyle(Color(red: 0xED/255, green: 0xE3/255, blue: 0xCC/255))

                if lock.state == .checking {
                    ProgressView().tint(Color(red: 0xB8/255, green: 0x92/255, blue: 0x4A/255))
                } else {
                    Text("鑑定の記録には、ご相談者さまの\nお名前とお話が入っています。")
                        .font(.system(size: 12))
                        .multilineTextAlignment(.center)
                        .lineSpacing(5)
                        .foregroundStyle(Color(red: 0xB8/255, green: 0xA8/255, blue: 0x8A/255))

                    Button {
                        lock.authenticate()
                    } label: {
                        Text("開く")
                            .font(.system(size: 15, weight: .medium))
                            .padding(.horizontal, 34)
                            .padding(.vertical, 11)
                            .background(Color(red: 0xB8/255, green: 0x92/255, blue: 0x4A/255))
                            .foregroundStyle(Color(red: 0x1A/255, green: 0x12/255, blue: 0x0B/255))
                            .clipShape(Capsule())
                    }
                }

                if let e = lock.lastError {
                    Text(e)
                        .font(.system(size: 11))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Color(red: 0xA8/255, green: 0x62/255, blue: 0x62/255))
                        .padding(.horizontal, 40)
                }
            }
        }
    }
}

/// 端末に錠が無いときの断り。素通しはさせるが、黙ってはいない。
struct NoPasscodeNotice: View {
    let onContinue: () -> Void

    var body: some View {
        ZStack {
            Color(red: 0x1A/255, green: 0x12/255, blue: 0x0B/255).ignoresSafeArea()
            VStack(spacing: 18) {
                Text("この端末には錠が掛かっていません")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color(red: 0xED/255, green: 0xE3/255, blue: 0xCC/255))
                Text("鑑定の記録には、ご相談者さまのお名前・生年月日・\nお話が入ります。端末の［設定］から Face ID と\nパスコードを設けることをお勧めします。")
                    .font(.system(size: 12))
                    .multilineTextAlignment(.center)
                    .lineSpacing(5)
                    .foregroundStyle(Color(red: 0xB8/255, green: 0xA8/255, blue: 0x8A/255))
                Button("このまま使う", action: onContinue)
                    .font(.system(size: 14))
                    .foregroundStyle(Color(red: 0xB8/255, green: 0x92/255, blue: 0x4A/255))
                    .padding(.top, 6)
            }
            .padding(30)
        }
    }
}
