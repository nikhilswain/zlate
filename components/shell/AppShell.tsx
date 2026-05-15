import { ProjectSidebar } from "@/components/projects/ProjectSidebar";
import { CalendarShell } from "@/components/calendar/CalendarShell";
import { CreateProjectPopover } from "@/components/projects/CreateProjectPopover";
import { DayOverflowPopover } from "@/components/projects/DayOverflowPopover";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";
import { ProjectDeleteModal } from "@/components/projects/ProjectDeleteModal";
import { KeyboardShortcuts } from "@/components/shell/KeyboardShortcuts";

export function AppShell() {
  return (
    <div className="flex flex-1 min-h-0">
      <ProjectSidebar />
      <CalendarShell />
      <CreateProjectPopover />
      <DayOverflowPopover />
      <ProjectDetailPanel />
      <ProjectDeleteModal />
      <KeyboardShortcuts />
    </div>
  );
}
