import Foundation

enum L10n {
    static var navToday: String { String(localized: "nav.today") }
    static var navAtlas: String { String(localized: "nav.atlas") }
    static var navPlans: String { String(localized: "nav.plans") }
    static var navPassport: String { String(localized: "nav.passport") }

    static var illustrative: String { String(localized: "common.illustrative") }
    static var venueTime: String { String(localized: "common.venue_time") }
    static var actionNow: String { String(localized: "common.action_now") }
    static var markDone: String { String(localized: "common.mark_done") }
    static var openVerifiedSource: String { String(localized: "common.open_verified_source") }
    static var remaining: String { String(localized: "common.remaining") }
    static var journeyComplete: String { String(localized: "common.journey_complete") }

    static var todayEyebrow: String { String(localized: "today.eyebrow") }
    static var todayTitle: String { String(localized: "today.title") }
    static var protectedJourneys: String { String(localized: "today.protected_journeys") }

    static var atlasEyebrow: String { String(localized: "atlas.eyebrow") }
    static var atlasTitle: String { String(localized: "atlas.title") }
    static var artistOrCity: String { String(localized: "atlas.artist_or_city") }
    static var allMarkets: String { String(localized: "atlas.all_markets") }
    static var insideWindow: String { String(localized: "atlas.inside_window") }

    static var plansTitle: String { String(localized: "plans.title") }
    static var journeyTitle: String { String(localized: "journey.title") }
    static var illustrativeTimeline: String { String(localized: "journey.illustrative_timeline") }

    static func milestoneTitle(_ kind: MilestoneKind) -> String {
        switch kind {
        case .announcement: String(localized: "milestone.announcement.title")
        case .membership: String(localized: "milestone.membership.title")
        case .registration: String(localized: "milestone.registration.title")
        case .lottery: String(localized: "milestone.lottery.title")
        case .lotteryResult: String(localized: "milestone.lottery_result.title")
        case .payment: String(localized: "milestone.payment.title")
        case .presale: String(localized: "milestone.presale.title")
        case .waitingRoom: String(localized: "milestone.waiting_room.title")
        case .generalSale: String(localized: "milestone.general_sale.title")
        case .ticketDelivery: String(localized: "milestone.ticket_delivery.title")
        case .doors: String(localized: "milestone.doors.title")
        case .show: String(localized: "milestone.show.title")
        }
    }

    static var passportEyebrow: String { String(localized: "passport.eyebrow") }
    static var passportTitle: String { String(localized: "passport.title") }
    static var stamps: String { String(localized: "passport.stamps") }
    static var shows: String { String(localized: "passport.shows") }
    static var cities: String { String(localized: "passport.cities") }
    static var distance: String { String(localized: "passport.distance") }
    static var firstMemory: String { String(localized: "passport.first_memory") }
    static var distanceNote: String { String(localized: "passport.distance_note") }

    static func firstSaw(artist: String, city: String) -> String {
        String(
            format: String(localized: "passport.first_saw_format"),
            locale: .autoupdatingCurrent,
            artist,
            city
        )
    }
}
