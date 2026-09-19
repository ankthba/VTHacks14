import PhotosUI
import SwiftUI

enum Stage {
    case start, review, results
}

struct ContentView: View {
    @StateObject private var api = APIClient()
    @StateObject private var speaker = Speaker()

    @State private var stage: Stage = .start
    @State private var bottles: [BottleRecord] = []
    @State private var discharge: [BottleRecord] = []
    @State private var result: AnalysisResponse?
    @State private var busy: String?
    @State private var errorText: String?
    @State private var language = "English"
    @State private var showSettings = false

    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var pickingDischarge = false

    private let languages = ["English", "Spanish", "Vietnamese", "Chinese (Simplified)", "Arabic"]
    private let langTags = [
        "English": "en-US", "Spanish": "es-ES", "Vietnamese": "vi-VN",
        "Chinese (Simplified)": "zh-CN", "Arabic": "ar-SA",
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                DisclaimerBar()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        if let busy {
                            HStack(spacing: 10) {
                                ProgressView()
                                Text(busy).font(.callout.weight(.semibold))
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
                        }

                        if let errorText {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Something went wrong.").bold().foregroundStyle(Theme.high)
                                Text(errorText).font(.callout)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(Theme.highBG, in: RoundedRectangle(cornerRadius: 12))
                        }

                        switch stage {
                        case .start: startScreen
                        case .review: reviewScreen
                        case .results: resultsScreen
                        }
                    }
                    .padding(16)
                }
                .background(Theme.background)
            }
            .navigationTitle("PillPile")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(baseURL: $api.baseURL)
            }
            .onChange(of: pickerItems) { _, items in
                guard !items.isEmpty else { return }
                Task { await handlePicked(items) }
            }
        }
    }

    // MARK: - Screens

    private var startScreen: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Photograph your bottles").font(.title2.bold())
                Text("One photo of the whole pile, or several. We read the printed label — never the pills themselves.")
                    .foregroundStyle(Theme.muted)

                PhotosPicker(
                    selection: $pickerItems,
                    maxSelectionCount: 6,
                    matching: .images
                ) {
                    Label("Choose photos", systemImage: "camera.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Theme.accent, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                }
                .simultaneousGesture(TapGesture().onEnded { pickingDischarge = false })

                Text("Photos are read in memory and never stored.")
                    .font(.footnote).foregroundStyle(Theme.muted)
            }
            .padding(16)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))

            VStack(alignment: .leading, spacing: 10) {
                Text("Or try a prepared example").font(.headline)
                Text("Synthetic labels. No camera or API key needed.")
                    .font(.footnote).foregroundStyle(Theme.muted)

                ForEach(demoScenarios, id: \.0) { id, title, blurb in
                    Button {
                        Task { await loadDemo(id) }
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(title).font(.subheadline.bold())
                            Text(blurb).font(.footnote).foregroundStyle(Theme.muted)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var reviewScreen: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Check what we read").font(.title2.bold())
            Text("Fix anything wrong before we check it — a wrong name here would make every check wrong too.")
                .foregroundStyle(Theme.muted)

            ForEach($bottles) { $b in
                BottleEditor(record: $b)
            }

            if !discharge.isEmpty {
                Text("From the discharge paperwork").font(.headline).padding(.top, 8)
                ForEach($discharge) { $b in
                    BottleEditor(record: $b)
                }
            }

            Button {
                Task { await analyze() }
            } label: {
                Text("Check these \(bottles.count) medicines")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.accent, in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.white)
            }
            .disabled(busy != nil || bottles.isEmpty)

            Button("Start over") { reset() }
                .foregroundStyle(Theme.muted)
        }
    }

    @ViewBuilder
    private var resultsScreen: some View {
        if let r = result {
            VStack(alignment: .leading, spacing: 24) {
                HStack {
                    Button {
                        speaker.toggle(r.onePager, language: langTags[language] ?? "en-US")
                    } label: {
                        Label(
                            speaker.isSpeaking ? "Stop reading" : "Read this aloud",
                            systemImage: speaker.isSpeaking ? "stop.circle" : "speaker.wave.2.fill"
                        )
                        .font(.subheadline.bold())
                    }
                    Spacer()
                    ShareLink(item: r.onePager) {
                        Label("Share", systemImage: "square.and.arrow.up")
                            .font(.subheadline.bold())
                    }
                }

                Picker("Language", selection: $language) {
                    ForEach(languages, id: \.self) { Text($0) }
                }
                .pickerStyle(.menu)
                .onChange(of: language) { _, l in Task { await analyze(language: l) } }

                if let rows = r.reconciliation, !rows.isEmpty {
                    section("Discharge list vs what is on the table") {
                        ReconcileView(rows: rows)
                    }
                }

                if !r.warnings.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("What this check could not cover").font(.headline)
                            .foregroundStyle(Theme.moderate)
                        ForEach(r.warnings, id: \.self) { w in
                            Text("• \(w)").font(.callout)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Theme.moderateBG, in: RoundedRectangle(cornerRadius: 12))
                }

                section("Your medications") {
                    VStack(spacing: 10) {
                        ForEach(r.meds) { MedRowView(med: $0) }
                    }
                }

                section(
                    r.findings.isEmpty
                        ? "Nothing was flagged"
                        : "Things to ask your pharmacist about"
                ) {
                    if r.findings.isEmpty {
                        Text("That is not the same as 'everything is fine' — it means these particular checks found nothing.")
                            .font(.callout).foregroundStyle(Theme.muted)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(r.findings) { FindingCardView(finding: $0) }
                        }
                    }
                }

                section("Your daily schedule") {
                    ScheduleView(schedule: r.schedule)
                }

                Button("Start over") { reset() }
                    .foregroundStyle(Theme.muted)
            }
        }
    }

    private func section<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.title3.bold())
            content()
        }
    }

    // MARK: - Actions

    private var demoScenarios: [(String, String, String)] {
        [
            ("reconcile", "Discharge list vs the pile", "What the hospital sent you home on, against what is on the table."),
            ("duplicate", "Hidden duplicate", "Norco + Extra Strength Tylenol — the same ingredient under two names."),
            ("sameclass", "Same-class stacking", "Lisinopril + Losartan — two medicines that act the same way."),
            ("interaction", "Label-cited interaction", "Warfarin + Ibuprofen — bleeding risk, quoted from the FDA label."),
            ("all", "All six bottles", "Everything at once — the kitchen-table pile."),
        ]
    }

    private func loadDemo(_ id: String) async {
        errorText = nil
        busy = "Loading demo labels…"
        defer { busy = nil }
        do {
            let (b, d) = try await api.loadDemo(id)
            bottles = b
            discharge = d
            stage = .review
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func handlePicked(_ items: [PhotosPickerItem]) async {
        errorText = nil
        busy = "Reading the labels…"
        defer {
            busy = nil
            pickerItems = []
        }
        do {
            var images: [UIImage] = []
            for item in items {
                if let data = try await item.loadTransferable(type: Data.self),
                   let img = UIImage(data: data) {
                    images.append(img)
                }
            }
            guard !images.isEmpty else {
                errorText = "Those photos could not be opened."
                return
            }
            let records = try await api.extract(images: images, kind: pickingDischarge ? "discharge" : "bottles")
            if pickingDischarge { discharge = records } else { bottles = records }
            stage = .review
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func analyze(language lang: String? = nil) async {
        errorText = nil
        busy = "Checking ingredients, classes and FDA labels…"
        defer { busy = nil }
        do {
            result = try await api.analyze(
                bottles: bottles,
                discharge: discharge,
                language: lang ?? language
            )
            stage = .results
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func reset() {
        stage = .start
        bottles = []
        discharge = []
        result = nil
        errorText = nil
    }
}

// MARK: - Small views

struct BottleEditor: View {
    @Binding var record: BottleRecord

    var body: some View {
        let low = record.confidence < 0.75
        VStack(alignment: .leading, spacing: 8) {
            Text(low
                 ? "Please confirm — read with \(Int(record.confidence * 100))% confidence"
                 : "Read with \(Int(record.confidence * 100))% confidence")
                .font(.caption.weight(.semibold))
                .foregroundStyle(low ? Theme.moderate : Theme.ok)

            field("Medication name", text: Binding(
                get: { record.drugText ?? "" },
                set: { record.drugText = $0; record.confidence = 1 }
            ))
            field("Strength", text: Binding(
                get: { record.strength ?? "" },
                set: { record.strength = $0; record.confidence = 1 }
            ))
            field("Directions", text: Binding(
                get: { record.sig ?? "" },
                set: { record.sig = $0; record.confidence = 1 }
            ))
        }
        .padding(14)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(low ? Theme.moderate : Theme.line)
        )
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.caption.weight(.semibold))
            TextField("not readable", text: text)
                .textFieldStyle(.roundedBorder)
                .autocorrectionDisabled()
        }
    }
}

struct MedRowView: View {
    let med: NormalizedMed

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if med.unresolved == true {
                Text(med.inputText).font(.subheadline.bold())
                Text("We could not match this to a drug record, so it was left out of every check.")
                    .font(.footnote)
            } else {
                // The line that is the whole product: bottle name -> ingredients.
                HStack(spacing: 4) {
                    Text(med.displayName).font(.subheadline.bold())
                    Text("→").foregroundStyle(Theme.muted)
                    Text(med.ingredients.map(\.name).joined(separator: " + "))
                        .font(.subheadline.weight(.semibold))
                }
                .fixedSize(horizontal: false, vertical: true)

                if let c = med.canonicalName {
                    Text(c).font(.caption).foregroundStyle(Theme.muted)
                }
                if med.discontinued == true {
                    Text("This product has been discontinued — it may be an old bottle worth asking about.")
                        .font(.caption)
                        .foregroundStyle(Theme.moderate)
                }
                if let sig = med.sig {
                    Text("How to take it: \(sig)").font(.footnote)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(med.unresolved == true ? Theme.moderateBG : Theme.surface,
                    in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line))
    }
}

struct ScheduleView: View {
    let schedule: [ScheduleSlot]

    private let order = ["morning", "midday", "evening", "bedtime", "as needed"]
    private let titles = [
        "morning": "Morning", "midday": "Midday", "evening": "Evening",
        "bedtime": "Bedtime", "as needed": "Only when needed",
    ]

    var body: some View {
        VStack(spacing: 10) {
            ForEach(order.filter { s in schedule.contains { $0.slot == s } }, id: \.self) { slot in
                VStack(alignment: .leading, spacing: 6) {
                    Text(titles[slot] ?? slot).font(.subheadline.bold())
                    ForEach(schedule.filter { $0.slot == slot }, id: \.self) { item in
                        VStack(alignment: .leading, spacing: 1) {
                            Text(item.medName).font(.footnote.weight(.semibold))
                            Text(item.instruction).font(.caption).foregroundStyle(Theme.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line))
            }
        }
    }
}

struct SettingsView: View {
    @Binding var baseURL: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("http://localhost:3000", text: $baseURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                } header: {
                    Text("PillPile server")
                } footer: {
                    Text("Every check runs on the server, so the phone and the web app can never disagree. Use localhost for the simulator, or your deployed URL on a real phone.")
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
