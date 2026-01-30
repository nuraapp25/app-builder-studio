import { useState, useEffect } from "react";
import { Coffee, UtensilsCrossed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BreakTrackerProps {
  attendanceRecordId: string;
  isSignedIn: boolean;
}

interface BreakState {
  break1_start: string | null;
  break1_end: string | null;
  break2_start: string | null;
  break2_end: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
}

export default function BreakTracker({ attendanceRecordId, isSignedIn }: BreakTrackerProps) {
  const [breaks, setBreaks] = useState<BreakState>({
    break1_start: null,
    break1_end: null,
    break2_start: null,
    break2_end: null,
    lunch_start: null,
    lunch_end: null,
  });
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (attendanceRecordId) {
      fetchBreakStatus();
    }
  }, [attendanceRecordId]);

  const fetchBreakStatus = async () => {
    const { data } = await supabase
      .from("attendance_records")
      .select("break1_start, break1_end, break2_start, break2_end, lunch_start, lunch_end")
      .eq("id", attendanceRecordId)
      .single();

    if (data) {
      setBreaks(data as BreakState);
    }
  };

  const toggleBreak = async (breakType: "break1" | "break2" | "lunch") => {
    const startField = `${breakType}_start` as keyof BreakState;
    const endField = `${breakType}_end` as keyof BreakState;
    
    const isOnBreak = breaks[startField] && !breaks[endField];
    const hasCompletedBreak = breaks[startField] && breaks[endField];

    if (hasCompletedBreak) {
      toast({
        title: "Break Already Taken",
        description: `You've already completed your ${breakType === "lunch" ? "lunch break" : breakType === "break1" ? "first break" : "second break"}.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(breakType);

    try {
      const now = new Date().toISOString();
      const updateData: Partial<BreakState> = {};

      if (isOnBreak) {
        // End the break
        updateData[endField] = now;
      } else {
        // Start the break
        updateData[startField] = now;
      }

      const { error } = await supabase
        .from("attendance_records")
        .update(updateData)
        .eq("id", attendanceRecordId);

      if (error) throw error;

      setBreaks(prev => ({ ...prev, ...updateData }));

      toast({
        title: isOnBreak ? "Break Ended" : "Break Started",
        description: isOnBreak 
          ? `Your ${breakType === "lunch" ? "lunch" : "break"} has ended.`
          : `Your ${breakType === "lunch" ? "lunch" : "break"} has started.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update break status",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getBreakStatus = (breakType: "break1" | "break2" | "lunch") => {
    const startField = `${breakType}_start` as keyof BreakState;
    const endField = `${breakType}_end` as keyof BreakState;
    
    const isOnBreak = breaks[startField] && !breaks[endField];
    const hasCompletedBreak = breaks[startField] && breaks[endField];

    return { isOnBreak, hasCompletedBreak, startTime: breaks[startField], endTime: breaks[endField] };
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return format(new Date(time), "hh:mm a");
  };

  if (!isSignedIn || !attendanceRecordId) return null;

  const break1Status = getBreakStatus("break1");
  const break2Status = getBreakStatus("break2");
  const lunchStatus = getBreakStatus("lunch");

  return (
    <Card className="mx-4 overflow-hidden shadow-card">
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-3">Break Time</h3>
        
        <div className="space-y-3">
          {/* Break 1 - 10 mins */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Break 1 (10 mins)</p>
                {break1Status.startTime && (
                  <p className="text-xs text-muted-foreground">
                    {formatTime(break1Status.startTime)}
                    {break1Status.endTime && ` - ${formatTime(break1Status.endTime)}`}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant={break1Status.isOnBreak ? "destructive" : break1Status.hasCompletedBreak ? "outline" : "default"}
              disabled={loading === "break1" || !!break1Status.hasCompletedBreak}
              onClick={() => toggleBreak("break1")}
            >
              {loading === "break1" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : break1Status.isOnBreak ? (
                "End"
              ) : break1Status.hasCompletedBreak ? (
                "Done"
              ) : (
                "Start"
              )}
            </Button>
          </div>

          {/* Break 2 - 10 mins */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Break 2 (10 mins)</p>
                {break2Status.startTime && (
                  <p className="text-xs text-muted-foreground">
                    {formatTime(break2Status.startTime)}
                    {break2Status.endTime && ` - ${formatTime(break2Status.endTime)}`}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant={break2Status.isOnBreak ? "destructive" : break2Status.hasCompletedBreak ? "outline" : "default"}
              disabled={loading === "break2" || !!break2Status.hasCompletedBreak}
              onClick={() => toggleBreak("break2")}
            >
              {loading === "break2" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : break2Status.isOnBreak ? (
                "End"
              ) : break2Status.hasCompletedBreak ? (
                "Done"
              ) : (
                "Start"
              )}
            </Button>
          </div>

          {/* Lunch - 30 mins */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Lunch (30 mins)</p>
                {lunchStatus.startTime && (
                  <p className="text-xs text-muted-foreground">
                    {formatTime(lunchStatus.startTime)}
                    {lunchStatus.endTime && ` - ${formatTime(lunchStatus.endTime)}`}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant={lunchStatus.isOnBreak ? "destructive" : lunchStatus.hasCompletedBreak ? "outline" : "default"}
              disabled={loading === "lunch" || !!lunchStatus.hasCompletedBreak}
              onClick={() => toggleBreak("lunch")}
            >
              {loading === "lunch" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : lunchStatus.isOnBreak ? (
                "End"
              ) : lunchStatus.hasCompletedBreak ? (
                "Done"
              ) : (
                "Start"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
