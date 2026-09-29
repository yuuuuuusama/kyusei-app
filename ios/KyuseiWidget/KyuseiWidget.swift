import SwiftUI
import WidgetKit

/// 九星鑑定のウィジェット。
///
/// 今日の四盤（年盤・月盤・日盤・時盤）を出す。計算は鑑定アプリと同じ JS（`YonbanEngine`）。
/// 相談者の情報は一切使わない（暦だけ）。錠の掛かったアプリの記録には触れない。
@main
struct KyuseiWidgetBundle: WidgetBundle {
    var body: some Widget {
        YonbanWidget()
    }
}

// MARK: - 時刻の並び

struct YonbanEntry: TimelineEntry {
    let date: Date
    let yonban: Yonban?
}

struct YonbanProvider: TimelineProvider {
    func placeholder(in context: Context) -> YonbanEntry {
        YonbanEntry(date: Date(), yonban: YonbanEngine()?.at(Date()))
    }

    func getSnapshot(in context: Context, completion: @escaping (YonbanEntry) -> Void) {
        completion(placeholder(in: context))
    }

    /// 替わる時刻ごとに一枚（時盤は 2 時間ごと、日盤は 0 時、月盤は節入り）。24 時間分を先に組む。
    func getTimeline(in context: Context, completion: @escaping (Timeline<YonbanEntry>) -> Void) {
        let now = Date()
        guard let engine = YonbanEngine() else {
            completion(Timeline(entries: [YonbanEntry(date: now, yonban: nil)],
                                policy: .after(now.addingTimeInterval(3600))))
            return
        }
        let until = now.addingTimeInterval(24 * 3600)
        let times = [now] + engine.changes(from: now, until: until)
        let entries = times.map { YonbanEntry(date: $0, yonban: engine.at($0)) }
        completion(Timeline(entries: entries, policy: .after(times.last ?? until)))
    }
}

// MARK: - ウィジェット

struct YonbanWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "jp.myodenji.kyusei.yonban", provider: YonbanProvider()) { entry in
            YonbanWidgetView(entry: entry)
                .containerBackground(for: .widget) { YonbanBackground() }
        }
        .configurationDisplayName("今日の四盤")
        .description("年盤・月盤・日盤・時盤を出します。時盤は 2 時間ごと、月盤は節入りで替わります。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct YonbanWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme
    let entry: YonbanEntry

    private var tone: YonbanTone { YonbanTone(scheme: scheme) }

    var body: some View {
        if let y = entry.yonban, y.boards.count == 4 {
            switch family {
            case .systemSmall:  small(y)
            case .systemMedium: medium(y)
            default:            large(y)
            }
        } else {
            Text("四盤を組めませんでした。\nアプリを開き直してください。")
                .font(.system(size: 12))
                .foregroundStyle(tone.ink)
        }
    }

    // 小:一〜九だけの四盤を 2 × 2
    private func small(_ y: Yonban) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            header(y, compact: true)
            Grid(horizontalSpacing: 6, verticalSpacing: 4) {
                GridRow { labeled(y.boards[0], style: .numeral); labeled(y.boards[1], style: .numeral) }
                GridRow { labeled(y.boards[2], style: .numeral); labeled(y.boards[3], style: .numeral) }
            }
        }
    }

    // 中:四盤を一列。星の名と暗剣殺・破の色
    private func medium(_ y: Yonban) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            header(y, compact: false)
            HStack(spacing: 7) {
                ForEach(y.boards, id: \.kind) { labeled($0, style: .name) }
            }
        }
    }

    // 大:四盤を 2 × 2。星・干支・ア・ハまで
    private func large(_ y: Yonban) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            header(y, compact: false)
            Grid(horizontalSpacing: 8, verticalSpacing: 6) {
                GridRow { labeled(y.boards[0], style: .full); labeled(y.boards[1], style: .full) }
                GridRow { labeled(y.boards[2], style: .full); labeled(y.boards[3], style: .full) }
            }
            legend
        }
    }

    private func header(_ y: Yonban, compact: Bool) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(verbatim: compact ? "\(y.month)/\(y.day)" : "\(String(y.year))年\(y.month)月\(y.day)日")
                .font(.system(size: compact ? 11 : 12, weight: .semibold, design: .serif))
                .foregroundStyle(tone.ink)
            Text(y.donton)
                .font(.system(size: compact ? 9 : 10, design: .serif))
                .foregroundStyle(tone.ink.opacity(0.65))
            Spacer(minLength: 0)
            if !compact {
                Text("上が南")
                    .font(.system(size: 8.5))
                    .foregroundStyle(tone.ink.opacity(0.45))
            }
        }
        .lineLimit(1)
    }

    private func labeled(_ board: Yonban.Board, style: YonbanBoardView.Style) -> some View {
        VStack(spacing: 2) {
            HStack(spacing: 3) {
                Text(verbatim: "\(board.kind)盤")
                    .font(.system(size: style == .full ? 10 : 8.5, weight: .semibold, design: .serif))
                    .foregroundStyle(tone.kin)
                if style != .numeral {
                    Text(board.eto)
                        .font(.system(size: style == .full ? 10 : 8.5, design: .serif))
                        .foregroundStyle(tone.ink.opacity(0.7))
                }
            }
            .lineLimit(1)
            YonbanBoardView(board: board, style: style, tone: tone)
        }
        .frame(maxWidth: .infinity)
    }

    private var legend: some View {
        HStack(spacing: 10) {
            Text("ア").foregroundStyle(tone.shu).bold() + Text(" 暗剣殺").foregroundStyle(tone.ink.opacity(0.6))
            Text("ハ").foregroundStyle(tone.ai).bold() + Text(" 破").foregroundStyle(tone.ink.opacity(0.6))
            Spacer(minLength: 0)
            Text("盤変化は当てていません").foregroundStyle(tone.ink.opacity(0.4))
        }
        .font(.system(size: 8.5))
        .lineLimit(1)
    }
}

// MARK: - 一枚の盤

struct YonbanBoardView: View {
    enum Style { case numeral, name, full }

    let board: Yonban.Board
    let style: Style
    let tone: YonbanTone

    var body: some View {
        Grid(horizontalSpacing: 0, verticalSpacing: 0) {
            ForEach(0..<3, id: \.self) { r in
                GridRow {
                    ForEach(board.rows[r]) { cell in
                        cellView(cell)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(cell.isCenter ? tone.center : Color.clear)
                            .overlay(Rectangle().stroke(tone.line, lineWidth: 0.5))
                    }
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .overlay(Rectangle().stroke(tone.kin, lineWidth: 0.8))
    }

    @ViewBuilder
    private func cellView(_ cell: Yonban.Cell) -> some View {
        switch style {
        case .numeral:
            Text(cell.numeral)
                .font(.system(size: 10, weight: cell.isCenter ? .bold : .regular, design: .serif))
                .foregroundStyle(markColor(cell) ?? tone.ink)
                .minimumScaleFactor(0.6)
        case .name:
            Text(cell.starName)
                .font(.system(size: 8.5, weight: cell.isCenter ? .bold : .regular, design: .serif))
                .foregroundStyle(markColor(cell) ?? tone.ink)
                .minimumScaleFactor(0.5)
                .lineLimit(1)
        case .full:
            VStack(spacing: 0) {
                Text(cell.starName)
                    .font(.system(size: 11, weight: cell.isCenter ? .bold : .medium, design: .serif))
                    .foregroundStyle(tone.ink)
                Text(cell.eto)
                    .font(.system(size: 8.5, design: .serif))
                    .foregroundStyle(tone.ink.opacity(0.7))
                if cell.anken || cell.ha {
                    HStack(spacing: 2) {
                        if cell.anken { Text("ア").foregroundStyle(tone.shu) }
                        if cell.ha { Text("ハ").foregroundStyle(tone.ai) }
                    }
                    .font(.system(size: 8.5, weight: .bold))
                }
            }
            .minimumScaleFactor(0.6)
            .lineLimit(1)
        }
    }

    /// 小さい盤では字の色で見分ける（暗剣殺は朱、破は藍。両方なら朱）。
    private func markColor(_ cell: Yonban.Cell) -> Color? {
        if cell.anken { return tone.shu }
        if cell.ha { return tone.ai }
        return nil
    }
}

// MARK: - 色（鑑定アプリの css/style.css に合わせる）

struct YonbanTone {
    let paper: Color
    let ink: Color
    let line: Color
    let kin: Color
    let center: Color
    let shu: Color
    let ai: Color

    init(scheme: ColorScheme) {
        if scheme == .dark {
            paper = Color(red: 0.11, green: 0.10, blue: 0.09)
            ink = Color(red: 0.93, green: 0.90, blue: 0.84)
            line = Color(red: 0.45, green: 0.40, blue: 0.30)
            kin = Color(red: 0.80, green: 0.66, blue: 0.36)
            center = Color(red: 0.36, green: 0.29, blue: 0.13)
            shu = Color(red: 0.90, green: 0.47, blue: 0.42)
            ai = Color(red: 0.56, green: 0.69, blue: 0.80)
        } else {
            paper = Color(red: 0.984, green: 0.969, blue: 0.925)   // #fbf7ec 紙白
            ink = Color(red: 0.17, green: 0.16, blue: 0.15)
            line = Color(red: 0.66, green: 0.58, blue: 0.41)        // #a89568
            kin = Color(red: 0.62, green: 0.49, blue: 0.20)
            center = Color(red: 0.91, green: 0.83, blue: 0.58)      // 中宮の金
            shu = Color(red: 0.66, green: 0.20, blue: 0.20)         // #a83232 朱
            ai = Color(red: 0.16, green: 0.26, blue: 0.35)          // #2a4359 藍
        }
    }
}

struct YonbanBackground: View {
    @Environment(\.colorScheme) private var scheme
    var body: some View { YonbanTone(scheme: scheme).paper }
}
