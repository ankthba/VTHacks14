import Foundation
import UIKit

/// Talks to the PillPile Next.js server. Nothing is analysed on the phone:
/// RxNorm normalization, the deterministic checks and FDA label retrieval all
/// live server side, so the app cannot drift from the web version.
@MainActor
final class APIClient: ObservableObject {
    /// Editable in Settings. The simulator shares the Mac's network, so
    /// localhost works during development; point this at the deployed URL for
    /// a demo on a real phone.
    @Published var baseURL: String {
        didSet { UserDefaults.standard.set(baseURL, forKey: "baseURL") }
    }

    init() {
        baseURL = UserDefaults.standard.string(forKey: "baseURL") ?? "http://localhost:3000"
    }

    enum ClientError: LocalizedError {
        case badURL
        case server(String)
        case empty

        var errorDescription: String? {
            switch self {
            case .badURL: return "That server address is not valid."
            case .server(let m): return m
            case .empty: return "No medication labels were found in those photos."
            }
        }
    }

    private func url(_ path: String) throws -> URL {
        guard let u = URL(string: baseURL.trimmingCharacters(in: .whitespaces) + path) else {
            throw ClientError.badURL
        }
        return u
    }

    private func decodeError(_ data: Data, _ response: URLResponse) -> String? {
        guard let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) else {
            return nil
        }
        if let e = try? JSONDecoder().decode(APIError.self, from: data) {
            return e.detail ?? e.error ?? "Server error \(http.statusCode)"
        }
        return "Server error \(http.statusCode)"
    }

    /// Loads a prepared scenario. Needs no API key and no camera.
    func loadDemo(_ id: String) async throws -> (bottles: [BottleRecord], discharge: [BottleRecord]) {
        var req = URLRequest(url: try url("/api/extract?demo=\(id)"))
        req.httpMethod = "POST"
        let (data, response) = try await URLSession.shared.data(for: req)
        if let m = decodeError(data, response) { throw ClientError.server(m) }
        let decoded = try JSONDecoder().decode(ExtractResponse.self, from: data)
        return (decoded.bottles ?? [], decoded.discharge ?? [])
    }

    /// Uploads photographs for label reading.
    func extract(images: [UIImage], kind: String) async throws -> [BottleRecord] {
        let boundary = "pillpile-\(UUID().uuidString)"
        var body = Data()

        for (i, image) in images.enumerated() {
            // Downscale before upload: a 12 MP photo is far more than the model
            // needs to read printed text, and it makes the request slow enough
            // to look broken on conference wifi.
            guard let jpeg = image.resizedForUpload().jpegData(compressionQuality: 0.8) else { continue }
            body.append("--\(boundary)\r\n")
            body.append("Content-Disposition: form-data; name=\"images\"; filename=\"bottle\(i).jpg\"\r\n")
            body.append("Content-Type: image/jpeg\r\n\r\n")
            body.append(jpeg)
            body.append("\r\n")
        }
        body.append("--\(boundary)--\r\n")

        var req = URLRequest(url: try url("/api/extract?kind=\(kind)"))
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        req.timeoutInterval = 90

        let (data, response) = try await URLSession.shared.data(for: req)
        if let m = decodeError(data, response) { throw ClientError.server(m) }
        let decoded = try JSONDecoder().decode(ExtractResponse.self, from: data)
        let records = kind == "discharge" ? decoded.discharge : decoded.bottles
        guard let records, !records.isEmpty else { throw ClientError.empty }
        return records
    }

    func analyze(
        bottles: [BottleRecord],
        discharge: [BottleRecord],
        language: String
    ) async throws -> AnalysisResponse {
        struct Body: Encodable {
            let bottles: [BottleRecord]
            let discharge: [BottleRecord]
            let language: String
        }

        var req = URLRequest(url: try url("/api/analyze"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(
            Body(bottles: bottles, discharge: discharge, language: language)
        )
        req.timeoutInterval = 120

        let (data, response) = try await URLSession.shared.data(for: req)
        if let m = decodeError(data, response) { throw ClientError.server(m) }
        return try JSONDecoder().decode(AnalysisResponse.self, from: data)
    }
}

private extension Data {
    mutating func append(_ string: String) {
        if let d = string.data(using: .utf8) { append(d) }
    }
}

extension UIImage {
    /// Printed labels stay legible well below full camera resolution.
    func resizedForUpload(maxDimension: CGFloat = 1600) -> UIImage {
        let longest = max(size.width, size.height)
        guard longest > maxDimension else { return self }
        let scale = maxDimension / longest
        let target = CGSize(width: size.width * scale, height: size.height * scale)
        return UIGraphicsImageRenderer(size: target).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
