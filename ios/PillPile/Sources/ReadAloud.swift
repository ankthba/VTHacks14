import AVFoundation
import SwiftUI

/// Read-aloud using the system speech synthesiser.
///
/// The web app calls ElevenLabs and falls back to browser speech; on iOS the
/// platform voice is already high quality, works with no key, and keeps working
/// with no network at all. For the accessibility case this is the better
/// answer, not the cheaper one.
@MainActor
final class Speaker: NSObject, ObservableObject {
    @Published private(set) var isSpeaking = false
    private let synth = AVSpeechSynthesizer()

    override init() {
        super.init()
        synth.delegate = self
    }

    func toggle(_ text: String, language: String) {
        if isSpeaking {
            synth.stopSpeaking(at: .immediate)
            isSpeaking = false
            return
        }
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
        try? AVAudioSession.sharedInstance().setActive(true)

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language)
        // Slower than default - this is being read to someone, not skimmed.
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        synth.speak(utterance)
        isSpeaking = true
    }
}

extension Speaker: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didFinish utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in self.isSpeaking = false }
    }

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didCancel utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in self.isSpeaking = false }
    }
}
