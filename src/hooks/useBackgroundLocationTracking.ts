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

  const checkGeofence = useCallback(async (
    userId: string,
    latitude: number,
    longitude: number,
    areaName: string
  ) => {
    try {
      console.log('Checking geofence for user:', userId);
      const { data, error } = await supabase.functions.invoke('geofence-alert', {
        body: {
          userId,
          currentLatitude: latitude,
          currentLongitude: longitude,
          currentAreaName: areaName,
        },
      });

      if (error) {
        console.error('Geofence check error:', error);
        return;
      }

      if (data?.alert) {
        console.log('Geofence alert triggered! Distance:', data.distance, 'km');
      } else {
        console.log('Within geofence. Distance:', data?.distance, 'km');
      }
    } catch (error) {
      console.error('Failed to check geofence:', error);
    }
  }, []);

  const trackLocation = useCallback(async () => {
    console.log('trackLocation called', { userId, isSignedIn, attendanceRecordId });
    
    if (!userId || !isSignedIn || !attendanceRecordId) {
      console.log('Skipping location tracking - not signed in or missing data', {
        hasUserId: !!userId,
        isSignedIn,
        hasAttendanceRecordId: !!attendanceRecordId
      });
      return;
    }

    try {
      // Request permissions first
      const permissionStatus = await Geolocation.requestPermissions();
      console.log('Location permission status:', permissionStatus);
      
      if (permissionStatus.location !== 'granted') {
        console.error('Location permission denied');
        return;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      const { latitude, longitude } = position.coords;
      console.log('Got position:', { latitude, longitude });
      
      const areaName = await getAreaName(latitude, longitude);
      console.log('Area name:', areaName);

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
        console.log(`Location tracked successfully: ${areaName} (${latitude}, ${longitude})`);
        
        // Check geofence after successful location tracking
        await checkGeofence(userId, latitude, longitude, areaName);
      }
    } catch (error: any) {
      console.error('Location tracking error:', error);
      // Try with lower accuracy as fallback
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
        });
        
        const { latitude, longitude } = position.coords;
        const areaName = await getAreaName(latitude, longitude);

        const { error: insertError } = await supabase.from('location_tracking').insert({
          user_id: userId,
          attendance_record_id: attendanceRecordId,
          latitude,
          longitude,
          area_name: areaName,
          recorded_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error('Failed to save location (fallback):', insertError);
        } else {
          console.log(`Location tracked (fallback): ${areaName}`);
          // Check geofence after successful fallback location tracking
          await checkGeofence(userId, latitude, longitude, areaName);
        }
      } catch (fallbackError) {
        console.error('Fallback location tracking also failed:', fallbackError);
      }
    }
  }, [userId, isSignedIn, attendanceRecordId, checkGeofence]);

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
