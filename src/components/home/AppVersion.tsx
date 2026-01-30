import { Info } from "lucide-react";

// Build timestamp - updates each time the app is built
const BUILD_VERSION = "1.0.5.4";
const BUILD_DATE = "2025-01-30T15:52:00+05:30"; // IST (Kolkata)

export default function AppVersion() {
  const formattedDate = new Date(BUILD_DATE).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="mx-4 mb-4 p-3 rounded-xl bg-card/50 border border-border/50">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="w-3 h-3" />
        <span>
          Version {BUILD_VERSION} • Built: {formattedDate}
        </span>
      </div>
    </div>
  );
}
