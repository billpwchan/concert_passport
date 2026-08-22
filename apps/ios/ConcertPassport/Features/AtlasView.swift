import MapKit
import SwiftUI

struct AtlasView: View {
    @Environment(PassportModel.self) private var model
    @State private var search = ""
    @State private var market = "ALL"

    private let markets = ["ALL", "SG", "HK", "JP", "TW", "TH", "KR", "MY", "PH", "ID", "VN", "AU"]

    private var visibleJourneys: [ConcertJourney] {
        model.journeys.filter { journey in
            let matchesMarket = market == "ALL" || journey.venue.market == market
            let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
            let matchesQuery = query.isEmpty ||
                journey.artist.name.localizedCaseInsensitiveContains(query) ||
                journey.venue.city.localizedCaseInsensitiveContains(query)
            return matchesMarket && matchesQuery
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Eyebrow(text: L10n.atlasEyebrow)
                        Text(L10n.atlasTitle)
                            .font(.system(size: 38, weight: .semibold))
                            .tracking(-1.3)
                    }

                    TextField(L10n.artistOrCity, text: $search)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, 16)
                        .frame(height: 48)
                        .background(PassportTheme.panel)
                        .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 5, style: .continuous)
                                .stroke(PassportTheme.line, lineWidth: 1)
                        }

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(markets, id: \.self) { item in
                                Button(item == "ALL" ? L10n.allMarkets : item) { market = item }
                                    .buttonStyle(MarketPillStyle(selected: market == item))
                            }
                        }
                    }

                    Map(initialPosition: .region(MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: 20, longitude: 112),
                        span: MKCoordinateSpan(latitudeDelta: 42, longitudeDelta: 55)
                    ))) {
                        ForEach(visibleJourneys) { journey in
                            Annotation(
                                journey.artist.name,
                                coordinate: CLLocationCoordinate2D(
                                    latitude: journey.venue.latitude,
                                    longitude: journey.venue.longitude
                                )
                            ) {
                                VStack(spacing: 4) {
                                    Circle()
                                        .fill(Color(hex: journey.artist.accentHex))
                                        .frame(width: 16, height: 16)
                                        .overlay(Circle().stroke(.white.opacity(0.9), lineWidth: 2))
                                    Text(journey.venue.city)
                                        .font(.caption2.weight(.bold))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 4)
                                        .background(.ultraThinMaterial)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    .mapStyle(.standard)
                    .frame(height: 360)
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                    .overlay(alignment: .topTrailing) {
                        Text(L10n.illustrative.uppercased())
                            .font(.caption2.monospaced().weight(.bold))
                            .padding(.horizontal, 9)
                            .padding(.vertical, 6)
                            .background(.black.opacity(0.55))
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .padding(12)
                    }

                    Eyebrow(text: L10n.insideWindow)
                        .padding(.top, 8)

                    LazyVStack(spacing: 0) {
                        ForEach(visibleJourneys) { journey in
                            HStack {
                                Rectangle()
                                    .fill(Color(hex: journey.artist.accentHex))
                                    .frame(width: 6, height: 36)
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(journey.artist.name)
                                        .font(.headline)
                                    Text("\(journey.venue.city) · \(journey.venue.name)")
                                        .font(.caption)
                                        .foregroundStyle(PassportTheme.muted)
                                }
                                Spacer()
                                Text(journey.performanceStartsAt.venueLabel(
                                    timeZoneIdentifier: journey.venue.timeZoneIdentifier
                                ))
                                .font(.caption.monospacedDigit().weight(.semibold))
                                .foregroundStyle(PassportTheme.violet)
                            }
                            .padding(.vertical, 16)
                            .overlay(alignment: .top) {
                                Rectangle().fill(PassportTheme.line).frame(height: 0.5)
                            }
                        }
                    }
                }
                .padding(18)
                .padding(.bottom, 28)
            }
            .background(PassportTheme.ink.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}

private struct MarketPillStyle: ButtonStyle {
    let selected: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.monospaced().weight(.semibold))
            .foregroundStyle(selected ? PassportTheme.text : PassportTheme.muted)
            .padding(.horizontal, 14)
            .frame(height: 36)
            .background(selected ? PassportTheme.panel : .clear)
            .clipShape(RoundedRectangle(cornerRadius: 3))
            .overlay {
                RoundedRectangle(cornerRadius: 3)
                    .stroke(selected ? PassportTheme.strongLine : PassportTheme.line, lineWidth: 1)
            }
            .opacity(configuration.isPressed ? 0.72 : 1)
    }
}
