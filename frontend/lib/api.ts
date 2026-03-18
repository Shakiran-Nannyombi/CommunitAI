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
    created_at: string;
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
    formData.append("file", file);
    const { data } = await api.post<MeetingDetail>(`/meetings/${meetingId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
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
