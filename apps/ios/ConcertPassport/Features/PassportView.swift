import SwiftUI

struct PassportView: View {
    @Environment(PassportModel.self) private var model

    private var distance: Int {
        JourneyLifecycle.totalDistance(for: model.stamps)
    }

    private var firstMeeting: PassportStamp? {
        model.stamps.min { $0.attendedAt < $1.attendedAt }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Eyebrow(text: "Concert Passport")
                        Text("Every city left\na mark.")
                            .font(.system(size: 38, weight: .semibold, design: .rounded))
                            .tracking(-1.1)
                    }

                    statsGrid

                    if let firstMeeting {
                        relationshipCard(firstMeeting)
                    }

                    VStack(alignment: .leading, spacing: 14) {
                        Text("Stamps")
                            .font(.title3.weight(.semibold))

                        LazyVGrid(
                            columns: [GridItem(.flexible()), GridItem(.flexible())],
                            spacing: 12
                        ) {
                            ForEach(model.stamps) { stamp in
                                StampView(stamp: stamp)
                            }
                        }
                    }

                    Text("Distances shown are entered journey distances in illustrative records.")
                        .font(.caption)
                        .foregroundStyle(PassportTheme.muted)
                }
                .padding(18)
                .padding(.bottom, 32)
            }
            .background(PassportTheme.ink.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var statsGrid: some View {
        HStack(spacing: 10) {
            PassportStat(value: "\(model.stamps.count)", label: "shows")
            PassportStat(value: "\(Set(model.stamps.map(\.city)).count)", label: "cities")
            PassportStat(value: distance.formatted(), label: "km")
        }
    }

    private func relationshipCard(_ stamp: PassportStamp) -> some View {
        PassportCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundStyle(PassportTheme.violet)
                    Spacer()
                    Text("MEMORY 001")
                        .font(.caption2.monospaced().weight(.bold))
                        .foregroundStyle(PassportTheme.muted)
                }
                Text("You first met \(stamp.artist.name)\nin \(stamp.city).")
                    .font(.title2.weight(.semibold))
                Text(stamp.attendedAt.formatted(date: .long, time: .omitted))
                    .font(.subheadline)
                    .foregroundStyle(PassportTheme.muted)
            }
        }
    }
}

private struct PassportStat: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(value)
                .font(.title3.monospacedDigit().weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label.uppercased())
                .font(.caption2.weight(.bold))
                .tracking(1)
                .foregroundStyle(PassportTheme.muted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PassportTheme.panel)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct StampView: View {
    let stamp: PassportStamp

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Color(hex: stamp.artist.accentHex), style: StrokeStyle(
                        lineWidth: 2,
                        dash: [4, 3]
                    ))
                Circle()
                    .stroke(Color(hex: stamp.artist.accentHex).opacity(0.28), lineWidth: 8)
                    .padding(7)
                VStack(spacing: 2) {
                    Text(stamp.market)
                        .font(.caption2.monospaced().weight(.bold))
                    Text(stamp.city.uppercased())
                        .font(.caption.weight(.black))
                        .minimumScaleFactor(0.65)
                        .lineLimit(1)
                    Text(stamp.attendedAt.formatted(.dateTime.year()))
                        .font(.caption2.monospaced())
                }
                .foregroundStyle(Color(hex: stamp.artist.accentHex))
            }
            .frame(width: 104, height: 104)
            .rotationEffect(.degrees(stamp.id.hashValue.isMultiple(of: 2) ? -4 : 4))

            VStack(spacing: 3) {
                Text(stamp.artist.name)
                    .font(.caption.weight(.bold))
                Text(stamp.venue)
                    .font(.caption2)
                    .foregroundStyle(PassportTheme.muted)
                    .lineLimit(1)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(PassportTheme.panel)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
