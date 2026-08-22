import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label(L10n.navToday, systemImage: "clock")
                }

            AtlasView()
                .tabItem {
                    Label(L10n.navAtlas, systemImage: "map")
                }

            PlansView()
                .tabItem {
                    Label(L10n.navPlans, systemImage: "list.bullet.rectangle.portrait")
                }

            PassportView()
                .tabItem {
                    Label(L10n.navPassport, systemImage: "book.closed")
                }
        }
        .toolbarBackground(.visible, for: .tabBar)
    }
}
