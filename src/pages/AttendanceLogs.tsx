import { useState, useEffect } from "react";
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
        <AppHeader title="Attendance Logs" subtitle={`${logs.length} records`} />

        <div className="mx-4 mt-4 overflow-x-auto">
          <div className="min-w-[1400px]">
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
                  <TableHead className="whitespace-nowrap">Leads</TableHead>
                  <TableHead className="whitespace-nowrap">Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
