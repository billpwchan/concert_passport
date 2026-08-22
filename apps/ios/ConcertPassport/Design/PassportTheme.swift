import SwiftUI

enum PassportTheme {
    static let ink = Color(hex: "0B0B12")
    static let panel = Color(hex: "15151E")
    static let raised = Color(hex: "1C1C27")
    static let line = Color.white.opacity(0.11)
    static let text = Color(hex: "F5F1FF")
    static let muted = Color(hex: "9D99AD")
    static let violet = Color(hex: "8C78FF")
    static let mint = Color(hex: "72E3CE")
    static let amber = Color(hex: "F3B960")
}

extension Color {
    init(hex: String) {
        let value = UInt64(hex, radix: 16) ?? 0
        self.init(
            .sRGB,
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255,
            opacity: 1
        )
    }
}

struct PassportCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PassportTheme.panel)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(PassportTheme.line, lineWidth: 1)
            }
    }
}

struct Eyebrow: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.caption2.weight(.bold))
            .tracking(1.8)
            .foregroundStyle(PassportTheme.violet)
    }
}

extension Date {
    func venueLabel(timeZoneIdentifier: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.timeZone = TimeZone(identifier: timeZoneIdentifier)
        formatter.dateFormat = "d MMM · HH:mm"
        return formatter.string(from: self)
    }
}
