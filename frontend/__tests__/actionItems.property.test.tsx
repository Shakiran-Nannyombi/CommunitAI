/**
 * Property 12: Pending action items filter
 * Validates: Requirements 8.2, 8.5
 *
 * ActionItemList must render exactly the items where completed=false.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import ActionItemList from "@/components/ActionItemList";
import type { ActionItem } from "@/lib/api";

// Mock the API call so ActionItemCard doesn't need a real backend
jest.mock("@/lib/api", () => ({
    ...jest.requireActual("@/lib/api"),
    completeActionItem: jest.fn(),
}));

function makeItem(id: string, completed: boolean): ActionItem {
    return {
        id,
        meeting_id: "m1",
        description: `Task ${id}`,
        assignee: "Alice",
        due_date: null,
        completed,
        created_at: new Date().toISOString(),
    };
}

test("Property 12: renders only pending (completed=false) items", () => {
    fc.assert(
        fc.property(
            fc.array(fc.boolean(), { minLength: 0, maxLength: 10 }),
            (completedFlags) => {
                const items = completedFlags.map((c, i) =>
                    makeItem(String(i), c)
                );
                const pendingCount = items.filter((it) => !it.completed).length;

                const { unmount } = render(<ActionItemList items={items} />);

                const cards = screen.queryAllByRole("listitem");
                expect(cards).toHaveLength(pendingCount);

                unmount();
            }
        ),
        { numRuns: 20 }
    );
});
