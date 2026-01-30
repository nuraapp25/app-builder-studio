import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ExportMenu from "@/components/ExportMenu";

interface AttendanceLog {
  id: string;
  user_id: string;
  sign_in_time: string;
  sign_out_time: string | null;
  latitude: number | null;
  longitude: number | null;
  sign_out_latitude?: number | null;
  sign_out_longitude?: number | null;
  google_maps_link: string | null;
  break1_start?: string | null;
  break1_end?: string | null;
  break2_start?: string | null;
  break2_end?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  profile?: {
    name: string;
    email: string | null;
  };
  manager_name?: string;
}

const AttendanceLogs = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Helper to format break duration
  const formatBreakDuration = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return "-";
    if (!end) return "In progress";
    const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${duration} min`;
  };

  // Prepare export data - must be before any early returns
  const exportData = useMemo(() => {
    return logs.map((log) => ({
      "Date": format(new Date(log.sign_in_time), "dd/MM/yyyy"),
      "FR ID": log.user_id.slice(0, 8),
      "FR Name": log.profile?.name || "-",
      "Ops Manager": log.manager_name || "-",
      "Location": "-",
      "Sign In Time": format(new Date(log.sign_in_time), "hh:mm a"),
      "Sign Out Time": log.sign_out_time ? format(new Date(log.sign_out_time), "hh:mm a") : "-",
      "Sign In GPS": log.latitude && log.longitude ? `${Number(log.latitude).toFixed(4)}, ${Number(log.longitude).toFixed(4)}` : "-",
      "Sign Out GPS": log.sign_out_latitude && log.sign_out_longitude ? `${Number(log.sign_out_latitude).toFixed(4)}, ${Number(log.sign_out_longitude).toFixed(4)}` : "-",
      "Break 1": formatBreakDuration(log.break1_start, log.break1_end),
      "Break 2": formatBreakDuration(log.break2_start, log.break2_end),
      "Lunch": formatBreakDuration(log.lunch_start, log.lunch_end),
      "Leads": 0,
      "Documents": 0,
    }));
  }, [logs]);

  useEffect(() => {
    fetchAttendanceLogs();
  }, []);

  const fetchAttendanceLogs = async () => {
    try {
      // Get attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .order("sign_in_time", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Get profiles for all users
      const userIds = [...new Set(attendanceData?.map((a) => a.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      // Map profiles to attendance records
      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
      const logsWithProfiles = attendanceData?.map((log) => ({
        ...log,
        profile: profilesMap.get(log.user_id),
      })) || [];

      setLogs(logsWithProfiles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatGPSLink = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const formatGPSDisplay = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) return "-";
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-24 safe-area-top">
        <div className="flex items-center justify-between px-4">
          <AppHeader title="Attendance Logs" subtitle={`${logs.length} records`} />
          <ExportMenu
            data={exportData}
            filename="Attendance_Logs"
            sheetName="Attendance"
          />
        </div>

        <div className="mx-4 mt-4 overflow-x-auto">
          <div className="min-w-[1700px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">FR ID</TableHead>
                  <TableHead className="whitespace-nowrap">FR Name</TableHead>
                  <TableHead className="whitespace-nowrap">Ops Manager</TableHead>
                  <TableHead className="whitespace-nowrap">Location</TableHead>
                  <TableHead className="whitespace-nowrap">Sign In Time</TableHead>
                  <TableHead className="whitespace-nowrap">Sign Out Time</TableHead>
                  <TableHead className="whitespace-nowrap">Sign In GPS</TableHead>
                  <TableHead className="whitespace-nowrap">Sign Out GPS</TableHead>
                  <TableHead className="whitespace-nowrap">Break 1</TableHead>
                  <TableHead className="whitespace-nowrap">Break 2</TableHead>
                  <TableHead className="whitespace-nowrap">Lunch</TableHead>
                  <TableHead className="whitespace-nowrap">Leads</TableHead>
                  <TableHead className="whitespace-nowrap">Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.sign_in_time), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {log.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.profile?.name || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.manager_name || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">-</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.sign_in_time), "hh:mm a")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.sign_out_time
                          ? format(new Date(log.sign_out_time), "hh:mm a")
                          : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.latitude && log.longitude ? (
                          <a
                            href={formatGPSLink(log.latitude, log.longitude) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            {formatGPSDisplay(log.latitude, log.longitude)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.sign_out_latitude && log.sign_out_longitude ? (
                          <a
                            href={formatGPSLink(log.sign_out_latitude, log.sign_out_longitude) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            {formatGPSDisplay(log.sign_out_latitude, log.sign_out_longitude)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center text-xs">
                        {formatBreakDuration(log.break1_start, log.break1_end)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center text-xs">
                        {formatBreakDuration(log.break2_start, log.break2_end)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center text-xs">
                        {formatBreakDuration(log.lunch_start, log.lunch_end)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center">0</TableCell>
                      <TableCell className="whitespace-nowrap text-center">0</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AttendanceLogs;
