import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("cai_token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Auth types ---

export interface AuthUser {
    access_token: string;
    token_type: string;
    user_id: string;
    email: string;
    display_name: string;
    is_demo: boolean;
}

// --- Auth helpers ---

export async function login(email: string, password: string): Promise<AuthUser> {
    const { data } = await api.post<AuthUser>("/auth/login", { email, password });
    return data;
}

export async function register(email: string, password: string, display_name?: string): Promise<AuthUser> {
    const { data } = await api.post<AuthUser>("/auth/register", { email, password, display_name: display_name ?? "" });
    return data;
}

export async function demoLogin(): Promise<AuthUser> {
    const { data } = await api.post<AuthUser>("/auth/demo");
    return data;
}

export function saveAuth(user: AuthUser) {
    localStorage.setItem("cai_token", user.access_token);
    localStorage.setItem("cai_user", JSON.stringify(user));
}

export function loadAuth(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("cai_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function clearAuth() {
    localStorage.removeItem("cai_token");
    localStorage.removeItem("cai_user");
}

// --- Types ---

export type MeetingStatus =
    | "pending"
    | "processing"
    | "transcribed"
    | "complete"
    | "transcription_failed"
    | "analysis_failed"
    | "summarization_failed";

export interface Workspace {
    id: string;
    name: string;
    icon_emoji: string;
    slack_webhook_url: string | null;
    created_at: string;
}

export interface PlannerMessageOut {
    role: string;
    content: string;
    created_at: string;
}

export interface PlannerChatResponse {
    reply: string;
    history: PlannerMessageOut[];
}

export interface WeeklyMeetingCount {
    week_start: string;
    count: number;
}

export interface SentimentTrendItem {
    meeting_title: string;
    created_at: string;
    classification: "positive" | "neutral" | "negative";
}

export interface AssigneeActivity {
    assignee: string;
    task_count: number;
}

export interface ImpactOut {
    meetings_per_week: WeeklyMeetingCount[];
    completion_rate: number;
    sentiment_trend: SentimentTrendItem[];
    top_assignees: AssigneeActivity[];
    has_enough_data: boolean;
}

export interface ActionItem {
    id: string;
    meeting_id: string;
    description: string;
    assignee: string;
    due_date: string | null;
    completed: boolean;
    created_at: string;
}

export interface GlobalActionItem extends ActionItem {
    meeting_title: string;
    workspace_id: string | null;
    workspace_name: string | null;
    workspace_emoji: string | null;
}

export interface SentimentSignal {
    type: string;
    excerpt: string;
}

export interface SentimentReport {
    classification: "positive" | "neutral" | "negative";
    signals: SentimentSignal[];
}

export interface MeetingDetail {
    id: string;
    title: string;
    user_id: string;
    workspace_id: string | null;
    status: MeetingStatus;
    audio_url: string | null;
    created_at: string;
    transcript: string | null;
    action_items: ActionItem[];
    sentiment: SentimentReport | null;
    summary: string | null;
}

export interface MeetingListItem {
    id: string;
    title: string;
    user_id: string;
    workspace_id: string | null;
    status: MeetingStatus;
    created_at: string;
}

// --- Workspaces ---

export async function getWorkspaces(userId: string): Promise<Workspace[]> {
    const { data } = await api.get<Workspace[]>("/workspaces", { params: { user_id: userId } });
    return data;
}

export async function createWorkspace(name: string, icon_emoji: string, userId: string): Promise<Workspace> {
    const { data } = await api.post<Workspace>("/workspaces", { name, icon_emoji, user_id: userId });
    return data;
}

// --- Meetings ---

export async function createMeeting(title: string, userId: string, workspaceId?: string): Promise<MeetingDetail> {
    const { data } = await api.post<MeetingDetail>("/meetings", {
        title,
        user_id: userId,
        workspace_id: workspaceId ?? null,
    });
    return data;
}

export async function uploadAudio(meetingId: string, file: File | Blob): Promise<MeetingDetail> {
    const formData = new FormData();
    // Ensure a filename is always present so the backend can derive the extension
    const filename = file instanceof File ? file.name : `recording.${_mimeToExt(file.type)}`;
    formData.append("file", file, filename);
    const { data } = await api.post<MeetingDetail>(`/meetings/${meetingId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
}

function _mimeToExt(mime: string): string {
    const map: Record<string, string> = {
        "audio/webm": "webm", "video/webm": "webm",
        "audio/mp4": "mp4", "video/mp4": "mp4",
        "audio/mpeg": "mp3", "audio/wav": "wav",
        "audio/ogg": "ogg", "audio/aac": "aac",
        "audio/x-m4a": "m4a", "audio/m4a": "m4a",
        "video/quicktime": "mp4",
    };
    return map[mime] ?? "webm";
}

export async function getMeetings(userId: string, workspaceId?: string): Promise<MeetingListItem[]> {
    const { data } = await api.get<MeetingListItem[]>("/meetings", {
        params: { user_id: userId, ...(workspaceId ? { workspace_id: workspaceId } : {}) },
    });
    return data;
}

export async function getMeeting(id: string): Promise<MeetingDetail> {
    const { data } = await api.get<MeetingDetail>(`/meetings/${id}`);
    return data;
}

export async function retryMeeting(id: string): Promise<MeetingDetail> {
    const { data } = await api.post<MeetingDetail>(`/meetings/${id}/retry`);
    return data;
}

export async function deleteMeeting(id: string): Promise<void> {
    await api.delete(`/meetings/${id}`);
}

// --- Tasks ---

export async function getGlobalTasks(userId: string): Promise<GlobalActionItem[]> {
    const { data } = await api.get<GlobalActionItem[]>("/tasks", { params: { user_id: userId } });
    return data;
}

export async function completeActionItem(id: string): Promise<ActionItem> {
    const { data } = await api.patch<ActionItem>(`/action-items/${id}/complete`, null, {
        params: { user_id: "user-123" },
    });
    return data;
}

export async function generateNudge(actionItemId: string): Promise<string> {
    const { data } = await api.post<{ message: string }>(`/action-items/${actionItemId}/nudge`);
    return data.message;
}

// --- Transcript ---

export async function patchTranscript(meetingId: string, content: string): Promise<void> {
    await api.patch(`/meetings/${meetingId}/transcript`, { content });
}

// --- Action Items (extended) ---

export async function patchActionItem(
    id: string,
    data: { description?: string; assignee?: string; due_date?: string | null; completed?: boolean }
): Promise<ActionItem> {
    const { data: result } = await api.patch<ActionItem>(`/action-items/${id}`, data);
    return result;
}

export async function deleteActionItem(id: string): Promise<void> {
    await api.delete(`/action-items/${id}`);
}

export async function addActionItem(
    meetingId: string,
    data: { description: string; assignee?: string; due_date?: string | null }
): Promise<ActionItem> {
    const { data: result } = await api.post<ActionItem>(`/meetings/${meetingId}/action-items`, data);
    return result;
}

// --- Workspaces (extended) ---

export async function patchWorkspace(
    id: string,
    data: { slack_webhook_url?: string | null }
): Promise<Workspace> {
    const { data: result } = await api.patch<Workspace>(`/workspaces/${id}`, data);
    return result;
}

export async function getImpact(workspaceId: string): Promise<ImpactOut> {
    const { data } = await api.get<ImpactOut>(`/workspaces/${workspaceId}/impact`);
    return data;
}

// --- Planner ---

export async function plannerChat(
    workspaceId: string,
    message: string,
    userId: string
): Promise<PlannerChatResponse> {
    const { data } = await api.post<PlannerChatResponse>(`/workspaces/${workspaceId}/planner/chat`, {
        message,
        user_id: userId,
    });
    return data;
}

export async function clearPlannerChat(workspaceId: string, userId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/planner/chat`, { params: { user_id: userId } });
}

// --- Integrations ---

export async function shareToSlack(meetingId: string): Promise<{ ok: boolean }> {
    const { data } = await api.post<{ ok: boolean }>(`/meetings/${meetingId}/share/slack`);
    return data;
}
