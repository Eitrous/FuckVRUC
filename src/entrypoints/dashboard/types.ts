export type DashboardIcon = {
  width: number;
  height: number;
  body: string;
};

export type DashboardViewId = "services" | "schedule" | "grades" | "library";

export type LibraryDashboardSection = "search" | "records";

export type ToolbarItem = {
  id: DashboardViewId;
  label: string;
};

export type SemesterOption = {
  value: string;
  label: string;
};

export type WeekOption = {
  value: number;
  label: string;
};
