import SwiftUI

struct PlansView: View {
    @Environment(PassportModel.self) private var model

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(model.journeys) { journey in
                        NavigationLink(value: journey) {
                            JourneyRow(journey: journey)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 32)
            }
            .background(PassportTheme.ink.ignoresSafeArea())
            .navigationTitle(L10n.plansTitle)
            .navigationDestination(for: ConcertJourney.self) { journey in
                JourneyDetailView(journeyID: journey.id)
            }
        }
    }
}

private struct JourneyRow: View {
    let journey: ConcertJourney

    var body: some View {
        let next = JourneyLifecycle.nextMilestone(in: journey)
        VStack(alignment: .leading, spacing: 15) {
            HStack(alignment: .top) {
                Rectangle()
                    .fill(Color(hex: journey.artist.accentHex))
                    .frame(width: 6, height: 42)
                VStack(alignment: .leading, spacing: 4) {
                    Text(journey.artist.name)
                        .font(.title3.weight(.semibold))
                    Text("\(journey.venue.city) · \(journey.tourName)")
                        .font(.subheadline)
                        .foregroundStyle(PassportTheme.muted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(PassportTheme.faint)
            }

            HStack(alignment: .firstTextBaseline) {
                Text(journey.performanceStartsAt.venueLabel(
                    timeZoneIdentifier: journey.venue.timeZoneIdentifier
                ))
                Spacer()
                Text(next.map { L10n.milestoneTitle($0.kind) } ?? L10n.journeyComplete)
                    .foregroundStyle(next == nil ? PassportTheme.mint : PassportTheme.amber)
            }
            .font(.caption.weight(.medium))
        }
        .padding(.vertical, 19)
        .overlay(alignment: .top) {
            Rectangle().fill(PassportTheme.line).frame(height: 0.5)
        }
    }
}

private struct JourneyDetailView: View {
    @Environment(PassportModel.self) private var model
    let journeyID: String

    private var journey: ConcertJourney? {
        model.journeys.first { $0.id == journeyID }
    }

    var body: some View {
        ScrollView {
            if let journey {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 7) {
                        Eyebrow(text: "\(journey.venue.city) · \(journey.venue.market)")
                        Text(journey.artist.name)
                            .font(.system(size: 42, weight: .semibold))
                        Text("\(journey.tourName) · \(journey.venue.name)")
                            .foregroundStyle(PassportTheme.muted)
                    }

                    if journey.isIllustrative {
                        Label(L10n.illustrativeTimeline, systemImage: "info.circle")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(PassportTheme.amber)
                    }

                    VStack(spacing: 0) {
                        ForEach(Array(journey.milestones.enumerated()), id: \.element.id) { index, item in
                            MilestoneRow(
                                milestone: item,
                                isLast: index == journey.milestones.count - 1
                            ) {
                                model.toggleMilestone(journeyID: journey.id, milestoneID: item.id)
                            }
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(PassportTheme.ink.ignoresSafeArea())
        .navigationTitle(L10n.journeyTitle)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct MilestoneRow: View {
    let milestone: JourneyMilestone
    let isLast: Bool
    let action: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            VStack(spacing: 0) {
                Button(action: action) {
                    Image(systemName: milestone.state == .completed ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(
                            milestone.state == .completed ? PassportTheme.mint : PassportTheme.violet
                        )
                }
                if !isLast {
                    Rectangle()
                        .fill(PassportTheme.line)
                        .frame(width: 1, height: 66)
                }
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(L10n.milestoneTitle(milestone.kind))
                    .font(.headline)
                Text(milestone.startsAt.venueLabel(timeZoneIdentifier: milestone.timeZoneIdentifier))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(PassportTheme.violet)
                Text(milestone.detail)
                    .font(.caption)
                    .foregroundStyle(PassportTheme.muted)
            }
            .padding(.bottom, isLast ? 0 : 22)

            Spacer()
        }
    }
}
