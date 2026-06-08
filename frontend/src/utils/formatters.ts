const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
};

const CHANNEL_LABELS: Record<string, string> = {
  manual: "Manual",
  form: "Web Form",
  manual_override: "Manual Override",
  auto: "Auto-routed",
  nlp: "NLP Classified",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatChannel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
