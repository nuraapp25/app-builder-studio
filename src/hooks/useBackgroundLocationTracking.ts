import { useEffect, useRef, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TRACKING_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

interface UseBackgroundLocationTrackingProps {
  userId: string | undefined;
  isSignedIn: boolean;
  attendanceRecordId: string | undefined;
}

export function useBackgroundLocationTracking({
  userId,
  isSignedIn,
  attendanceRecordId,
}: UseBackgroundLocationTrackingProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const getAreaName = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { latitude, longitude },
      });
      
      if (error) {
        console.error('Reverse geocode error:', error);
        return 'Unknown Location';
      }
      
      return data?.areaName || 'Unknown Location';
    } catch (error) {
      console.error('Failed to get area name:', error);
      return 'Unknown Location';
    }
  };

  const trackLocation = useCallback(async () => {
    if (!userId || !isSignedIn || !attendanceRecordId) {
      console.log('Skipping location tracking - not signed in or missing data');
      return;
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const { latitude, longitude } = position.coords;
      const areaName = await getAreaName(latitude, longitude);

      const { error } = await supabase.from('location_tracking').insert({
        user_id: userId,
        attendance_record_id: attendanceRecordId,
        latitude,
        longitude,
        area_name: areaName,
        recorded_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to save location:', error);
      } else {
        console.log(`Location tracked: ${areaName} (${latitude}, ${longitude})`);
      }
    } catch (error: any) {
      console.error('Location tracking error:', error);
      // Don't show toast for every tracking failure to avoid spam
    }
  }, [userId, isSignedIn, attendanceRecordId]);

  useEffect(() => {
    if (isSignedIn && userId && attendanceRecordId) {
      // Track immediately on sign-in
      trackLocation();

      // Set up interval for periodic tracking
      intervalRef.current = setInterval(trackLocation, TRACKING_INTERVAL);

      console.log('Background location tracking started');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('Background location tracking stopped');
      }
    };
  }, [isSignedIn, userId, attendanceRecordId, trackLocation]);

  return { trackLocation };
}
