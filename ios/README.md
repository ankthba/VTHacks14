# PillPile for iOS

> **Status:** this app is the original *PillPile* medication checker (the
> `/pillpile` surface of the web app). It has not been ported to the Aperta
> explain tool, which is web-first because the clinician turns a laptop or
> tablet toward the patient. It still builds, runs, and passes its UI tests
> against the same server.

A native SwiftUI client for the PillPile server.

## Why a native app at all

The premise is photographing bottles on a kitchen table, and that is a phone
action, not a laptop action. The native app also gets two things the web app
cannot:

- **The real camera**, rather than a file picker.
- **Offline read-aloud.** `AVSpeechSynthesizer` needs no API key and no network,
  so the accessibility feature — the one that matters most for the intended user
  — cannot be taken out by conference wifi or a missing ElevenLabs key.

## What it deliberately does NOT do

**No clinical logic lives on the phone.** RxNorm normalization, the
deterministic duplicate and dose checks, FDA label retrieval and reconciliation
all run server-side and come back as JSON. The app is a camera, a renderer and a
voice.

That is a correctness decision, not a laziness one: two implementations of the
acetaminophen check would eventually disagree, and the whole claim of this
project is that the dangerous finding is *computed*. There is exactly one
implementation of it.

## Build and run

```bash
cd ios
xcodegen generate
open PillPile.xcodeproj
```

Or from the command line:

```bash
xcodebuild -project PillPile.xcodeproj -scheme PillPile \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/PillPile-cc build
```

**Do not put derived data inside this repo.** `~/Documents` is iCloud-synced on
the development Mac, and iCloud stamps `com.apple.fileprovider.fpfs#P` onto the
built `.app` faster than `xattr -cr` can strip it, so codesign fails with
"resource fork, Finder information, or similar detritus not allowed". Building
to `~/Library/Developer/Xcode/DerivedData` avoids the synced folder entirely.

## Pointing it at a server

The app talks to `http://localhost:3000` by default, which the simulator reaches
on the host Mac. Change it under the gear icon — use the deployed URL when
running on a physical phone.

`NSAllowsLocalNetworking` is set so a plain-HTTP dev server works; a deployed
HTTPS URL needs no exception.

## Files

| File | |
|---|---|
| `Models.swift` | Codable mirrors of the server's JSON |
| `APIClient.swift` | Extract, analyze, demo loading; downscales photos before upload |
| `ContentView.swift` | The three stages: start, review, results |
| `FindingCardView.swift` | One finding, with its provenance badge |
| `ReconcileView.swift` | Discharge list vs bottles |
| `ReadAloud.swift` | `AVSpeechSynthesizer` wrapper |
| `Theme.swift` | Palette shared with the web app |
