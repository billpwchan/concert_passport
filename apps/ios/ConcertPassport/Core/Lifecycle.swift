import Foundation

public enum JourneyLifecycle {
    public static let defaultAlertOffsets: [TimeInterval] = [
        24 * 60 * 60,
        2 * 60 * 60,
        10 * 60,
        0,
    ]

    public static func nextMilestone(
        in journey: ConcertJourney,
        now: Date = .now
    ) -> JourneyMilestone? {
        journey.milestones
            .filter { $0.state != .completed }
            .filter { ($0.endsAt ?? $0.startsAt) >= now }
            .min { $0.startsAt < $1.startsAt }
    }

    public static func alertSchedule(
        for milestone: JourneyMilestone,
        offsets: [TimeInterval] = defaultAlertOffsets
    ) -> [Date] {
        let target = milestone.endsAt ?? milestone.startsAt
        return offsets.map { target.addingTimeInterval(-$0) }
    }

    public static func progress(in journey: ConcertJourney) -> (complete: Int, total: Int) {
        (
            journey.milestones.filter { $0.state == .completed }.count,
            journey.milestones.count
        )
    }

    public static func totalDistance(for stamps: [PassportStamp]) -> Int {
        stamps.reduce(0) { $0 + $1.travelDistanceKilometres }
    }
}
