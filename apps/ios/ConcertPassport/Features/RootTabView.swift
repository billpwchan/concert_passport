import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "sparkle")
                }

            AtlasView()
                .tabItem {
                    Label("Atlas", systemImage: "map")
                }

            PlansView()
                .tabItem {
                    Label("Plans", systemImage: "list.bullet.rectangle.portrait")
                }

            PassportView()
                .tabItem {
                    Label("Passport", systemImage: "airplane")
                }
        }
        .toolbarBackground(PassportTheme.ink, for: .tabBar)
    }
}
