import SwiftUI

/// Matches the web app's palette. High contrast and large type by intent: the
/// reader may be elderly or low-vision, and the sheet gets read at arm's length.
enum Theme {
    static let background = Color(red: 0.97, green: 0.97, blue: 0.96)
    static let surface = Color.white
    static let foreground = Color(red: 0.08, green: 0.08, blue: 0.08)
    static let muted = Color(red: 0.33, green: 0.33, blue: 0.37)
    static let line = Color(red: 0.85, green: 0.85, blue: 0.83)
    static let accent = Color(red: 0.11, green: 0.31, blue: 0.85)

    static let high = Color(red: 0.64, green: 0.09, blue: 0.10)
    static let highBG = Color(red: 0.99, green: 0.94, blue: 0.94)
    static let moderate = Color(red: 0.60, green: 0.36, blue: 0.00)
    static let moderateBG = Color(red: 0.99, green: 0.96, blue: 0.92)
    static let ok = Color(red: 0.11, green: 0.42, blue: 0.25)
    static let okBG = Color(red: 0.93, green: 0.97, blue: 0.95)

    static func severityColor(_ s: String) -> Color {
        switch s {
        case "high": return high
        case "moderate": return moderate
        default: return ok
        }
    }

    static func severityBG(_ s: String) -> Color {
        switch s {
        case "high": return highBG
        case "moderate": return moderateBG
        default: return okBG
        }
    }

    static func severityWord(_ s: String) -> String {
        switch s {
        case "high": return "ASK ABOUT THIS FIRST"
        case "moderate": return "WORTH ASKING"
        default: return "MINOR"
        }
    }
}

/// On every screen and every share, exactly as on the web.
struct DisclaimerBar: View {
    var body: some View {
        Text("Educational demo. Not medical advice. Always confirm with your pharmacist or physician.")
            .font(.footnote.weight(.medium))
            .multilineTextAlignment(.center)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(Theme.foreground)
    }
}
