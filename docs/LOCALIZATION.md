# Localization and Content System

**Launch locales:** English (`en`), Simplified Chinese (`zh-CN` / `zh-Hans`), Traditional Chinese (`zh-TW` / `zh-Hant`)

## Product rules

- Translate intent, not word order. Simplified and Traditional Chinese are reviewed as separate product voices.
- Keep artist, tour, agency, venue, seller, and source proper nouns in their official form unless an authoritative localized alias exists.
- Ticket lifecycle terms are controlled vocabulary. `registration`, `presale`, `lottery`, `lottery result`, `payment`, `general sale`, and `ticket delivery` must not be collapsed into a generic “sale.”
- Every critical time is formatted in the venue time zone. Numeric-only ambiguous dates are prohibited.
- Uncertainty and source authority stay explicit in every locale. Translation must never strengthen “illustrative,” “reported,” or “partner access required” into a promise.
- Variables are inserted through named placeholders on Web and positional format strings on iOS; UI code does not concatenate translated sentence fragments.

## Web implementation

- `apps/web/lib/i18n/catalog/` is the only source for interface copy.
- English defines the `MessageKey` type. Both Chinese catalogs must satisfy the exact same key set at compile time.
- `PreferencesProvider` owns locale, theme, date locale, cookies, local storage, and document language.
- First visit uses `Accept-Language`; an explicit selection persists for one year.
- Language and appearance changes are immediate and do not require a route reload.

## iOS implementation

- `Localizable.xcstrings` is the translation source; `L10n` provides reviewed semantic accessors.
- iOS follows the system’s per-app language setting. This preserves native onboarding, accessibility, widgets, notifications, and Settings behavior.
- Light and dark appearances use UIKit semantic colors and automatically follow the user’s system appearance.
- Dates use `Locale.autoupdatingCurrent` while applying the event venue time zone.

## Review checklist

1. Compile-time catalog completeness passes.
2. English, Simplified Chinese, and Traditional Chinese are inspected with real-length content.
3. Navigation, countdowns, tables, filters, and empty states do not truncate at supported breakpoints or Dynamic Type sizes.
4. Placeholder order and plural/count copy are verified.
5. Source authority and illustrative-data labels remain visible.
6. No operational string is embedded directly in a component unless it is a proper noun or stable code such as `HKG`.
