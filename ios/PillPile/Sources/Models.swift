import Foundation

/// Mirrors the JSON returned by the Next.js API. The iOS app is a thin client:
/// every check, every citation and every piece of arithmetic happens server
/// side, so the phone and the web app can never disagree about a finding.

struct BottleRecord: Codable, Identifiable, Hashable {
    var id = UUID()
    var drugText: String?
    var strength: String?
    var sig: String?
    var quantity: String?
    var prescriber: String?
    var fillDate: String?
    var confidence: Double

    enum CodingKeys: String, CodingKey {
        case drugText = "drug_text"
        case strength
        case sig
        case quantity
        case prescriber
        case fillDate = "fill_date"
        case confidence
    }
}

struct Ingredient: Codable, Hashable {
    let rxcui: String
    let name: String
}

struct NormalizedMed: Codable, Identifiable, Hashable {
    let id: String
    let inputText: String
    let sig: String?
    let rxcui: String?
    let canonicalName: String?
    let ingredients: [Ingredient]
    let unresolved: Bool?
    let discontinued: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case inputText = "input_text"
        case sig
        case rxcui
        case canonicalName = "canonical_name"
        case ingredients
        case unresolved
        case discontinued
    }

    /// Short name a patient recognises - brand from the canonical name when
    /// present, otherwise what was printed on the bottle.
    var displayName: String {
        if let c = canonicalName,
           let open = c.firstIndex(of: "["),
           let close = c.firstIndex(of: "]"),
           open < close {
            return String(c[c.index(after: open)..<close])
        }
        return inputText
    }
}

struct Citation: Codable, Hashable {
    let label: String
    let url: String
}

struct Finding: Codable, Identifiable, Hashable {
    let id: String
    let kind: String
    let severity: String
    let computed: Bool
    let headline: String
    let detail: String
    let quote: String?
    let citations: [Citation]

    /// Interaction findings are detected deterministically but may have
    /// model-written wording, so they carry a different badge.
    var isArithmetic: Bool { kind != "label_interaction" }
}

struct ScheduleSlot: Codable, Hashable {
    let slot: String
    let medId: String
    let medName: String
    let instruction: String

    enum CodingKeys: String, CodingKey {
        case slot
        case medId = "med_id"
        case medName = "med_name"
        case instruction
    }
}

struct ReconcileRow: Codable, Hashable {
    let status: String
    let discharge: NormalizedMed?
    let bottle: NormalizedMed?
    let note: String
}

struct AnalysisResponse: Codable {
    let meds: [NormalizedMed]
    let dischargeMeds: [NormalizedMed]?
    let reconciliation: [ReconcileRow]?
    let findings: [Finding]
    let schedule: [ScheduleSlot]
    let warnings: [String]
    let onePager: String
    let onePagerGenerated: Bool
}

struct ExtractResponse: Codable {
    let bottles: [BottleRecord]?
    let discharge: [BottleRecord]?
}

struct APIError: Codable {
    let error: String?
    let detail: String?
}
