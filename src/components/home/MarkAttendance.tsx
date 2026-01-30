import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, CheckCircle2, LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useBackgroundLocationTracking } from "@/hooks/useBackgroundLocationTracking";

interface AttendanceRecord {
  id: string;
  record_type: string;
  sign_in_time: string;
  sign_out_time: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface MarkAttendanceProps {
  userId: string;
  onAttendanceChange?: (record: AttendanceRecord | null) => void;
}

export default function MarkAttendance({ userId, onAttendanceChange }: MarkAttendanceProps) {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  // User is signed in if there's an active sign-in record (no sign-out yet)
  const isSignedIn = !!todayRecord;

  // Initialize background location tracking
  useBackgroundLocationTracking({
    userId,
    isSignedIn,
    attendanceRecordId: todayRecord?.id,
  });

  useEffect(() => {
    fetchTodayAttendance();
  }, [userId]);

  const fetchTodayAttendance = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fetch the most recent sign-in record for today that doesn't have a sign-out
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", userId)
      .eq("record_type", "sign_in") // Only look for sign-in records
      .is("sign_out_time", null) // That haven't been signed out
      .gte("sign_in_time", today.toISOString())
      .order("sign_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setTodayRecord(data);
    onAttendanceChange?.(data);
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    console.log('getCurrentLocation called, isNativePlatform:', Capacitor.isNativePlatform());
    
    // Use Capacitor Geolocation plugin for native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        // Request permissions first on native
        const permissionStatus = await Geolocation.requestPermissions();
        console.log('Native permission status:', permissionStatus);
        
        if (permissionStatus.location !== 'granted') {
          throw new Error("Location permission denied");
        }
        
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        
        console.log('Native position obtained:', position.coords.latitude, position.coords.longitude);
        
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (error: any) {
        console.error('Native geolocation error:', error);
        throw error;
      }
    }
    
    // Fallback to browser geolocation for web
    console.log('Using browser geolocation...');
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported by browser');
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Browser position obtained:', position.coords.latitude, position.coords.longitude);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Browser geolocation error:', error.code, error.message);
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleMarkAttendance = async (recordType: "sign_in" | "sign_out") => {
    console.log('handleMarkAttendance called:', recordType);
    setLoading(true);
    setLocationLoading(true);

    try {
      // Get GPS location
      let latitude: number | null = null;
      let longitude: number | null = null;
      let googleMapsLink: string | null = null;

      try {
        console.log('Attempting to get current location...');
        const position = await getCurrentLocation();
        latitude = position.latitude;
        longitude = position.longitude;
        googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setCurrentLocation({ lat: latitude, lng: longitude });
        console.log('Location obtained successfully:', { latitude, longitude, googleMapsLink });
      } catch (geoError: any) {
        console.error("GPS Error details:", geoError);
        toast({
          title: "Location Access Failed",
          description: geoError.message || "Could not get your location. Attendance will be recorded without GPS.",
          variant: "destructive",
        });
      }

      setLocationLoading(false);
      console.log('Proceeding with attendance record. Latitude:', latitude, 'Longitude:', longitude);

      if (recordType === "sign_in") {
        // Insert new attendance record for sign-in
        const { error } = await supabase.from("attendance_records").insert({
          user_id: userId,
          record_type: recordType,
          sign_in_time: new Date().toISOString(),
          latitude,
          longitude,
          google_maps_link: googleMapsLink,
        });

        if (error) throw error;
      } else {
        // Update existing sign-in record with sign-out time and location
        if (!todayRecord) {
          throw new Error("No active sign-in record found to update");
        }

        const { error } = await supabase
          .from("attendance_records")
          .update({
            sign_out_time: new Date().toISOString(),
            sign_out_latitude: latitude,
            sign_out_longitude: longitude,
          })
          .eq("id", todayRecord.id)
          .eq("record_type", "sign_in"); // Ensure we're updating a sign-in record

        if (error) throw error;
      }

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
                Sign In: {new Date(todayRecord.sign_in_time).toLocaleTimeString()}
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
