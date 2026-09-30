import Foundation
import JavaScriptCore

/// その日時の四盤（年盤・月盤・日盤・時盤）。
///
/// 計算は鑑定アプリの JS（solar-terms.js・eto.js・kyusei.js・kantei.js）を JavaScriptCore でそのまま動かす。
/// Swift に写し直さないのは、写せば鑑定書とウィジェットで答えが食い違いうるため。
/// 盤の並べ方は `yonban.js`（js/app.js の drawBan と同じ決まり）。
///
/// 盤変化は鑑定書の相談日（上段）と同じに当てる（js/kantei.js の transformCenters）。
/// 年盤・日盤は変わらず、月盤・時盤が隣の盤と中宮星が重なったときに変わる。
struct Yonban: Decodable, Equatable {
    let year: Int
    let month: Int
    let day: Int
    let hour: Int
    /// 陽遁・陰遁
    let donton: String
    /// 次の節入り（月盤が替わる時刻。ミリ秒）
    let nextSetsuiri: Double?
    /// 年・月・日・時の順
    let boards: [Board]

    struct Board: Decodable, Equatable {
        /// 年・月・日・時
        let kind: String
        /// 盤変化の後の中宮星（盤に並べる星）
        let center: Int
        let centerName: String
        /// 暦のとおりの中宮星（盤変化の前）
        let rawCenter: Int
        /// 盤変化で中宮星が変わったか
        let shifted: Bool
        /// その盤の中宮の干支（年干支・月干支…）
        let eto: String
        /// 宮 0..8 = 北西, 北, 北東, 西, 中宮, 東, 南西, 南, 南東
        let cells: [Cell]

        /// 鑑定書と同じ向き（上が南）に三段で並べる。南東・南・南西 / 東・中・西 / 北東・北・北西
        var rows: [[Cell]] {
            [[cells[8], cells[7], cells[6]],
             [cells[5], cells[4], cells[3]],
             [cells[2], cells[1], cells[0]]]
        }
    }

    struct Cell: Decodable, Equatable, Identifiable {
        let pos: Int
        let star: Int
        /// 一白・二黒…
        let starName: String
        let eto: String
        /// 暗剣殺
        let anken: Bool
        /// 破（歳破・月破・日破・時破）
        let ha: Bool
        let direction: String

        var id: Int { pos }
        var isCenter: Bool { pos == 4 }
        /// 一〜九（小さい盤で使う）
        var numeral: String { String(starName.prefix(1)) }
    }
}

/// 四盤を組む。JS を一度だけ読み込み、日時を替えて何度でも組める。
final class YonbanEngine {
    /// 読み込む順（後のものが前のものを使う）
    static let scripts = ["solar-terms", "eto", "kyusei", "kantei", "yonban"]

    private let context: JSContext
    private(set) var lastError: String?

    /// JS を束から探す。アプリでは web/js/ に写してあり、ウィジェットでは束の直下にある。
    init?(bundle: Bundle = .main) {
        guard let context = JSContext() else { return nil }
        self.context = context
        var failure: String?
        context.exceptionHandler = { _, value in failure = value?.toString() }
        for name in Self.scripts {
            guard let url = bundle.url(forResource: name, withExtension: "js", subdirectory: "web/js")
                    ?? bundle.url(forResource: name, withExtension: "js"),
                  let source = try? String(contentsOf: url, encoding: .utf8)
            else {
                NSLog("[四盤] %@.js が束にありません", name)
                return nil
            }
            context.evaluateScript(source, withSourceURL: url)
            if let failure {
                NSLog("[四盤] %@.js を読めません: %@", name, failure)
                return nil
            }
        }
        context.exceptionHandler = { [weak self] _, value in self?.lastError = value?.toString() }
    }

    /// その時刻の四盤。端末の時間帯で読む（鑑定書と同じ）。
    func at(_ date: Date) -> Yonban? {
        lastError = nil
        let ms = Int64((date.timeIntervalSince1970 * 1000).rounded())
        guard let json = context.evaluateScript("JSON.stringify(Yonban.forTime(\(ms)))")?.toString(),
              lastError == nil,
              let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(Yonban.self, from: data)
    }

    /// 盤が替わる時刻の並び（`from` から `until` まで）。
    /// 時盤は奇数時、日盤は 0 時、月盤・年盤は節入りの時刻に替わる。
    func changes(from: Date, until: Date, calendar: Calendar = .current) -> [Date] {
        var out: [Date] = []
        var t = from
        while true {
            t = Self.nextHourChange(after: t, calendar: calendar)
            if t >= until { break }
            out.append(t)
        }
        let midnight = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: from) ?? from)
        if midnight < until { out.append(midnight) }
        if let ms = at(from)?.nextSetsuiri {
            let setsu = Date(timeIntervalSince1970: ms / 1000)
            if setsu > from, setsu < until { out.append(setsu) }
        }
        return Array(Set(out)).sorted()
    }

    /// 時盤は 2 時間ごと（奇数時）に替わる。`date` の後で最初に替わる時刻。
    static func nextHourChange(after date: Date, calendar: Calendar = .current) -> Date {
        let start = calendar.dateInterval(of: .hour, for: date)?.start ?? date
        let h = calendar.component(.hour, from: date)
        return calendar.date(byAdding: .hour, value: h % 2 == 0 ? 1 : 2, to: start) ?? date.addingTimeInterval(7200)
    }
}
