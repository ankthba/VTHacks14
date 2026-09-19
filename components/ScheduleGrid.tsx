import type { ScheduleSlot } from "@/lib/types";

const SLOTS: ScheduleSlot["slot"][] = ["morning", "midday", "evening", "bedtime", "as needed"];
const ICON: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  bedtime: "Bedtime",
  "as needed": "Only when needed",
};

const GLYPH: Record<string, string> = {
  morning: "\u25D0",
  midday: "\u25CB",
  evening: "\u25D1",
  bedtime: "\u25CF",
  "as needed": "\u25C7",
};

export function ScheduleGrid({ schedule }: { schedule: ScheduleSlot[] }) {
  const used = SLOTS.filter((s) => schedule.some((x) => x.slot === s));

  return (
    <div className="list-hairline border-t border-[color:var(--line-soft)]">
      {used.map((slot) => (
        <section key={slot} className="row">
          <span className="icon-box">{GLYPH[slot]}</span>
          <div className="flex-1">
          <h3 className="font-semibold text-base mb-1">{ICON[slot]}</h3>
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
          </div>
        </section>
      ))}
    </div>
  );
}
