import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import HelpAccordion, { type HelpSection } from "../components/HelpAccordion";
import { useAuth } from "../auth/AuthContext";

const sharedSections: HelpSection[] = [
  {
    id: "what-is-itros",
    title: "What is ITROS?",
    content: (
      <p>
        ITROS (Intelligent Task Routing and Workload Optimization System) helps teams submit work requests,
        automatically classify them with NLP, and route each task to the best available team member based on
        workload, priority, and department fit. Managers and admins can monitor team load, reassign work, and
        keep tasks moving from submission to completion.
      </p>
    ),
  },
  {
    id: "task-routing",
    title: "How task routing works",
    content: (
      <div className="space-y-3">
        <p>
          When a task is submitted without a manual assignee, ITROS runs an intake pipeline:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>NLP classification</strong> - The title and description are analyzed to predict a category
            (e.g. finance, technical, administrative) and a priority. Keyword signals like &quot;urgent&quot;,
            &quot;ASAP&quot;, or &quot;by end of day&quot; can raise priority.
          </li>
          <li>
            <strong>Candidate selection</strong> - Active users in the matching department with load below 80% of
            capacity are scored. Admins may receive administrative, technical, or support-category tasks.
          </li>
          <li>
            <strong>Auto-routing</strong> - The highest-scoring candidate is assigned. The score balances skill
            match, available capacity, task priority weighting, and overload penalty.
          </li>
          <li>
            <strong>Fallback</strong> - If no one is eligible, the task is assigned to the department manager
            with an explanatory routing note on the task detail page.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "task-statuses",
    title: "Task statuses explained",
    content: (
      <ul className="space-y-2">
        <li><strong>Open</strong> - Submitted and waiting for assignment or pickup.</li>
        <li><strong>Assigned</strong> - Routed or manually assigned to a team member.</li>
        <li><strong>In Progress</strong> - The assignee is actively working on the task.</li>
        <li><strong>Completed</strong> - Work is finished; the task is closed.</li>
      </ul>
    ),
  },
  {
    id: "priority-levels",
    title: "Priority levels",
    content: (
      <ul className="space-y-2">
        <li><strong>Critical</strong> - Emergencies, outages, or explicit urgent language (e.g. &quot;ASAP&quot;, &quot;immediately&quot;).</li>
        <li><strong>High</strong> - Same-day or very tight deadlines (e.g. &quot;today&quot;, &quot;by end of day&quot;).</li>
        <li><strong>Medium</strong> - Standard work; default when no strong time signal is detected.</li>
        <li><strong>Low</strong> - Non-urgent requests with flexible timing.</li>
      </ul>
    ),
  },
];

const employeeSections: HelpSection[] = [
  {
    id: "employee-dashboard",
    title: "Your Dashboard",
    content: (
      <div className="space-y-3">
        <p>Stat cards summarize your visible tasks:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Total Tasks</strong> - Tasks you created or are assigned to.</li>
          <li><strong>Open / In Progress</strong> - Counts by current status.</li>
          <li><strong>Completed Today</strong> - Tasks finished today (manager/admin see org-wide metrics).</li>
        </ul>
        <p>
          Charts show a <strong>Tasks by status</strong> breakdown, a read-only <strong>Team workload</strong> bar
          chart for your department, and <strong>Completed tasks</strong> over time for your department with a
          selectable date range.
        </p>
      </div>
    ),
  },
  {
    id: "submitting-task",
    title: "Submitting a task",
    content: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Go to <Link to="/tasks/new" className="text-brand-600 hover:underline">Submit</Link> in the navigation bar.</li>
        <li>Enter a clear title and a detailed description (NLP uses both for classification).</li>
        <li>Choose a priority or leave the default; set an optional due date.</li>
        <li>Click <strong>Submit</strong> - the system classifies and auto-routes the task unless a manager assigns it manually.</li>
        <li>Open the task detail page to see classification results and routing notes.</li>
      </ol>
    ),
  },
  {
    id: "viewing-tasks",
    title: "Viewing your tasks",
    content: (
      <div className="space-y-3">
        <p>
          <Link to="/tasks" className="text-brand-600 hover:underline">Tasks</Link> offers two views:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>List view</strong> - Table with status, priority, due date, and assignee. Use filters and search to narrow results.</li>
          <li><strong>Kanban view</strong> - Columns by status; drag cards to update status where permitted.</li>
        </ul>
        <p>Click a task title to open details, comments, and routing information.</p>
      </div>
    ),
  },
  {
    id: "employee-status-changes",
    title: "Task status changes",
    content: (
      <p>
        You can change the status only on tasks <strong>assigned to you</strong>. Valid moves: Assigned → In Progress,
        In Progress → Completed, and other allowed transitions shown in the list or detail dropdown. You cannot
        reassign tasks to other people or edit tasks you did not create unless you are the assignee.
      </p>
    ),
  },
];

const managerSections: HelpSection[] = [
  {
    id: "team-workload",
    title: "Team Workload page",
    content: (
      <div className="space-y-3">
        <p>
          The <Link to="/workload" className="text-brand-600 hover:underline">Workload</Link> page lists everyone
          in your department:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Active tasks</strong> - Count of tasks in Assigned or In Progress status.</li>
          <li><strong>Effort</strong> - Sum of effort points of active tasks assigned to the user.</li>
          <li><strong>Capacity</strong> - Maximum effort points the user can handle simultaneously (configurable per user; default 10).</li>
          <li><strong>Load %</strong> - Effort ÷ Capacity × 100%. Green below 40%, amber 40–70%, red at 70%+.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "reassigning-tasks",
    title: "Reassigning tasks",
    content: (
      <div className="space-y-3">
        <p>Managers can override automatic routing in several ways:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Submit form</strong> - Pick an assignee when creating a task.</li>
          <li><strong>List view</strong> - Change assignee, status, priority, or due date inline on any department task.</li>
          <li><strong>Bulk actions</strong> - Select multiple tasks to assign, change status, or delete.</li>
          <li><strong>Task detail</strong> - Update fields and assignee from the detail page.</li>
        </ul>
        <p>Manual assignment sets status to Assigned and records an overridden routing decision.</p>
      </div>
    ),
  },
  {
    id: "heatmap",
    title: "Heatmap page",
    content: (
      <p>
        Admins use the organization-wide heatmap; managers rely on the Workload page and dashboard charts.
        Load bars use the same color scale: green (0–39%), amber (40–69%), red (70%+). Sort by load % to spot
        overloaded team members quickly.
      </p>
    ),
  },
];

const adminSections: HelpSection[] = [
  {
    id: "user-management",
    title: "User Management",
    content: (
      <div className="space-y-3">
        <p>
          On <Link to="/admin/users" className="text-brand-600 hover:underline">Users</Link> you can:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Create</strong> - Add name, email, role, department, capacity, and initial password.</li>
          <li><strong>Edit</strong> - Update name, role, department, and capacity.</li>
          <li><strong>Deactivate</strong> - Revoke login access; assigned tasks remain on the user.</li>
        </ul>
        <p>
          <strong>Capacity</strong> controls how many active tasks count toward 100% load in routing and workload
          views. Increase it for senior staff who can handle more parallel work.
        </p>
      </div>
    ),
  },
  {
    id: "admin-capabilities",
    title: "All admin capabilities",
    content: (
      <div className="space-y-3">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-surface-border text-slate-500">
              <th className="py-2 pr-4">Capability</th>
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Manager</th>
              <th className="py-2">Admin</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-surface-border"><td className="py-2 pr-4">Submit tasks</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr className="border-b border-surface-border"><td className="py-2 pr-4">View own / assigned tasks</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr className="border-b border-surface-border"><td className="py-2 pr-4">Department task oversight</td><td>-</td><td>✓</td><td>✓</td></tr>
            <tr className="border-b border-surface-border"><td className="py-2 pr-4">Reassign / bulk actions</td><td>-</td><td>✓</td><td>✓</td></tr>
            <tr className="border-b border-surface-border"><td className="py-2 pr-4">Org-wide workload heatmap</td><td>-</td><td>-</td><td>✓</td></tr>
            <tr className="border-b border-surface-border"><td className="py-2 pr-4">User CRUD & deactivate</td><td>-</td><td>-</td><td>✓</td></tr>
            <tr><td className="py-2 pr-4">Receive admin-category routed tasks</td><td>-</td><td>-</td><td>✓</td></tr>
          </tbody>
        </table>
      </div>
    ),
  },
];

function SectionGroup({ title, description, sections }: { title: string; description?: string; sections: HelpSection[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg font-semibold text-slate-100">{title}</h2>
      {description && <p className="mb-4 text-sm text-slate-500">{description}</p>}
      <HelpAccordion sections={sections} />
    </section>
  );
}

export default function HelpPage() {
  const { user, loading } = useAuth();
  const role = user?.role;

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="page-title">Help &amp; documentation</h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading
            ? "Loading your role-specific guide…"
            : user
              ? `Guide tailored for ${user.full_name} (${user.role})`
              : "General guide - sign in to see role-specific sections"}
        </p>
      </div>

      <SectionGroup title="Getting started" sections={sharedSections} />

      {role === "employee" && (
        <SectionGroup title="Employee guide" description="Day-to-day tasks for individual contributors." sections={employeeSections} />
      )}

      {role === "manager" && (
        <SectionGroup title="Manager guide" description="Team oversight, workload, and manual routing." sections={managerSections} />
      )}

      {role === "admin" && (
        <SectionGroup title="Administrator guide" description="Organization setup and full system access." sections={adminSections} />
      )}

      {!user && !loading && (
        <div className="card border-accent/30 bg-accent/10 p-4 text-sm text-accent-bright">
          <Link to="/login" className="font-medium underline">Sign in</Link> to see employee, manager, or admin sections matched to your account.
        </div>
      )}
    </AppLayout>
  );
}
