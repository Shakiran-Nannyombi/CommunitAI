/**
 * Property 14: Sentiment color mapping
 * Validates: Requirements 8.6
 *
 * For every classification value, SentimentCard must render the badge with
 * the correct CSS color class.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import SentimentCard from "@/components/SentimentCard";
import type { SentimentReport } from "@/lib/api";

const COLOR_MAP: Record<string, string> = {
    positive: "bg-green-100",
    neutral: "bg-yellow-100",
    negative: "bg-red-100",
};

function makeReport(
    classification: SentimentReport["classification"]
): SentimentReport {
    return { id: "1", meeting_id: "m1", classification, signals: [] };
}

test("Property 14: correct color class for every classification", () => {
    fc.assert(
        fc.property(
            fc.constantFrom("positive", "neutral", "negative") as fc.Arbitrary<
                SentimentReport["classification"]
            >,
            (classification) => {
                const { unmount } = render(
                    <SentimentCard report={makeReport(classification)} />
                );
                const badge = screen.getByTestId("sentiment-classification");
                expect(badge.className).toContain(COLOR_MAP[classification]);
                unmount();
            }
        ),
        { numRuns: 20 }
    );
});
