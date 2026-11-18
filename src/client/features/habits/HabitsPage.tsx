import { useState } from "react";
import { HabitsTab } from "./HabitsTab";
import { RoutinesTab } from "./RoutinesTab";
import { PageHeader } from "@client/components/ui/PageHeader";
import { sectionHeader } from "@client/app/navigation";
import { PageTabs } from "@client/components/ui/PageTabs";

const TABS = [
  { value: "habits", label: "Hábitos" },
  { value: "routines", label: "Rutinas" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export function HabitsPage() {
  const [tab, setTab] = useState<Tab>("habits");

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader {...sectionHeader("/habits")} title="Hábitos">
        <PageTabs label="Hábitos o rutinas" tabs={TABS} value={tab} onChange={setTab} />
      </PageHeader>

      {tab === "habits" ? <HabitsTab /> : <RoutinesTab />}
    </div>
  );
}
