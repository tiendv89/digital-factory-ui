export interface ActivityEntry {
  id: string;
  type: "feature" | "task";
  action: string;
  subject: string;
  subjectId: string;
  featureId: string;
  by: string;
  at: string;
  note?: string | null;
}
