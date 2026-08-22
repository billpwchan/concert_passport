import SwiftUI

struct TodayView: View {
    @Environment(PassportModel.self) private var model

    private var next: (journey: ConcertJourney, milestone: JourneyMilestone)? {
        model.journeys
            .compactMap { journey in
                JourneyLifecycle.nextMilestone(in: journey).map { (journey, $0) }
            }
            .min { $0.1.startsAt < $1.1.startsAt }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    pageHeader

                    if let next {
                        deadlineCard(journey: next.journey, milestone: next.milestone)
                    }

                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Text("Protected journeys")
                                .font(.title3.weight(.semibold))
                            Spacer()
                            Text("Illustrative")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(PassportTheme.muted)
                        }

                        ForEach(model.journeys) { journey in
                            journeyStrip(journey)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 36)
            }
            .background(PassportTheme.ink.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var pageHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "Saturday · Singapore")
            Text("Nothing important\nshould slip past you.")
                .font(.system(size: 36, weight: .semibold, design: .rounded))
                .tracking(-1.1)
                .foregroundStyle(PassportTheme.text)
        }
    }

    private func deadlineCard(
        journey: ConcertJourney,
        milestone: JourneyMilestone
    ) -> some View {
        PassportCard {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Label("Action now", systemImage: "bolt.fill")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(PassportTheme.amber)
                    Spacer()
                    Text(journey.venue.market)
                        .font(.caption.monospaced().weight(.bold))
                        .foregroundStyle(PassportTheme.muted)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(journey.artist.name)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(PassportTheme.violet)
                    Text(milestone.title)
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(PassportTheme.text)
                    Text(milestone.detail)
                        .font(.subheadline)
                        .foregroundStyle(PassportTheme.muted)
                }

                TimelineView(.periodic(from: .now, by: 1)) { context in
                    CountdownLine(
                        now: context.date,
                        target: milestone.endsAt ?? milestone.startsAt
                    )
                }

                HStack(spacing: 10) {
                    Button {
                        model.toggleMilestone(
                            journeyID: journey.id,
                            milestoneID: milestone.id
                        )
                    } label: {
                        Label("Mark done", systemImage: "checkmark")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    if let url = milestone.officialURL {
                        Link(destination: url) {
                            Image(systemName: "arrow.up.right")
                                .frame(width: 46, height: 46)
                        }
                        .buttonStyle(.bordered)
                        .accessibilityLabel("Open verified official source")
                    }
                }
            }
        }
    }

    private func journeyStrip(_ journey: ConcertJourney) -> some View {
        let progress = JourneyLifecycle.progress(in: journey)
        return PassportCard {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color(hex: journey.artist.accentHex).opacity(0.16))
                    Text(journey.venue.market)
                        .font(.caption.monospaced().weight(.bold))
                        .foregroundStyle(Color(hex: journey.artist.accentHex))
                }
                .frame(width: 52, height: 52)

                VStack(alignment: .leading, spacing: 5) {
                    Text(journey.artist.name)
                        .font(.headline)
                    Text("\(journey.venue.city) · \(journey.tourName)")
                        .font(.subheadline)
                        .foregroundStyle(PassportTheme.muted)
                }

                Spacer()

                Text("\(progress.complete)/\(progress.total)")
                    .font(.subheadline.monospacedDigit().weight(.semibold))
                    .foregroundStyle(PassportTheme.muted)
            }
        }
    }
}

private struct CountdownLine: View {
    let now: Date
    let target: Date

    private var parts: (hours: Int, minutes: Int, seconds: Int) {
        let remaining = max(0, Int(target.timeIntervalSince(now)))
        return (remaining / 3_600, remaining % 3_600 / 60, remaining % 60)
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(String(format: "%02d:%02d:%02d", parts.hours, parts.minutes, parts.seconds))
                .font(.system(size: 30, weight: .semibold, design: .monospaced))
                .contentTransition(.numericText())
            Text("remaining")
                .font(.caption)
                .foregroundStyle(PassportTheme.muted)
        }
        .foregroundStyle(PassportTheme.text)
    }
}
