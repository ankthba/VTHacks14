import SwiftUI

/// Matches the web app's palette. High contrast and large type by intent: the
/// reader may be elderly or low-vision, and the sheet gets read at arm's length.
enum Theme {
    /// Granola-inspired: warm neutrals rather than blue-greys, deep olive as the
    /// action colour. Severity colours stay semantic and are only warmed to sit
    /// in the palette - a warning that reads as decoration is a broken warning.
    /// Every pairing below clears WCAG AA against its own surface.
    static let background = Color(hex: 0xF3EEE4)
    static let surface = Color(hex: 0xFAF7F1)
    static let surfaceWarm = Color(hex: 0xEBE5D8)
    static let foreground = Color(hex: 0x2A2520)
    static let foregroundDeep = Color(hex: 0x1F1B17)
    static let muted = Color(hex: 0x675D51)
    static let line = Color(hex: 0xD8CFBF)
    static let lineSoft = Color(hex: 0xE6DFD2)

    static let accent = Color(hex: 0x8FB257)
    static let accentInk = Color(hex: 0xF3EEE4)
    static let lime = Color(hex: 0xC4D9A0)
    static let accentText = Color(hex: 0x4B6A26)

    static let high = Color(hex: 0x9A2F1E)
    static let highBG = Color(hex: 0xF8E9E3)
    static let moderate = Color(hex: 0x7F5D0A)
    static let moderateBG = Color(hex: 0xF6EFDB)
    static let ok = Color(hex: 0x3F6335)
    static let okBG = Color(hex: 0xE6EFDB)

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

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
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
            .background(Theme.foregroundDeep)
    }
}
