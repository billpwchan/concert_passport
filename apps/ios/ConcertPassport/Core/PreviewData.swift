import Foundation

public enum PreviewData {
    public static let riize = Artist(
        id: "artist-riize",
        name: "RIIZE",
        agency: "SM Entertainment",
        accentHex: "826EFF"
    )

    public static let seventeen = Artist(
        id: "artist-seventeen",
        name: "SEVENTEEN",
        agency: "PLEDIS Entertainment",
        accentHex: "F0B45E"
    )

    public static let aespa = Artist(
        id: "artist-aespa",
        name: "aespa",
        agency: "SM Entertainment",
        accentHex: "62E6D8"
    )

    public static let journeys: [ConcertJourney] = [
        ConcertJourney(
            id: "journey-riize-hong-kong",
            artist: riize,
            tourName: "RIIZING LOUD",
            venue: Venue(
                id: "venue-asiaworld-arena",
                name: "AsiaWorld–Arena",
                city: "Hong Kong",
                market: "HK",
                timeZoneIdentifier: "Asia/Hong_Kong",
                latitude: 22.3214,
                longitude: 113.9433
            ),
            performanceStartsAt: instant("2026-12-14T12:00:00Z"),
            milestones: [
                JourneyMilestone(
                    id: "riize-hkg-membership",
                    kind: .membership,
                    title: "Confirm BRIIZE membership",
                    detail: "Membership must be active before registration.",
                    startsAt: instant("2026-08-10T04:00:00Z"),
                    endsAt: instant("2026-08-15T15:59:00Z"),
                    timeZoneIdentifier: "Asia/Hong_Kong",
                    state: .completed
                ),
                JourneyMilestone(
                    id: "riize-hkg-registration",
                    kind: .registration,
                    title: "Complete presale registration",
                    detail: "Register the membership for the Hong Kong date.",
                    startsAt: instant("2026-08-20T04:00:00Z"),
                    endsAt: instant("2026-08-22T15:59:00Z"),
                    timeZoneIdentifier: "Asia/Hong_Kong",
                    state: .active,
                    officialURL: URL(string: "https://weverse.io/riize/notice")
                ),
                JourneyMilestone(
                    id: "riize-hkg-presale",
                    kind: .presale,
                    title: "Membership presale",
                    detail: "Use the membership number as the access credential.",
                    startsAt: instant("2026-08-26T04:00:00Z"),
                    timeZoneIdentifier: "Asia/Hong_Kong",
                    state: .upcoming
                ),
                JourneyMilestone(
                    id: "riize-hkg-show",
                    kind: .show,
                    title: "Show time",
                    detail: "Venue-local performance time.",
                    startsAt: instant("2026-12-14T12:00:00Z"),
                    timeZoneIdentifier: "Asia/Hong_Kong",
                    state: .upcoming
                ),
            ],
            officialSeller: "Verified official seller",
            isIllustrative: true
        ),
    ]

    public static let stamps: [PassportStamp] = [
        PassportStamp(
            id: "stamp-riize-seoul",
            artist: riize,
            city: "Seoul",
            market: "KR",
            venue: "KSPO Dome",
            attendedAt: instant("2025-06-21T10:00:00Z"),
            travelDistanceKilometres: 4_667
        ),
        PassportStamp(
            id: "stamp-seventeen-hong-kong",
            artist: seventeen,
            city: "Hong Kong",
            market: "HK",
            venue: "AsiaWorld–Arena",
            attendedAt: instant("2025-01-19T11:00:00Z"),
            travelDistanceKilometres: 2_589
        ),
        PassportStamp(
            id: "stamp-aespa-bangkok",
            artist: aespa,
            city: "Bangkok",
            market: "TH",
            venue: "IMPACT Arena",
            attendedAt: instant("2024-09-29T12:00:00Z"),
            travelDistanceKilometres: 1_429
        ),
    ]

    private static func instant(_ value: String) -> Date {
        ISO8601DateFormatter().date(from: value)!
    }
}
