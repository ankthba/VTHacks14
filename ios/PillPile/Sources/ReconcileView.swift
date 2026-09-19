import SwiftUI

/// The discharge-list comparison. On a phone this reads as stacked rows rather
/// than a table, but the four outcomes stay just as blunt.
struct ReconcileView: View {
    let rows: [ReconcileRow]

    private func style(_ status: String) -> (String, Color, Color) {
        switch status {
        case "omission": return ("MISSING", Theme.high, Theme.highBG)
        case "dose_mismatch": return ("CONFLICT", Theme.high, Theme.highBG)
        case "extra": return ("EXTRA", Theme.moderate, Theme.moderateBG)
        default: return ("OK", Theme.ok, Theme.okBG)
        }
    }

    var body: some View {
        VStack(spacing: 10) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                let (label, fg, bg) = style(row.status)

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(label)
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(fg, in: RoundedRectangle(cornerRadius: 5))
                        Text(row.note)
                            .font(.caption)
                            .foregroundStyle(fg)
                        Spacer(minLength: 0)
                    }

                    HStack(alignment: .top, spacing: 12) {
                        column("Discharge list", med: row.discharge)
                        Divider()
                        column("On the table", med: row.bottle)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(bg, in: RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12).stroke(fg.opacity(0.25), lineWidth: 1)
                )
            }
        }
    }

    private func column(_ title: String, med: NormalizedMed?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Theme.muted)
            if let med {
                Text(med.displayName).font(.subheadline.bold())
                if let c = med.canonicalName {
                    Text(c).font(.caption2).foregroundStyle(Theme.muted)
                }
            } else {
                Text("—").foregroundStyle(Theme.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
