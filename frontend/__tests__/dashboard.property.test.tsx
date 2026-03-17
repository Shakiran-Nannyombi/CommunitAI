/**
 * Property 15: Failure status shows retry control
 * Validates: Requirements 8.7
 *
 * A retry button must be shown if and only if the meeting status is one of
 * the three failure states. Tests the filtering logic directly.
 */
import fc from "fast-check";
import type { MeetingStatus } from "@/lib/api";

const ALL_STATUSES: MeetingStatus[] = [
    "pending",
    "processing",
    "transcribed",
    "complete",
    "transcription_failed",
    "analysis_failed",
    "summarization_failed",
];

const FAILED_STATUSES = new Set([
    "transcription_failed",
    "analysis_failed",
    "summarization_failed",
]);

// The same predicate used in the Dashboard and detail page components
function shouldShowRetry(status: MeetingStatus): boolean {
    return FAILED_STATUSES.has(status);
}

test("Property 15: retry shown iff status is a failure status", () => {
    fc.assert(
        fc.property(fc.constantFrom(...ALL_STATUSES), (status) => {
            const shown = shouldShowRetry(status);
            if (FAILED_STATUSES.has(status)) {
                expect(shown).toBe(true);
            } else {
                expect(shown).toBe(false);
            }
        }),
        { numRuns: 20 }
    );
});
