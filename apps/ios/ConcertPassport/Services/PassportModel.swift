import Foundation
import Observation

@MainActor
@Observable
final class PassportModel {
    var journeys: [ConcertJourney] = PreviewData.journeys
    var stamps: [PassportStamp] = PreviewData.stamps
    var discoveredEvents: [DiscoveredEvent] = []
    var isRefreshing = false
    var lastRefreshError: String?

    private let api: APIClient

    init() {
        let configured = Bundle.main.object(
            forInfoDictionaryKey: "CONCERT_PASSPORT_API_BASE_URL"
        ) as? String
        let baseURL = URL(string: configured ?? "http://localhost:3000/")!
        api = APIClient(baseURL: baseURL)
    }

    func toggleMilestone(journeyID: String, milestoneID: String) {
        guard let journeyIndex = journeys.firstIndex(where: { $0.id == journeyID }),
              let milestoneIndex = journeys[journeyIndex].milestones.firstIndex(
                where: { $0.id == milestoneID }
              ) else { return }

        let state = journeys[journeyIndex].milestones[milestoneIndex].state
        journeys[journeyIndex].milestones[milestoneIndex].state =
            state == .completed ? .upcoming : .completed
    }

    func refreshDiscovery(artist: String? = nil, city: String? = nil) async {
        isRefreshing = true
        lastRefreshError = nil
        defer { isRefreshing = false }

        do {
            let response = try await api.discover(artist: artist, city: city)
            discoveredEvents = response.events
        } catch {
            lastRefreshError = "Live discovery is unavailable. Your saved journeys remain on this device."
        }
    }
}
