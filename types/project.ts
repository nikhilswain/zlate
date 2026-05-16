export type Project = {
  id: string;
  name: string;
  icon?: string;
  baseColor: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type DayNote = {
  id: string;
  projectId: string;
  dateKey: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type RenderMode = "pills" | "painted";
export type CalendarView = "month" | "week" | "year";
export type Theme = "dark" | "light";
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Settings = {
  id: "singleton";
  theme: Theme;
  renderMode: RenderMode;
  view: CalendarView;
  weekStartsOn: WeekStartsOn;
  updatedAt: Date;
};
