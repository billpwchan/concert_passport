import Foundation

struct DiscoveredEvent: Codable, Identifiable, Sendable {
    let provider: String
    let providerEventId: String
    let name: String
    let artist: String?
    let startsAt: String
    let timezone: String?
    let venue: String?
    let city: String?
    let countryCode: String?
    let officialUrl: URL
    let confidence: String

    var id: String { "\(provider):\(providerEventId)" }
}

struct DiscoveryResponse: Codable, Sendable {
    let events: [DiscoveredEvent]
    let errors: [String]
    let generatedAt: String
}

enum APIClientError: Error {
    case invalidResponse
}

actor APIClient {
    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func discover(artist: String? = nil, city: String? = nil) async throws -> DiscoveryResponse {
        var components = URLComponents(
            url: baseURL.appending(path: "api/v1/discover"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [
            artist.map { URLQueryItem(name: "artist", value: $0) },
            city.map { URLQueryItem(name: "city", value: $0) },
        ].compactMap { $0 }

        let (data, response) = try await session.data(from: components.url!)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIClientError.invalidResponse
        }
        return try JSONDecoder().decode(DiscoveryResponse.self, from: data)
    }
}
