# Requirements Document

## Introduction

CommunitAI v2 significantly evolves the existing CommunitAI platform — a Bloomberg Terminal-style AI dashboard for community leaders. This version adds five major capabilities on top of the existing audio upload, transcription, summarisation, and action item extraction pipeline:

1. In-browser screen + audio recorder (replacing the file upload form as the primary input)
2. Inline editing of meeting transcripts and action items
3. Slack and Gmail integrations for sharing meeting results
4. A Planner Agent chat interface per community workspace
5. An Impact Tracker dashboard per community workspace

The platform retains its existing tech stack: Next.js 15 + Tailwind v4 frontend, FastAPI + PostgreSQL (Neon) backend, Groq Whisper (`whisper-large-v3`) for transcription, Gradient AI (`llama3.3-70b-instruct`) for all LLM tasks, and DigitalOcean Spaces for object storage. Backend and agent are deployed on DigitalOcean App Platform; frontend on Vercel.

---

## Glossary

- **Recorder**: The in-browser screen and audio recording component built with the MediaRecorder API
- **Recording_Blob**: The raw video/audio binary produced by the Recorder and sent to the backend
- **Transcript**: The text output produced by Groq Whisper from a meeting recording or uploaded file
- **Summary**: The AI-generated meeting summary produced by Gradient AI from the Transcript
- **Action_Item**: A discrete task extracted from a meeting, with a description, optional assignee, and optional due date
- **Meeting**: A persisted record containing a Transcript, Summary, and one or more Action_Items
- **Workspace**: A community-scoped container that groups Meetings, Action_Items, and configuration
- **Planner_Agent**: The AI chat assistant scoped to a Workspace, powered by Gradient AI
- **Conversation_History**: The ordered list of user and assistant messages in a Planner_Agent session
- **Impact_Tracker**: The analytics dashboard that visualises meeting frequency, task completion, sentiment trends, and assignee activity per Workspace
- **Slack_Webhook_URL**: A user-configured incoming webhook URL stored per Workspace for posting meeting results to Slack
- **Sentiment**: A per-meeting classification of overall tone: positive, neutral, or negative, derived from the Transcript by Gradient AI
- **Team_Lead**: The authenticated user role that manages a Workspace
- **System**: The CommunitAI v2 platform as a whole

---

## Requirements

### Requirement 1: In-Browser Screen and Audio Recording

**User Story:** As a Team_Lead, I want to record my screen and audio directly in the browser, so that I can capture meetings without needing to upload a separate file.

#### Acceptance Criteria

1. THE Recorder SHALL support three capture modes: full screen, application window, and browser tab, using the browser's `getDisplayMedia` API.
2. THE Recorder SHALL allow the Team_Lead to select one of two audio sources at record time: microphone only, or system audio (tab/browser audio).
3. WHEN a recording session starts, THE Recorder SHALL display a live elapsed-time timer that updates every second.
4. WHEN the Team_Lead stops the recording, THE Recorder SHALL present a preview of the Recording_Blob using an HTML `<video>` element before submission.
5. WHEN the Team_Lead confirms submission, THE System SHALL send the Recording_Blob to the backend processing pipeline (transcription → summarisation → action item extraction) using the same pipeline as file uploads.
6. WHERE the browser does not support `getDisplayMedia`, THE System SHALL display an error message and present the file upload fallback form.
7. THE System SHALL retain the existing file upload form as a fallback option accessible from the recording UI.
8. IF the Recording_Blob exceeds 500 MB, THEN THE System SHALL reject the submission and display an error message stating the size limit.
9. WHEN a recording is in progress, THE Recorder SHALL display a visible recording indicator (red dot or equivalent) in the UI.

---

### Requirement 2: Inline Editing of Meeting Results

**User Story:** As a Team_Lead, I want to edit the transcript and action items after a meeting is processed, so that I can correct errors and keep records accurate.

#### Acceptance Criteria

1. WHEN a Meeting has been processed, THE System SHALL display the Transcript in an editable textarea on the meeting detail page.
2. WHEN the Team_Lead modifies the Transcript and clicks the save button, THE System SHALL persist the updated Transcript to the database and display a confirmation.
3. WHEN a Meeting has been processed, THE System SHALL display each Action_Item with inline-editable fields for description, assignee, and due date.
4. WHEN the Team_Lead modifies an Action_Item field and saves, THE System SHALL persist the updated Action_Item to the database.
5. THE System SHALL provide a button on the meeting detail page that allows the Team_Lead to add a new Action_Item manually.
6. WHEN the Team_Lead adds a new Action_Item, THE System SHALL persist it to the database and display it in the Action_Item list.
7. THE System SHALL provide a delete control on each Action_Item that allows the Team_Lead to remove it.
8. WHEN the Team_Lead deletes an Action_Item, THE System SHALL remove it from the database and remove it from the displayed list without requiring a page reload.
9. IF a save operation fails due to a network or server error, THEN THE System SHALL display an error message and preserve the unsaved edits in the form.

---

### Requirement 3: Slack Integration

**User Story:** As a Team_Lead, I want to post meeting summaries and action items to a Slack channel, so that my team is immediately informed after a meeting.

#### Acceptance Criteria

1. THE System SHALL provide a Slack_Webhook_URL configuration field per Workspace in the workspace settings UI.
2. WHEN the Team_Lead saves a Slack_Webhook_URL, THE System SHALL persist it to the Workspace record in the database.
3. WHEN a Slack_Webhook_URL is configured for a Workspace, THE System SHALL display a "Share to Slack" button on the meeting detail page.
4. WHEN the Team_Lead clicks "Share to Slack", THE System SHALL send an HTTP POST request to the configured Slack_Webhook_URL containing the Meeting's Summary and Action_Items formatted as a Slack message.
5. WHEN the Slack POST request succeeds, THE System SHALL display a confirmation message to the Team_Lead.
6. IF the Slack POST request fails, THEN THE System SHALL display an error message containing the HTTP status code returned by Slack.
7. WHILE no Slack_Webhook_URL is configured for a Workspace, THE System SHALL hide the "Share to Slack" button on meeting detail pages for that Workspace.

---

### Requirement 4: Gmail Integration

**User Story:** As a Team_Lead, I want to draft a follow-up email with the meeting summary and action items, so that I can share results with stakeholders who are not on Slack.

#### Acceptance Criteria

1. THE System SHALL display a "Share via Email" button on the meeting detail page.
2. WHEN the Team_Lead clicks "Share via Email", THE System SHALL open a `mailto:` link in a new browser tab with a pre-filled subject containing the Meeting title and a pre-filled body containing the Summary and Action_Items formatted as plain text.
3. THE System SHALL format the email body so that the Summary appears first, followed by a numbered list of Action_Items each showing description, assignee, and due date.
4. THE System SHALL URL-encode all dynamic content inserted into the `mailto:` link to prevent malformed URIs.

---

### Requirement 5: Planner Agent

**User Story:** As a Team_Lead, I want to chat with an AI agent that knows my community's recent meetings and tasks, so that I can brainstorm solutions and plan upcoming meetings.

#### Acceptance Criteria

1. THE System SHALL add a "Planner" tab to each Workspace page.
2. WHEN the Team_Lead opens the Planner tab, THE System SHALL display a chat interface with a message input field and a scrollable message history area.
3. WHEN the Team_Lead sends a message, THE System SHALL include in the Gradient AI request: the Conversation_History for the current session, the five most recent Meeting summaries for the Workspace, and the open Action_Items for the Workspace.
4. WHEN the Gradient AI response is received, THE System SHALL append the assistant message to the Conversation_History and display it in the chat interface.
5. THE System SHALL persist the Conversation_History for each Workspace session to the database so that it survives page reloads within the same session.
6. WHEN the Team_Lead sends a message, THE System SHALL display a loading indicator in the chat interface until the Gradient AI response is received.
7. IF the Gradient AI request fails, THEN THE System SHALL display an error message in the chat interface and preserve the Team_Lead's unsent message in the input field.
8. THE System SHALL provide a "Clear conversation" control that resets the Conversation_History for the current Workspace session.
9. THE Planner_Agent SHALL use the Gradient AI endpoint `https://inference.do-ai.run/v1/chat/completions` with model `llama3.3-70b-instruct`.

---

### Requirement 6: Impact Tracker

**User Story:** As a Team_Lead, I want to see analytics about my community's meeting activity and task outcomes, so that I can understand trends and measure progress.

#### Acceptance Criteria

1. THE System SHALL add an "Impact" tab to each Workspace page.
2. WHEN the Team_Lead opens the Impact tab, THE System SHALL display a meeting frequency chart or table showing the number of Meetings per calendar week for the past 12 weeks.
3. WHEN the Team_Lead opens the Impact tab, THE System SHALL display the task completion rate as a percentage of completed Action_Items out of total Action_Items for the Workspace.
4. WHEN the Team_Lead opens the Impact tab, THE System SHALL display a sentiment trend showing the Sentiment classification (positive, neutral, or negative) for each of the five most recent Meetings in chronological order.
5. WHEN the Team_Lead opens the Impact tab, THE System SHALL display a list of the top five most active assignees ranked by the number of Action_Items assigned to them in the Workspace.
6. THE System SHALL derive all Impact_Tracker data from existing Meeting, Action_Item, and Sentiment records — no new data collection is required.
7. WHEN a Workspace has fewer than two Meetings, THE System SHALL display a message indicating that more meetings are needed before trends can be shown, in place of the trend charts.

---

### Requirement 7: Sentiment Extraction

**User Story:** As a Team_Lead, I want each meeting to have a sentiment classification, so that the Impact Tracker can show emotional trends over time.

#### Acceptance Criteria

1. WHEN a Meeting is processed, THE System SHALL send the Transcript to Gradient AI and request a Sentiment classification of positive, neutral, or negative.
2. THE System SHALL persist the Sentiment value to the Meeting record in the database.
3. IF the Gradient AI sentiment request fails, THEN THE System SHALL store a Sentiment value of "neutral" as the default and log the error.
4. THE System SHALL derive Sentiment using the Gradient AI endpoint `https://inference.do-ai.run/v1/chat/completions` with model `llama3.3-70b-instruct`.
