import type { ScheduleSlot } from "@/lib/types";

const SLOTS: ScheduleSlot["slot"][] = ["morning", "midday", "evening", "bedtime", "as needed"];
const ICON: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  bedtime: "Bedtime",
  "as needed": "Only when needed",
};

export function ScheduleGrid({ schedule }: { schedule: ScheduleSlot[] }) {
  const used = SLOTS.filter((s) => schedule.some((x) => x.slot === s));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {used.map((slot) => (
        <section
          key={slot}
          className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4"
        >
          <h3 className="font-bold text-base mb-2">{ICON[slot]}</h3>
          <ul className="space-y-2">
            {schedule
              .filter((s) => s.slot === slot)
              .map((s, i) => (
                <li key={`${s.med_id}-${i}`} className="text-[15px] leading-snug">
                  <span className="font-semibold">{s.med_name}</span>
                  <span className="block text-[color:var(--muted)] text-sm">
                    {s.instruction}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
