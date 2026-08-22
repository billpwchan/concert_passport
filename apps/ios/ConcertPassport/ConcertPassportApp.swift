import SwiftUI

@main
struct ConcertPassportApp: App {
    @State private var model = PassportModel()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(model)
                .preferredColorScheme(.dark)
                .tint(PassportTheme.violet)
        }
    }
}
