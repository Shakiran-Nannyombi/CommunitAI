"""
Demo data seed script for CommunitAI.

Run from project root:
    backend/.venv/bin/python -m backend.seed_demo

Idempotent — safe to run multiple times. Skips seeding if the demo user
already has workspaces.
"""

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db import SessionLocal
from backend.models.db import (
    ActionItem,
    Meeting,
    PlannerMessage,
    SentimentReport,
    Summary,
    Transcript,
    User,
    Workspace,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _ago(weeks: int = 0, days: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(weeks=weeks, days=days)


def _date_ago(weeks: int = 0, days: int = 0) -> date:
    return (datetime.now(timezone.utc) - timedelta(weeks=weeks, days=days)).date()


# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

WORKSPACES = [
    {"name": "Product Team", "icon_emoji": "🚀"},
    {"name": "Engineering", "icon_emoji": "⚙️"},
    {"name": "Marketing", "icon_emoji": "📣"},
]

# Each meeting: (title, weeks_ago, sentiment, transcript, summary, action_items)
# action_items: list of (description, assignee, due_date_offset_days, completed)
MEETINGS_BY_WORKSPACE = {
    "Product Team": [
        (
            "Q2 Roadmap Planning",
            12,
            "positive",
            """Alice: Good morning everyone. Let's kick off Q2 planning. We need to finalise the roadmap by end of week.
Bob: I've drafted the feature list. Top priorities are the new onboarding flow, the analytics dashboard, and the mobile push notifications.
Alice: Great. The onboarding flow is critical — we saw a 30% drop-off at step 3 last quarter.
Carol: I can own the onboarding redesign. I'll need UX support from Dave.
Dave: Happy to help. I can have wireframes ready by Thursday.
Bob: For analytics, we need to decide on the charting library first. I'm leaning towards Recharts.
Alice: Let's go with Recharts. Bob, can you spike it this week?
Bob: Sure. I'll have a proof of concept by Friday.
Alice: Push notifications — that's a bigger lift. Let's scope it properly before committing.
Carol: Agreed. I'll write up a technical spec and share it before next week's sync.
Alice: Perfect. Let's wrap up. Action items: Carol owns onboarding, Dave does wireframes by Thursday, Bob spikes Recharts by Friday, Carol writes push notification spec by next Monday.""",
            """The team aligned on Q2 priorities: onboarding flow redesign, analytics dashboard with Recharts, and a scoped push notification feature. Key decisions included selecting Recharts as the charting library and assigning Carol to lead onboarding with UX support from Dave. The push notification feature will be properly scoped before commitment.""",
            [
                ("Redesign onboarding flow step 3", "Carol", 14, True),
                ("Create wireframes for new onboarding", "Dave", 5, True),
                ("Spike Recharts for analytics dashboard", "Bob", 7, True),
                ("Write push notification technical spec", "Carol", 10, False),
            ],
        ),
        (
            "Sprint 14 Retrospective",
            10,
            "neutral",
            """Alice: Let's do our retro for sprint 14. What went well?
Bob: We shipped the Recharts integration on time. The proof of concept turned into a full implementation.
Carol: The onboarding wireframes were well received by stakeholders. Dave did a great job.
Dave: Thanks. What didn't go well — I think our estimation was off. The API integration took twice as long as expected.
Alice: Agreed. We need to add a buffer for third-party integrations going forward.
Bob: Also, our staging environment was down for two days. That blocked QA significantly.
Alice: I'll follow up with DevOps on the staging reliability. Carol, can you update our estimation template to include integration buffers?
Carol: Will do. I'll have it ready before sprint 15 planning.
Alice: Good. Let's also do a quick shoutout — Dave's wireframes were excellent and the client loved them.""",
            """Sprint 14 delivered the Recharts integration and well-received onboarding wireframes. Key issues were underestimation of API integration complexity and staging environment downtime blocking QA. Actions include updating the estimation template and improving staging reliability.""",
            [
                ("Update estimation template with integration buffers", "Carol", 3, True),
                ("Follow up with DevOps on staging reliability", "Alice", 5, False),
                ("Document Recharts integration patterns", "Bob", 7, False),
            ],
        ),
        (
            "User Research Readout",
            8,
            "positive",
            """Alice: Thanks everyone for joining. We have results from our user research study — 24 participants over two weeks.
Eve: The headline finding is that users love the meeting summary feature. 92% rated it as very useful.
Alice: That's fantastic. What about pain points?
Eve: The top pain point is the lack of search. Users want to search across all their meeting notes.
Bob: Search is on the backlog. This gives us strong justification to prioritise it.
Eve: Second pain point — users want to share summaries directly to Slack. Several mentioned it unprompted.
Alice: We're already building Slack integration. Good to have validation.
Carol: The sentiment analysis feature had mixed reactions. Some users didn't understand what it was for.
Eve: We need better in-app explanation. A tooltip or onboarding hint would help.
Alice: Carol, can you add a tooltip to the sentiment badge?
Carol: Yes, I'll add it in the next sprint.""",
            """User research with 24 participants showed 92% satisfaction with meeting summaries. Key pain points identified: lack of search functionality and desire for Slack sharing. Sentiment analysis needs better in-app explanation. Slack integration validated by user demand.""",
            [
                ("Add search to product backlog with high priority", "Bob", 7, True),
                ("Add tooltip explaining sentiment analysis", "Carol", 5, True),
                ("Share research findings with full team", "Eve", 3, True),
            ],
        ),
        (
            "Sprint 16 Planning",
            6,
            "positive",
            """Alice: Sprint 16 planning. We have 34 story points capacity. Let's go through the backlog.
Bob: Top of the backlog is the Slack integration — we have the backend done, need the frontend.
Carol: I've estimated the frontend at 8 points. That includes the webhook settings UI and the share button.
Alice: Let's commit to that. What else?
Bob: Search is 13 points. That's a stretch goal for this sprint.
Dave: I can help with search if Carol needs it.
Carol: I'll take the first 8 points of search — the indexing part. Dave can do the UI.
Alice: Good. That's 21 points committed, 13 stretch. Bob, what else is in the backlog?
Bob: Impact dashboard is 10 points. That's the metrics view.
Alice: Let's add that as a second stretch goal. Total committed 21, stretch 23.
Bob: Sounds good. I'll update the board.""",
            """Sprint 16 committed to Slack integration frontend (8 points) with search indexing and impact dashboard as stretch goals. Total capacity 34 points with 21 committed and 23 in stretch goals. Carol leads Slack frontend, Dave supports search UI.""",
            [
                ("Build Slack webhook settings UI", "Carol", 10, True),
                ("Implement meeting search indexing", "Carol", 10, False),
                ("Build search results UI", "Dave", 12, False),
                ("Design impact dashboard layout", "Bob", 8, False),
            ],
        ),
        (
            "Stakeholder Demo Prep",
            4,
            "positive",
            """Alice: We have the stakeholder demo in 4 days. Let's make sure everything is polished.
Bob: The Slack integration is live. I tested it this morning — works great.
Carol: The onboarding flow is deployed. We fixed the step 3 drop-off issue.
Alice: Excellent. What's the demo flow?
Carol: I suggest: login → dashboard → create meeting → show completed meeting with summary → share to Slack.
Alice: Perfect. Dave, can you prepare the demo account with some realistic data?
Dave: Yes, I'll set up a demo workspace with 5-6 meetings and realistic action items.
Bob: We should also show the impact dashboard. It looks impressive with enough data.
Alice: Good point. Dave, make sure the demo account has at least 8 weeks of meeting history.
Dave: Will do. I'll have it ready by tomorrow morning.
Alice: Let's do a dry run Thursday at 2pm. Everyone block your calendars.""",
            """Team prepared for stakeholder demo in 4 days. Demo flow agreed: login → dashboard → meeting creation → completed meeting with summary → Slack share → impact dashboard. Dave to prepare demo account with 8 weeks of realistic data. Dry run scheduled Thursday 2pm.""",
            [
                ("Set up demo account with realistic data", "Dave", 2, True),
                ("Prepare demo script and talking points", "Alice", 2, True),
                ("Run dry run demo Thursday 2pm", "Alice", 1, True),
            ],
        ),
        (
            "Weekly Sync",
            2,
            "neutral",
            """Alice: Quick weekly sync. Bob, any blockers?
Bob: The search feature is taking longer than expected. The full-text search index is slow on large transcripts.
Alice: How much longer?
Bob: Probably 3 more days. I'm looking at using PostgreSQL's tsvector for better performance.
Alice: Keep me posted. Carol?
Carol: Slack integration is fully deployed and working. Had one user report an issue with the webhook URL validation — fixed it this morning.
Alice: Good catch. Dave?
Dave: Impact dashboard is 70% done. The sentiment trend chart looks great. Should be done by end of week.
Alice: Great progress everyone. Any other business?
Bob: We should think about the mobile app. Several enterprise clients have asked about it.
Alice: Let's add it to the Q3 planning agenda. I'll create a ticket.""",
            """Weekly sync covered search performance issues (Bob investigating tsvector), Slack integration fully deployed with minor webhook validation fix, and impact dashboard 70% complete. Mobile app added to Q3 planning agenda following enterprise client requests.""",
            [
                ("Investigate PostgreSQL tsvector for search performance", "Bob", 3, False),
                ("Complete impact dashboard sentiment chart", "Dave", 4, False),
                ("Add mobile app to Q3 planning agenda", "Alice", 7, False),
            ],
        ),
    ],
    "Engineering": [
        (
            "Architecture Review — Microservices Migration",
            11,
            "neutral",
            """Frank: Thanks for joining the architecture review. We're evaluating whether to migrate from our monolith to microservices.
Grace: I've done an analysis. The main bottleneck is the transcription pipeline — it blocks the entire app during processing.
Frank: That's the strongest case for extraction. What would the migration look like?
Grace: Phase 1: extract the agent pipeline as a separate service. We've already started this with the agent server.
Henry: The agent server is working well. Latency is down 40% since we moved it out.
Frank: Good data point. Phase 2?
Grace: Phase 2 would be the storage service — R2 uploads are synchronous right now.
Henry: I can make those async with a queue. Probably 2 weeks of work.
Frank: Let's plan for that in Q3. For now, let's document the current architecture properly.
Grace: I'll write the architecture decision record by end of next week.""",
            """Architecture review concluded that microservices migration should proceed in phases. Phase 1 (agent pipeline extraction) is complete with 40% latency improvement. Phase 2 (async storage service) planned for Q3. Architecture decision record to be written.""",
            [
                ("Write architecture decision record", "Grace", 10, True),
                ("Design async storage queue for R2 uploads", "Henry", 14, False),
                ("Document current service boundaries", "Frank", 7, True),
            ],
        ),
        (
            "Security Audit Review",
            9,
            "negative",
            """Frank: We got the results from the external security audit. There are some issues we need to address.
Grace: How serious?
Frank: Two medium severity findings. First — JWT tokens don't expire. We need to add expiry.
Henry: That's a quick fix. I can add a 7-day expiry today.
Frank: Second finding — the API doesn't rate limit authentication endpoints. We're vulnerable to brute force.
Grace: I'll implement rate limiting on the auth routes. I'll use slowapi.
Frank: Good. There's also a low severity finding — we're logging full request bodies which could expose passwords.
Henry: I'll audit the logging and redact sensitive fields.
Frank: These need to be fixed before we onboard enterprise clients. Target: end of this week.
Grace: Understood. I'll prioritise rate limiting today.""",
            """Security audit identified two medium severity issues: missing JWT expiry and no rate limiting on auth endpoints. One low severity issue: sensitive data in logs. All three to be fixed before enterprise client onboarding, targeting end of week.""",
            [
                ("Add JWT token expiry (7 days)", "Henry", 1, True),
                ("Implement rate limiting on auth endpoints", "Grace", 2, True),
                ("Audit and redact sensitive fields from logs", "Henry", 3, True),
                ("Re-run security scan to verify fixes", "Frank", 5, True),
            ],
        ),
        (
            "Database Performance Review",
            7,
            "neutral",
            """Frank: We're seeing slow queries on the meetings endpoint. Let's review.
Henry: I ran EXPLAIN ANALYZE on the main queries. The meetings list query is doing a full table scan.
Grace: We need an index on user_id and created_at.
Henry: I've already written the migration. It's a composite index — should bring query time from 800ms to under 10ms.
Frank: Let's get that deployed today. What else?
Henry: The action items query joins three tables without indexes on the foreign keys.
Grace: I'll add indexes on meeting_id for action_items and transcripts.
Frank: Good. Any other findings?
Henry: The sentiment_reports table has no index on meeting_id either. Same fix.
Grace: I'll bundle all the index migrations into one PR.
Frank: Target: deployed by end of day. This is blocking our performance SLA.""",
            """Database performance review identified missing indexes causing slow queries. Composite index on meetings(user_id, created_at) will reduce query time from 800ms to under 10ms. Additional indexes needed on foreign keys across action_items, transcripts, and sentiment_reports tables.""",
            [
                ("Add composite index on meetings(user_id, created_at)", "Henry", 1, True),
                ("Add indexes on action_items.meeting_id and transcripts.meeting_id", "Grace", 1, True),
                ("Add index on sentiment_reports.meeting_id", "Grace", 1, True),
                ("Verify query performance after index deployment", "Frank", 2, True),
            ],
        ),
        (
            "CI/CD Pipeline Improvements",
            5,
            "positive",
            """Frank: Our CI pipeline is taking 18 minutes. Industry standard is under 5. Let's fix it.
Henry: The main bottleneck is the test suite — it's running all tests sequentially.
Grace: We can parallelise with pytest-xdist. I've tested it locally — brings it down to 6 minutes.
Frank: That's a big improvement. What else?
Henry: Docker build is slow because we're not caching layers properly. I can fix the Dockerfile ordering.
Grace: Also, we're installing all dependencies on every run. We should cache the venv.
Frank: Let's do all three. Henry, can you own the Docker caching?
Henry: Yes, I'll have a PR up today.
Grace: I'll do the pytest parallelisation and venv caching.
Frank: Target: under 8 minutes total. Let's review next week.""",
            """CI/CD pipeline optimisation planned to reduce build time from 18 minutes to under 8 minutes. Three improvements: pytest parallelisation with xdist (12 min → 6 min), Docker layer caching, and venv caching. Henry owns Docker changes, Grace owns test parallelisation.""",
            [
                ("Implement pytest-xdist for parallel test execution", "Grace", 3, True),
                ("Fix Docker layer caching in Dockerfile", "Henry", 2, True),
                ("Add venv caching to CI pipeline", "Grace", 3, True),
                ("Measure and document new pipeline timing", "Frank", 5, True),
            ],
        ),
        (
            "On-call Incident Review",
            3,
            "negative",
            """Frank: We had two incidents last week. Let's do a proper post-mortem.
Henry: Incident 1 — the transcription service was down for 2 hours on Tuesday. Root cause was a memory leak in the Whisper model loading.
Grace: We didn't have memory monitoring set up. That's how it went undetected.
Frank: We need memory alerts. What's the fix?
Henry: I've already patched the memory leak — we now load the model once at startup instead of per request. And I've added memory monitoring to our alerts.
Frank: Good. Incident 2?
Grace: The R2 storage endpoint returned 503s for 45 minutes on Thursday. It was a Cloudflare outage — nothing we could do.
Frank: We need a fallback for storage failures. Users shouldn't see errors for Cloudflare issues.
Henry: I can add a retry queue with exponential backoff.
Frank: Let's prioritise that. Also — we need a status page so users know when there's an outage.""",
            """Post-mortem on two incidents: transcription service memory leak (2 hours downtime, fixed with model pre-loading and memory alerts) and Cloudflare R2 outage (45 minutes, no fix possible). Actions: retry queue for storage failures and public status page.""",
            [
                ("Add retry queue with exponential backoff for R2 uploads", "Henry", 7, False),
                ("Set up public status page", "Frank", 10, False),
                ("Add memory usage alerts to monitoring", "Henry", 2, True),
                ("Document incident response runbook", "Grace", 7, False),
            ],
        ),
    ],
    "Marketing": [
        (
            "Q2 Campaign Planning",
            10,
            "positive",
            """Iris: Let's plan our Q2 marketing campaigns. We have a budget of £15,000.
Jack: I suggest we focus on three channels: content marketing, LinkedIn ads, and a product hunt launch.
Iris: Product Hunt is a great idea. When should we launch?
Jack: Mid-May would be ideal — after we have the Slack integration live.
Kate: For content marketing, I'm thinking a series of blog posts on meeting productivity. We can target the 'remote work' keyword cluster.
Iris: Good. What's the content calendar look like?
Kate: Two posts per week for 8 weeks. I'll need a writer — can we hire a freelancer?
Iris: Yes, budget £2,000 for content. Jack, what's the LinkedIn ad budget?
Jack: £8,000 for LinkedIn. I'll target HR managers and team leads at companies with 50-500 employees.
Iris: That leaves £5,000 for Product Hunt promotion and miscellaneous. Let's go.""",
            """Q2 marketing plan allocated £15,000 across three channels: LinkedIn ads (£8,000 targeting HR managers and team leads), content marketing (£2,000 for freelance writer, 2 posts/week for 8 weeks on meeting productivity), and Product Hunt launch planned for mid-May post Slack integration.""",
            [
                ("Hire freelance content writer", "Kate", 7, True),
                ("Set up LinkedIn ad campaigns", "Jack", 10, True),
                ("Create Product Hunt launch checklist", "Iris", 14, False),
                ("Write first two blog posts on meeting productivity", "Kate", 7, True),
            ],
        ),
        (
            "Product Hunt Launch Debrief",
            6,
            "positive",
            """Iris: We launched on Product Hunt yesterday. Let's review the results.
Jack: We hit #3 Product of the Day. 847 upvotes, 124 comments.
Kate: That's amazing! Website traffic is up 340% compared to last week.
Iris: Sign-ups?
Jack: 312 new sign-ups in 24 hours. Conversion rate from Product Hunt is 3.2%.
Iris: That's above average. What were the top comments about?
Kate: Most positive comments were about the AI summary quality. Several people said it was the best they'd seen.
Jack: A few people asked about integrations — specifically Notion and Google Calendar.
Iris: Let's pass that feedback to the product team. What's our follow-up plan?
Jack: I'll send a welcome email sequence to all new sign-ups. Kate, can you write the copy?
Kate: Yes, I'll have a 3-email sequence ready by tomorrow.""",
            """Product Hunt launch achieved #3 Product of the Day with 847 upvotes and 312 new sign-ups (3.2% conversion rate, above average). Website traffic up 340%. Top feedback: AI summary quality praised, integration requests for Notion and Google Calendar. Follow-up email sequence planned.""",
            [
                ("Write 3-email welcome sequence for new sign-ups", "Kate", 2, True),
                ("Pass integration feedback (Notion, Google Calendar) to product team", "Jack", 3, True),
                ("Write Product Hunt launch case study blog post", "Kate", 7, False),
                ("Analyse sign-up to activation conversion rate", "Iris", 5, True),
            ],
        ),
        (
            "Content Performance Review",
            4,
            "neutral",
            """Iris: Monthly content review. Kate, how are the blog posts performing?
Kate: We've published 8 posts. Average 1,200 page views per post. The 'How to run effective remote meetings' post is our top performer with 4,800 views.
Iris: Any conversions from content?
Kate: 47 sign-ups attributed to organic search. The SEO is starting to work — we're ranking on page 2 for 'meeting summary AI'.
Jack: Page 2 isn't good enough. We need to be on page 1.
Kate: I know. I'm working on a link building campaign. I've identified 20 relevant sites for guest posts.
Iris: Good. What's the plan for next month?
Kate: I want to try a different format — a comprehensive guide, 3,000+ words. Those tend to rank better.
Iris: Approved. Jack, how are the LinkedIn ads performing?
Jack: CTR is 0.8%, which is decent for B2B. Cost per sign-up is £24. We're within budget.""",
            """Content marketing generating 1,200 average page views per post with top performer at 4,800 views. 47 sign-ups from organic search, ranking page 2 for target keyword. LinkedIn ads performing at 0.8% CTR and £24 cost per sign-up. Link building campaign and long-form guide planned.""",
            [
                ("Identify and outreach 20 sites for guest posts", "Kate", 14, False),
                ("Write 3,000-word comprehensive meeting guide", "Kate", 14, False),
                ("Optimise top 3 blog posts for page 1 ranking", "Kate", 10, False),
                ("Review and adjust LinkedIn ad targeting", "Jack", 7, True),
            ],
        ),
    ],
}

PLANNER_MESSAGES_BY_WORKSPACE = {
    "Product Team": [
        ("user", "What are the most important things we should focus on this week?"),
        ("assistant", "Based on your recent meetings and open action items, here are the top priorities for this week:\n\n1. **Search performance** — Bob is investigating PostgreSQL tsvector. This is blocking the search feature which has been validated as a top user need from your research.\n\n2. **Impact dashboard completion** — Dave is 70% done. Getting this shipped will be valuable for the stakeholder demo.\n\n3. **Push notification spec** — Carol's spec is overdue. This needs to be unblocked before sprint 17 planning.\n\nWould you like me to help draft a sprint plan or prioritise any of these further?"),
        ("user", "Can you summarise the key decisions made in the last month?"),
        ("assistant", "Here's a summary of key decisions from your recent Product Team meetings:\n\n**Technical decisions:**\n- Selected Recharts as the charting library for the analytics dashboard\n- Committed to Slack integration as a sprint 16 priority\n- Deferred mobile app to Q3 planning\n\n**Process decisions:**\n- Added integration time buffers to estimation template (after sprint 14 retro)\n- Scheduled weekly dry runs before stakeholder demos\n\n**Product decisions:**\n- Prioritised search feature based on user research (top pain point)\n- Validated Slack integration through user research (multiple unprompted requests)\n- Added sentiment analysis tooltip to improve feature discoverability\n\nIs there a specific decision you'd like more detail on?"),
    ],
    "Engineering": [
        ("user", "What security issues are still open?"),
        ("assistant", "Good news — all medium and high severity security issues from the audit have been resolved:\n\n✅ JWT token expiry (7 days) — completed by Henry\n✅ Rate limiting on auth endpoints — completed by Grace\n✅ Sensitive field redaction from logs — completed by Henry\n✅ Security scan re-run — verified clean\n\n**Still open (lower priority):**\n- Retry queue with exponential backoff for R2 storage failures — assigned to Henry, no due date set\n- Public status page — assigned to Frank, no due date set\n- Incident response runbook — assigned to Grace\n\nWould you like help drafting a timeline for the remaining items?"),
    ],
}


# ---------------------------------------------------------------------------
# Main seed function
# ---------------------------------------------------------------------------

async def seed() -> None:
    async with SessionLocal() as db:
        # Get or create demo user
        result = await db.execute(select(User).where(User.email == settings.DEMO_EMAIL))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                email=settings.DEMO_EMAIL,
                hashed_password=_hash(settings.DEMO_PASSWORD),
                display_name="Alex Demo",
                is_demo=True,
            )
            db.add(user)
            await db.flush()
            await db.refresh(user)
            print(f"Created demo user: {user.email} (id={user.id})")
        else:
            print(f"Demo user exists: {user.email} (id={user.id})")

        # Check if already seeded
        ws_result = await db.execute(
            select(Workspace).where(Workspace.user_id == str(user.id))
        )
        existing_workspaces = ws_result.scalars().all()
        if existing_workspaces:
            print(f"Demo data already exists ({len(existing_workspaces)} workspaces). Skipping.")
            return

        user_id = str(user.id)

        # Create workspaces and all related data
        for ws_def in WORKSPACES:
            ws = Workspace(
                user_id=user_id,
                name=ws_def["name"],
                icon_emoji=ws_def["icon_emoji"],
            )
            db.add(ws)
            await db.flush()
            await db.refresh(ws)
            print(f"  Created workspace: {ws.name} ({ws.id})")

            meetings_data = MEETINGS_BY_WORKSPACE.get(ws_def["name"], [])
            for title, weeks_ago, sentiment, transcript_text, summary_text, action_items_data in meetings_data:
                meeting = Meeting(
                    user_id=user_id,
                    workspace_id=ws.id,
                    title=title,
                    status="complete",
                    created_at=_ago(weeks=weeks_ago),
                )
                db.add(meeting)
                await db.flush()
                await db.refresh(meeting)

                # Transcript
                db.add(Transcript(
                    meeting_id=meeting.id,
                    content=transcript_text.strip(),
                    created_at=_ago(weeks=weeks_ago),
                ))

                # Summary
                db.add(Summary(
                    meeting_id=meeting.id,
                    content=summary_text.strip(),
                    status="complete",
                    created_at=_ago(weeks=weeks_ago),
                ))

                # Sentiment
                db.add(SentimentReport(
                    meeting_id=meeting.id,
                    classification=sentiment,
                    signals=[],
                    status="complete",
                    created_at=_ago(weeks=weeks_ago),
                ))

                # Action items
                for desc, assignee, due_offset, completed in action_items_data:
                    db.add(ActionItem(
                        meeting_id=meeting.id,
                        description=desc,
                        assignee=assignee,
                        due_date=_date_ago(weeks=weeks_ago) + timedelta(days=due_offset),
                        completed=completed,
                    ))

                print(f"    Created meeting: {title}")

            # Planner messages
            planner_msgs = PLANNER_MESSAGES_BY_WORKSPACE.get(ws_def["name"], [])
            for i, (role, content) in enumerate(planner_msgs):
                db.add(PlannerMessage(
                    workspace_id=ws.id,
                    user_id=user_id,
                    role=role,
                    content=content,
                    created_at=_ago(days=3) + timedelta(minutes=i * 2),
                ))

        await db.commit()
        print("\nDemo data seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
