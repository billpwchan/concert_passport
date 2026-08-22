import Foundation
import Testing
@testable import ConcertPassportCore

struct LifecycleTests {
    @Test func selectsTheNextOpenMilestone() {
        let journey = PreviewData.journeys[0]
        let now = ISO8601DateFormatter().date(from: "2026-08-22T04:00:00Z")!

        #expect(JourneyLifecycle.nextMilestone(in: journey, now: now)?.id == "riize-hkg-registration")
    }

    @Test func schedulesAlertsFromTheDeadline() {
        let milestone = PreviewData.journeys[0].milestones[1]
        let schedule = JourneyLifecycle.alertSchedule(for: milestone)

        #expect(schedule.count == 4)
        #expect(schedule.last == milestone.endsAt)
        #expect(schedule[0].distance(to: schedule[3]) == 24 * 60 * 60)
    }

    @Test func calculatesProgressAndDistance() {
        let progress = JourneyLifecycle.progress(in: PreviewData.journeys[0])

        #expect(progress.complete == 1)
        #expect(progress.total == 4)
        #expect(JourneyLifecycle.totalDistance(for: PreviewData.stamps) == 8_685)
    }
}
