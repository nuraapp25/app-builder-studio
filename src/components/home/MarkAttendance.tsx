import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, CheckCircle2, LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord {
  id: string;
  record_type: string;
  sign_in_time: string;
  latitude: number | null;
  longitude: number | null;
}

export default function MarkAttendance({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodayAttendance();
  }, [userId]);

  const fetchTodayAttendance = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", userId)
      .gte("sign_in_time", today.toISOString())
      .order("sign_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setTodayRecord(data);
    }
  };

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  const handleMarkAttendance = async (recordType: "sign_in" | "sign_out") => {
    setLoading(true);
    setLocationLoading(true);

    try {
      // Get GPS location
      let latitude: number | null = null;
      let longitude: number | null = null;
      let googleMapsLink: string | null = null;

      try {
        const position = await getCurrentLocation();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setCurrentLocation({ lat: latitude, lng: longitude });
      } catch (geoError) {
        toast({
          title: "Location Access",
          description: "Could not get your location. Attendance will be recorded without GPS.",
          variant: "destructive",
        });
      }

      setLocationLoading(false);

      // Insert attendance record
      const { error } = await supabase.from("attendance_records").insert({
        user_id: userId,
        record_type: recordType,
        sign_in_time: new Date().toISOString(),
        latitude,
        longitude,
        google_maps_link: googleMapsLink,
      });

      if (error) throw error;

      toast({
        title: recordType === "sign_in" ? "Signed In!" : "Signed Out!",
        description: `Your ${recordType === "sign_in" ? "sign in" : "sign out"} has been recorded at ${new Date().toLocaleTimeString()}`,
      });

      fetchTodayAttendance();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record attendance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLocationLoading(false);
    }
  };

  const isSignedIn = todayRecord?.record_type === "sign_in";

  return (
    <Card className="mx-4 overflow-hidden shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Mark Attendance</h3>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {todayRecord && (
            <div className="flex items-center gap-1 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">
                {isSignedIn ? "Signed In" : "Signed Out"}
              </span>
            </div>
          )}
        </div>

        {todayRecord && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                Last {todayRecord.record_type === "sign_in" ? "Sign In" : "Sign Out"}:{" "}
                {new Date(todayRecord.sign_in_time).toLocaleTimeString()}
              </span>
            </div>
            {todayRecord.latitude && todayRecord.longitude && (
              <div className="flex items-center gap-2 text-sm mt-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>
                  Location: {todayRecord.latitude.toFixed(4)}, {todayRecord.longitude.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => handleMarkAttendance("sign_in")}
              disabled={loading || isSignedIn}
              className="w-full gradient-primary text-primary-foreground"
            >
              {loading && locationLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Sign In
            </Button>
          </motion.div>
          <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => handleMarkAttendance("sign_out")}
              disabled={loading || !isSignedIn}
              variant="outline"
              className="w-full"
            >
              {loading && !locationLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Sign Out
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
