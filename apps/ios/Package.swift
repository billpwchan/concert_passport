// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "ConcertPassportCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "ConcertPassportCore", targets: ["ConcertPassportCore"]),
    ],
    targets: [
        .target(
            name: "ConcertPassportCore",
            path: "ConcertPassport/Core"
        ),
        .testTarget(
            name: "ConcertPassportCoreTests",
            dependencies: ["ConcertPassportCore"],
            path: "Tests/ConcertPassportCoreTests"
        ),
    ]
)
