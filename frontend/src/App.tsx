import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import TaskListPage from "./pages/TaskListPage";
import TaskSubmitPage from "./pages/TaskSubmitPage";
import WorkloadPage from "./pages/WorkloadPage";

function PrivateRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <TaskListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <PrivateRoute>
            <TaskSubmitPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <PrivateRoute>
            <TaskDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/workload"
        element={
          <PrivateRoute>
            <WorkloadPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
