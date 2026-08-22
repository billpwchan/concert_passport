import Foundation

public struct Artist: Codable, Hashable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let agency: String
    public let accentHex: String

    public init(id: String, name: String, agency: String, accentHex: String) {
        self.id = id
        self.name = name
        self.agency = agency
        self.accentHex = accentHex
    }
}

public struct Venue: Codable, Hashable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let city: String
    public let market: String
    public let timeZoneIdentifier: String
    public let latitude: Double
    public let longitude: Double

    public init(
        id: String,
        name: String,
        city: String,
        market: String,
        timeZoneIdentifier: String,
        latitude: Double,
        longitude: Double
    ) {
        self.id = id
        self.name = name
        self.city = city
        self.market = market
        self.timeZoneIdentifier = timeZoneIdentifier
        self.latitude = latitude
        self.longitude = longitude
    }
}

public enum MilestoneKind: String, Codable, CaseIterable, Sendable {
    case announcement
    case membership
    case registration
    case lottery
    case lotteryResult = "lottery_result"
    case payment
    case presale
    case waitingRoom = "waiting_room"
    case generalSale = "general_sale"
    case ticketDelivery = "ticket_delivery"
    case doors
    case show
}

public enum MilestoneState: String, Codable, Sendable {
    case completed
    case active
    case upcoming
    case expired
    case changed
}

public struct JourneyMilestone: Codable, Hashable, Identifiable, Sendable {
    public let id: String
    public let kind: MilestoneKind
    public let title: String
    public let detail: String
    public let startsAt: Date
    public let endsAt: Date?
    public let timeZoneIdentifier: String
    public var state: MilestoneState
    public let officialURL: URL?

    public init(
        id: String,
        kind: MilestoneKind,
        title: String,
        detail: String,
        startsAt: Date,
        endsAt: Date? = nil,
        timeZoneIdentifier: String,
        state: MilestoneState,
        officialURL: URL? = nil
    ) {
        self.id = id
        self.kind = kind
        self.title = title
        self.detail = detail
        self.startsAt = startsAt
        self.endsAt = endsAt
        self.timeZoneIdentifier = timeZoneIdentifier
        self.state = state
        self.officialURL = officialURL
    }
}

public struct ConcertJourney: Codable, Hashable, Identifiable, Sendable {
    public let id: String
    public let artist: Artist
    public let tourName: String
    public let venue: Venue
    public let performanceStartsAt: Date
    public var milestones: [JourneyMilestone]
    public let officialSeller: String
    public let isIllustrative: Bool

    public init(
        id: String,
        artist: Artist,
        tourName: String,
        venue: Venue,
        performanceStartsAt: Date,
        milestones: [JourneyMilestone],
        officialSeller: String,
        isIllustrative: Bool
    ) {
        self.id = id
        self.artist = artist
        self.tourName = tourName
        self.venue = venue
        self.performanceStartsAt = performanceStartsAt
        self.milestones = milestones
        self.officialSeller = officialSeller
        self.isIllustrative = isIllustrative
    }
}

public struct PassportStamp: Codable, Hashable, Identifiable, Sendable {
    public let id: String
    public let artist: Artist
    public let city: String
    public let market: String
    public let venue: String
    public let attendedAt: Date
    public let travelDistanceKilometres: Int

    public init(
        id: String,
        artist: Artist,
        city: String,
        market: String,
        venue: String,
        attendedAt: Date,
        travelDistanceKilometres: Int
    ) {
        self.id = id
        self.artist = artist
        self.city = city
        self.market = market
        self.venue = venue
        self.attendedAt = attendedAt
        self.travelDistanceKilometres = travelDistanceKilometres
    }
}
