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

export type UserRecord = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string;
  organization_id: string;
  is_active: boolean;
  max_active_tasks: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  intake_channel: string;
  deadline?: string | null;
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
  deadline?: string | null;
};

export type TaskUpdate = {
  title?: string;
  description?: string;
  priority?: string;
  deadline?: string | null;
};

export type TaskFilters = {
  page?: number;
  page_size?: number;
  status?: string;
  priority?: string;
  category?: string;
  assignee_id?: string;
  search?: string;
  from?: string;
  to?: string;
};

export type Comment = {
  id: string;
  body: string;
  user_id: string;
  author_name?: string;
  created_at: string;
};

export type PipelineAnalytics = {
  total: number;
  open: number;
  in_progress: number;
  completed_today: number;
  by_status: Record<string, number>;
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

export type HeatmapEntry = {
  user_id: string;
  full_name: string;
  department_id: string;
  department_name: string;
  active_task_count: number;
  load_percent: number;
  skills: string[];
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

function toQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const api = {
  storage,
  login: (email: string, password: string) =>
    request<TokenPair>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<UserProfile>("/auth/me"),
  listTasks: (filters: TaskFilters = {}) =>
    request<{ items: Task[]; total: number }>(`/tasks${toQuery({ page_size: 100, ...filters })}`),
  getTask: (id: string) => request<Task>(`/tasks/${id}`),
  createTask: (body: TaskCreate) => request<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTask: (id: string, body: TaskUpdate) =>
    request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  cancelTask: (id: string) => request<Task>(`/tasks/${id}`, { method: "DELETE" }),
  updateTaskStatus: (id: string, status: string) =>
    request<Task>(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  updateAssignee: (id: string, assigneeId: string) =>
    request<Task>(`/tasks/${id}/assignee`, { method: "PATCH", body: JSON.stringify({ assignee_id: assigneeId }) }),
  bulkTasks: (body: { task_ids: string[]; action: string; status?: string; assignee_id?: string }) =>
    request<{ succeeded: string[]; failed: string[] }>("/tasks/bulk", { method: "POST", body: JSON.stringify(body) }),
  listComments: (taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`),
  addComment: (taskId: string, body: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
  workload: () => request<WorkloadResponse>("/workload"),
  pipeline: () => request<PipelineAnalytics>("/analytics/pipeline"),
  completedOverTime: (days = 14) => request<{ date: string; count: number }[]>(`/analytics/completed-over-time?days=${days}`),
  heatmap: () => request<HeatmapEntry[]>("/analytics/heatmap"),
  departments: () => request<{ id: string; name: string }[]>("/departments"),
  listUsers: () => request<UserRecord[]>("/users"),
  createUser: (body: Record<string, unknown>) =>
    request<UserRecord>("/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: string, body: Record<string, unknown>) =>
    request<UserRecord>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deactivateUser: (id: string) => request<UserRecord>(`/users/${id}`, { method: "DELETE" }),
};
