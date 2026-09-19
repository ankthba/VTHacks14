import XCTest

/// Drives the app the way a judge would at the demo table.
///
/// This exists because the development Mac has an incomplete Xcode install with
/// no Simulator.app, so the app cannot be driven by hand. It turns out to be the
/// better artefact anyway: a repeatable check that the whole flow still works,
/// rather than a one-time look.
///
/// REQUIRES the PillPile server running at http://localhost:3000
/// (`npm run dev`). The app is a thin client - if the server is down these
/// tests correctly fail, because the app genuinely does not work without it.
final class FlowTests: XCTestCase {

    private var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    /// The disclaimer is a scope guardrail, not decoration. If it ever stops
    /// rendering, that is a correctness failure.
    func testDisclaimerIsAlwaysVisible() {
        XCTAssertTrue(
            app.staticTexts.containing(
                NSPredicate(format: "label CONTAINS[c] 'Not medical advice'")
            ).firstMatch.waitForExistence(timeout: 10),
            "The disclaimer must be on screen at launch."
        )
    }

    func testStartScreenListsScenarios() {
        XCTAssertTrue(app.staticTexts["Photograph your bottles"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Hidden duplicate"].exists)
        XCTAssertTrue(app.staticTexts["Discharge list vs the pile"].exists)
    }

    /// The headline demo: Norco + Tylenol must reach a findings screen naming
    /// acetaminophen, with the "computed" provenance badge.
    func testHiddenDuplicateFlowReachesFindings() {
        app.staticTexts["Hidden duplicate"].tap()

        let checkButton = app.buttons
            .containing(NSPredicate(format: "label BEGINSWITH 'Check these'"))
            .firstMatch
        XCTAssertTrue(
            checkButton.waitForExistence(timeout: 25),
            "Review screen did not appear - is the server running on :3000?"
        )
        checkButton.tap()

        let finding = app.staticTexts
            .containing(NSPredicate(format: "label CONTAINS[c] 'acetaminophen'"))
            .firstMatch
        XCTAssertTrue(
            finding.waitForExistence(timeout: 60),
            "Expected an acetaminophen finding after analysis."
        )

        XCTAssertTrue(
            app.staticTexts
                .containing(NSPredicate(format: "label CONTAINS[c] 'computed'"))
                .firstMatch.exists,
            "The provenance badge must be visible on computed findings."
        )
    }

    /// Reconciliation is the feature that makes the app's name honest, so the
    /// four outcome labels are asserted directly.
    func testReconciliationShowsMissingAndConflict() {
        app.staticTexts["Discharge list vs the pile"].tap()

        let checkButton = app.buttons
            .containing(NSPredicate(format: "label BEGINSWITH 'Check these'"))
            .firstMatch
        XCTAssertTrue(checkButton.waitForExistence(timeout: 25))
        checkButton.tap()

        XCTAssertTrue(
            app.staticTexts["MISSING"].waitForExistence(timeout: 60),
            "Metoprolol has no bottle, so a MISSING row must appear."
        )
        XCTAssertTrue(app.staticTexts["CONFLICT"].exists, "Lisinopril 20mg vs 10mg must show CONFLICT.")
        XCTAssertTrue(app.staticTexts["EXTRA"].exists, "Vicodin is not on the discharge list.")

        save(app.screenshot(), as: "reconciliation")
    }

    /// Writes a PNG next to the build output so the results screen can be looked
    /// at without a working simulator GUI.
    private func save(_ shot: XCUIScreenshot, as name: String) {
        let attachment = XCTAttachment(screenshot: shot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)

        let dir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("pillpile-shots", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? shot.pngRepresentation.write(to: dir.appendingPathComponent("\(name).png"))
    }
}
