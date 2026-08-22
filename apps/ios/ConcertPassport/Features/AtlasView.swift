import MapKit
import SwiftUI

struct AtlasView: View {
    @Environment(PassportModel.self) private var model
    @State private var search = ""
    @State private var market = "All"

    private let markets = ["All", "SG", "HK", "JP", "TW", "TH", "KR", "MY", "PH", "ID", "VN", "AU"]

    private var visibleJourneys: [ConcertJourney] {
        model.journeys.filter { journey in
            let matchesMarket = market == "All" || journey.venue.market == market
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
                        Eyebrow(text: "Asia-Pacific")
                        Text("Follow the tour,\nnot a radius.")
                            .font(.system(size: 36, weight: .semibold, design: .rounded))
                            .tracking(-1)
                    }

                    TextField("Artist or city", text: $search)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, 16)
                        .frame(height: 48)
                        .background(PassportTheme.panel)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(markets, id: \.self) { item in
                                Button(item) { market = item }
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
                    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                    .overlay(alignment: .topTrailing) {
                        Text("ILLUSTRATIVE")
                            .font(.caption2.monospaced().weight(.bold))
                            .padding(.horizontal, 9)
                            .padding(.vertical, 6)
                            .background(.black.opacity(0.55))
                            .clipShape(Capsule())
                            .padding(12)
                    }

                    ForEach(visibleJourneys) { journey in
                        PassportCard {
                            HStack {
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
            .foregroundStyle(selected ? PassportTheme.ink : PassportTheme.muted)
            .padding(.horizontal, 14)
            .frame(height: 36)
            .background(selected ? PassportTheme.text : PassportTheme.panel)
            .clipShape(Capsule())
            .opacity(configuration.isPressed ? 0.72 : 1)
    }
}
