import { useState } from "react";
import { HabitsTab } from "./HabitsTab";
import { RoutinesTab } from "./RoutinesTab";

const TABS = [
  { value: "habits", label: "Hábitos" },
  { value: "routines", label: "Rutinas" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export function HabitsPage() {
  const [tab, setTab] = useState<Tab>("habits");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Hábitos</h1>
        <div role="tablist" aria-label="Hábitos o rutinas" className="mt-3 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={
                tab === t.value
                  ? "rounded-md bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "habits" ? <HabitsTab /> : <RoutinesTab />}
    </div>
  );
}
