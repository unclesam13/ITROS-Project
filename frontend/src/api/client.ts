const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000/api/v1" : "/api/v1");

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "employee";
  department_id: string;
};

type ValidationError = { msg?: string };

function formatApiError(body: Record<string, unknown>, fallback: string): string {
  const detail = body.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === "object" && item && "msg" in item ? String((item as ValidationError).msg) : null))
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  if (detail && typeof detail === "object" && "detail" in detail) {
    const nested = (detail as { detail?: unknown }).detail;
    if (typeof nested === "string") return nested;
  }
  return fallback;
}

const storage = {
  getAccess: () => localStorage.getItem("access_token"),
  getRefresh: () => localStorage.getItem("refresh_token"),
  setTokens: (t: TokenPair) => {
    localStorage.setItem("access_token", t.access_token);
    localStorage.setItem("refresh_token", t.refresh_token);
  },
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = storage.getAccess();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  storage,
  login: (email: string, password: string) =>
    request<TokenPair>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<UserProfile>("/auth/me"),
  listTasks: (page = 1) => request<{ items: Task[]; total: number }>(`/tasks?page=${page}`),
  getTask: (id: string) => request<Task>(`/tasks/${id}`),
  createTask: (body: TaskCreate) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTaskStatus: (id: string, status: string) =>
    request<Task>(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  workload: () => request<WorkloadResponse>("/workload"),
  departments: () => request<{ id: string; name: string }[]>("/departments"),
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  intake_channel: string;
  assigned_to?: { id: string; full_name: string };
  classification?: {
    category: string;
    predicted_priority: string;
    confidence: number;
    processing_time_ms: number;
  };
  routing?: {
    status: string;
    score?: number;
    rationale_summary?: string;
    processing_time_ms: number;
  };
  created_at: string;
};

export type TaskCreate = {
  title: string;
  description: string;
  intake_channel: string;
  department_id?: string;
  effort_points?: number;
};

export type WorkloadResponse = {
  department_id: string;
  users: {
    user_id: string;
    full_name: string;
    active_task_count: number;
    effort_sum: number;
    max_active_tasks: number;
  }[];
};
