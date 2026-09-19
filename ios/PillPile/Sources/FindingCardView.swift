import SwiftUI

struct FindingCardView: View {
    let finding: Finding

    var body: some View {
        let tone = Theme.severityColor(finding.severity)

        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text(Theme.severityWord(finding.severity))
                    .font(.caption2.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(tone, in: RoundedRectangle(cornerRadius: 5))

                // The provenance badge is the project's whole thesis, so it sits
                // on every card rather than in a footnote.
                Text(finding.isArithmetic ? "computed — no model involved" : "found in FDA label text")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(tone)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .overlay(
                        RoundedRectangle(cornerRadius: 5)
                            .stroke(tone.opacity(0.4), lineWidth: 1)
                    )
                Spacer(minLength: 0)
            }

            Text(finding.headline)
                .font(.headline)
                .foregroundStyle(tone)
                .fixedSize(horizontal: false, vertical: true)

            Text(finding.detail)
                .font(.callout)
                .foregroundStyle(Theme.foreground)
                .fixedSize(horizontal: false, vertical: true)

            if let quote = finding.quote, !quote.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("“\(quote)”")
                        .font(.callout.italic())
                        .fixedSize(horizontal: false, vertical: true)
                    Text("quoted from the FDA label")
                        .font(.caption2)
                        .foregroundStyle(Theme.muted)
                }
                .padding(.leading, 10)
                .overlay(alignment: .leading) {
                    Rectangle().fill(tone).frame(width: 3)
                }
            }

            if !finding.citations.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(finding.citations, id: \.self) { c in
                        if let u = URL(string: c.url) {
                            Link(c.label, destination: u)
                                .font(.footnote)
                                .foregroundStyle(Theme.accent)
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.severityBG(finding.severity), in: RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(tone.opacity(0.28), lineWidth: 1)
        )
    }
}
