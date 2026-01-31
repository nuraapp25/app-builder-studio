import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type MapLoadingOverlayProps = {
  title?: string;
  description?: string;
  progress?: number; // 0-100
  variant?: "overlay" | "inline";
  className?: string;
};

export function MapLoadingOverlay({
  title = "Loading map",
  description = "Preparing the map view…",
  progress,
  variant = "overlay",
  className,
}: MapLoadingOverlayProps) {
  const clamped = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <div
      className={cn(
        variant === "overlay"
          ? "absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          : "w-full",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-muted">
            <MapPin className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {typeof clamped === "number" ? (
            <Progress value={clamped} className="h-2" />
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-5/6" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
