import { ProjectSidebar } from "@/components/projects/ProjectSidebar";
import { CalendarShell } from "@/components/calendar/CalendarShell";
import { CreateProjectPopover } from "@/components/projects/CreateProjectPopover";
import { DayOverflowPopover } from "@/components/projects/DayOverflowPopover";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";
import { ProjectDeleteModal } from "@/components/projects/ProjectDeleteModal";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { WipeAllDataModal } from "@/components/settings/WipeAllDataModal";
import { PairingCodeModal } from "@/components/settings/PairingCodeModal";
import { KeyboardShortcuts } from "@/components/shell/KeyboardShortcuts";
import { SyncAutoTriggers } from "@/components/shell/SyncAutoTriggers";

export function AppShell() {
  return (
    <div className="flex flex-1 min-h-0">
      <ProjectSidebar />
      <CalendarShell />
      <CreateProjectPopover />
      <DayOverflowPopover />
      <ProjectDetailPanel />
      <ProjectDeleteModal />
      <SettingsPanel />
      <WipeAllDataModal />
      <PairingCodeModal />
      <KeyboardShortcuts />
      <SyncAutoTriggers />
    </div>
  );
}
