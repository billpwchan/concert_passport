# Concert Passport for iOS

Native SwiftUI and MapKit client targeting iOS 17 and later.

Open `ConcertPassport.xcodeproj`, select the `ConcertPassport` scheme, and set a development team for device builds. Debug uses `http://localhost:3000/` through `CONCERT_PASSPORT_API_BASE_URL` in `Resources/Info.plist`.

`Package.swift` exposes the Foundation-only `ConcertPassportCore` target for fast lifecycle tests:

```bash
swift test
```

The checked-in sample journeys and stamps are illustrative. Current native journey completion is in-memory; do not connect mobile write actions to dispatcher authentication headers.
