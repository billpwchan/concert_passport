import SwiftUI
import UIKit

enum PassportTheme {
    static let ink = Color(uiColor: .systemBackground)
    static let panel = Color(uiColor: .secondarySystemBackground)
    static let raised = Color(uiColor: .tertiarySystemBackground)
    static let line = Color(uiColor: .separator)
    static let strongLine = Color(uiColor: .label).opacity(0.72)
    static let text = Color(uiColor: .label)
    static let muted = Color(uiColor: .secondaryLabel)
    static let faint = Color(uiColor: .tertiaryLabel)
    static let violet = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.61, green: 0.59, blue: 1, alpha: 1)
            : UIColor(red: 0.26, green: 0.22, blue: 0.79, alpha: 1)
    })
    static let mint = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.41, green: 0.76, blue: 0.57, alpha: 1)
            : UIColor(red: 0.09, green: 0.47, blue: 0.31, alpha: 1)
    })
    static let amber = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.89, green: 0.63, blue: 0.44, alpha: 1)
            : UIColor(red: 0.60, green: 0.29, blue: 0.07, alpha: 1)
    })
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
            .padding(.vertical, 20)
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PassportTheme.panel)
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .stroke(PassportTheme.line, lineWidth: 1)
            }
    }
}

struct Eyebrow: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.caption2.monospaced().weight(.semibold))
            .tracking(1.2)
            .foregroundStyle(PassportTheme.violet)
    }
}

extension Date {
    func venueLabel(timeZoneIdentifier: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.timeZone = TimeZone(identifier: timeZoneIdentifier)
        formatter.setLocalizedDateFormatFromTemplate("dMMMdjmm")
        return formatter.string(from: self)
    }
}
