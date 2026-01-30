/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, endOfDay } from "date-fns";
import { ArrowLeft, Play, Pause, MapPin, RefreshCw, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExportMenu from "@/components/ExportMenu";

interface FieldRecruiter {
  id: string;
  name: string;
}

interface LocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  area_name: string;
  recorded_at: string;
  sequence: number;
}

declare global {
  interface Window {
    google: any;
  }
}

const MapHistory = () => {
  const [recruiters, setRecruiters] = useState<FieldRecruiter[]>([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState<string>("");
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [animationSpeed, setAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const animationMarkerRef = useRef<google.maps.Marker | null>(null);
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Prepare export data
  const selectedRecruiterName = useMemo(() => {
    return recruiters.find(r => r.id === selectedRecruiter)?.name || "Unknown";
  }, [recruiters, selectedRecruiter]);

  const exportData = useMemo(() => {
    return locationHistory.map((point) => ({
      "Stop #": point.sequence,
      "Recruiter": selectedRecruiterName,
      "Area Name": point.area_name,
      "Latitude": point.latitude,
      "Longitude": point.longitude,
      "Time": new Date(point.recorded_at).toLocaleTimeString(),
      "Date": new Date(point.recorded_at).toLocaleDateString(),
      "Google Maps Link": `https://www.google.com/maps?q=${point.latitude},${point.longitude}`,
    }));
  }, [locationHistory, selectedRecruiterName]);

  // Load Google Maps
  useEffect(() => {
    let cancelled = false;

    const loadMap = async () => {
      if (window.google?.maps?.Map) {
        console.log('[MapHistory] Google Maps already available');
        if (!cancelled) setMapLoaded(true);
        return;
      }

      const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existing) {
        console.log('[MapHistory] Script exists, waiting...');
        const poll = setInterval(() => {
          if (window.google?.maps?.Map) {
            clearInterval(poll);
            console.log('[MapHistory] Maps ready via polling');
            if (!cancelled) setMapLoaded(true);
          }
        }, 100);
        setTimeout(() => clearInterval(poll), 15000);
        return;
      }

      try {
        console.log('[MapHistory] Fetching API key...');
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        
        if (cancelled) return;
        
        if (error || !data?.apiKey) {
          console.error('[MapHistory] Failed to get API key:', error);
          setMapError('Failed to load map');
          return;
        }

        console.log('[MapHistory] Loading script...');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=geometry`;
        script.async = true;
        
        script.onload = () => {
          console.log('[MapHistory] Script loaded, waiting for Maps...');
          const poll = setInterval(() => {
            if (window.google?.maps?.Map) {
              clearInterval(poll);
              console.log('[MapHistory] Maps ready!');
              if (!cancelled) setMapLoaded(true);
            }
          }, 50);
          setTimeout(() => {
            clearInterval(poll);
            if (!window.google?.maps?.Map && !cancelled) {
              setMapError('Map failed to initialize');
            }
          }, 10000);
        };
        
        script.onerror = () => {
          console.error('[MapHistory] Script load error');
          if (!cancelled) setMapError('Failed to load map');
        };
        
        document.head.appendChild(script);
      } catch (e) {
        console.error('[MapHistory] Error:', e);
        if (!cancelled) setMapError('Error loading map');
      }
    };

    loadMap();
    return () => { cancelled = true; };
  }, []);

  // Fetch field recruiters
  useEffect(() => {
    const fetchRecruiters = async () => {
      try {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'field_recruiter');

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setRecruiters([]);
          setLoading(false);
          return;
        }

        const userIds = userRoles.map(r => r.user_id);

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        setRecruiters(profiles || []);
      } catch (error: any) {
        console.error('Error fetching recruiters:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRecruiters();
  }, [toast]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const defaultCenter = { lat: 13.0827, lng: 80.2707 };

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps?.Map) return;
      
      console.log('[MapHistory] Initializing map...');
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      setTimeout(() => {
        if (mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, "resize");
          mapInstanceRef.current.setCenter(defaultCenter);
        }
      }, 100);
    };

    requestAnimationFrame(initMap);

    return () => {
      clearMapElements();
    };
  }, [mapLoaded]);

  const clearMapElements = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    animationMarkerRef.current?.setMap(null);
    animationMarkerRef.current = null;
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
  };

  const fetchLocationHistory = async () => {
    if (!selectedRecruiter) {
      toast({
        title: "Select a recruiter",
        description: "Please select a field recruiter first",
        variant: "destructive",
      });
      return;
    }

    setFetchingHistory(true);
    clearMapElements();
    setIsAnimating(false);
    setAnimationProgress(0);

    try {
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id, sign_in_time, sign_out_time')
        .eq('user_id', selectedRecruiter)
        .eq('record_type', 'sign_in')
        .gte('sign_in_time', dayStart.toISOString())
        .lte('sign_in_time', dayEnd.toISOString())
        .order('sign_in_time', { ascending: false })
        .limit(1);

      if (attendanceError) throw attendanceError;

      if (!attendance || attendance.length === 0) {
        toast({
          title: "No data",
          description: `No attendance record found for ${format(selectedDate, 'PPP')}`,
        });
        setLocationHistory([]);
        setFetchingHistory(false);
        return;
      }

      const attendanceRecord = attendance[0];
      const signInTime = new Date(attendanceRecord.sign_in_time);
      const signOutTime = attendanceRecord.sign_out_time 
        ? new Date(attendanceRecord.sign_out_time) 
        : new Date();

      let { data: locations, error: locationsError } = await supabase
        .from('location_tracking')
        .select('*')
        .eq('attendance_record_id', attendanceRecord.id)
        .order('recorded_at', { ascending: true });

      if (locationsError) throw locationsError;

      if (!locations || locations.length === 0) {
        const { data: fallbackLocations, error: fallbackError } = await supabase
          .from('location_tracking')
          .select('*')
          .eq('user_id', selectedRecruiter)
          .gte('recorded_at', signInTime.toISOString())
          .lte('recorded_at', signOutTime.toISOString())
          .order('recorded_at', { ascending: true });

        if (fallbackError) throw fallbackError;
        locations = fallbackLocations;
      }

      if (!locations || locations.length === 0) {
        const { data: dayLocations, error: dayError } = await supabase
          .from('location_tracking')
          .select('*')
          .eq('user_id', selectedRecruiter)
          .gte('recorded_at', dayStart.toISOString())
          .lte('recorded_at', dayEnd.toISOString())
          .order('recorded_at', { ascending: true });

        if (dayError) throw dayError;
        locations = dayLocations;
      }

      if (!locations || locations.length === 0) {
        toast({
          title: "No location data",
          description: `No location history found for ${format(selectedDate, 'PPP')}`,
        });
        setLocationHistory([]);
        setFetchingHistory(false);
        return;
      }

      const historyWithSequence: LocationPoint[] = locations.map((loc, index) => ({
        id: loc.id,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        area_name: loc.area_name || 'Unknown',
        recorded_at: loc.recorded_at,
        sequence: index + 1,
      }));

      setLocationHistory(historyWithSequence);
      displayLocationHistory(historyWithSequence);
    } catch (error: any) {
      console.error('Error fetching location history:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFetchingHistory(false);
    }
  };

  const displayLocationHistory = (history: LocationPoint[]) => {
    if (!mapInstanceRef.current || history.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const path: google.maps.LatLngLiteral[] = [];

    history.forEach((point) => {
      const position = { lat: point.latitude, lng: point.longitude };
      bounds.extend(position);
      path.push(position);

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        label: {
          text: String(point.sequence),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: '#bceb39',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <p style="margin: 0 0 4px 0;"><strong>Stop ${point.sequence}</strong></p>
            <p style="margin: 0 0 4px 0;">${point.area_name}</p>
            <p style="margin: 0; color: #666; font-size: 12px;">
              ${format(new Date(point.recorded_at), 'hh:mm a')}
            </p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
    });

    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#bceb39',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstanceRef.current,
    });

    mapInstanceRef.current.fitBounds(bounds);
  };

  const startAnimation = () => {
    if (locationHistory.length < 2) {
      toast({
        title: "Not enough data",
        description: "Need at least 2 location points to animate",
      });
      return;
    }

    setIsAnimating(true);
    setAnimationProgress(0);

    const startPosition = {
      lat: locationHistory[0].latitude,
      lng: locationHistory[0].longitude,
    };

    animationMarkerRef.current = new google.maps.Marker({
      position: startPosition,
      map: mapInstanceRef.current!,
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#ff4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        rotation: 0,
      },
      zIndex: 1000,
    });

    const speedDurations = { slow: 60000, normal: 30000, fast: 15000 };
    const totalDuration = speedDurations[animationSpeed];
    const steps = 300;
    const intervalTime = totalDuration / steps;
    let currentStep = 0;

    const pathPoints = locationHistory.map(loc => ({
      lat: loc.latitude,
      lng: loc.longitude,
    }));

    let totalDistance = 0;
    const segmentDistances: number[] = [];
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const dist = google.maps.geometry?.spherical.computeDistanceBetween(
        new google.maps.LatLng(pathPoints[i]),
        new google.maps.LatLng(pathPoints[i + 1])
      ) || 1;
      segmentDistances.push(dist);
      totalDistance += dist;
    }

    animationIntervalRef.current = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      setAnimationProgress(Math.round(progress * 100));

      if (progress >= 1) {
        setIsAnimating(false);
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
          animationIntervalRef.current = null;
        }
        return;
      }

      const targetDistance = progress * totalDistance;
      let accumulatedDistance = 0;
      let segmentIndex = 0;

      for (let i = 0; i < segmentDistances.length; i++) {
        if (accumulatedDistance + segmentDistances[i] >= targetDistance) {
          segmentIndex = i;
          break;
        }
        accumulatedDistance += segmentDistances[i];
      }

      const segmentProgress = (targetDistance - accumulatedDistance) / segmentDistances[segmentIndex];
      const startPoint = pathPoints[segmentIndex];
      const endPoint = pathPoints[segmentIndex + 1] || pathPoints[segmentIndex];

      const currentLat = startPoint.lat + (endPoint.lat - startPoint.lat) * segmentProgress;
      const currentLng = startPoint.lng + (endPoint.lng - startPoint.lng) * segmentProgress;

      const heading = google.maps.geometry?.spherical.computeHeading(
        new google.maps.LatLng(startPoint),
        new google.maps.LatLng(endPoint)
      ) || 0;

      animationMarkerRef.current?.setPosition({ lat: currentLat, lng: currentLng });
      animationMarkerRef.current?.setIcon({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#ff4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        rotation: heading,
      });
    }, intervalTime);
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    animationMarkerRef.current?.setMap(null);
    animationMarkerRef.current = null;
    setAnimationProgress(0);
  };

  const reloadMap = () => {
    if (!mapInstanceRef.current) return;
    try {
      google.maps.event.trigger(mapInstanceRef.current, "resize");
      const defaultCenter = { lat: 13.0827, lng: 80.2707 };
      mapInstanceRef.current.setCenter(defaultCenter);
      mapInstanceRef.current.setZoom(12);
      toast({
        title: "Map reloaded",
        description: "Map has been refreshed",
      });
    } catch (e) {
      console.error("Failed to reload map:", e);
    }
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
      <div className="pb-24 safe-area-top flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>
        <div className="gradient-primary p-4 pt-12">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/map-view')}
              className="text-primary-foreground hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">
                Location History
              </h1>
              <p className="text-sm text-primary-foreground/80">
                View recruiter travel path
              </p>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4 space-y-3">
          <div className="flex gap-2">
            <Select
              value={selectedRecruiter}
              onValueChange={setSelectedRecruiter}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select Field Recruiter" />
              </SelectTrigger>
              <SelectContent>
                {recruiters.map((recruiter) => (
                  <SelectItem key={recruiter.id} value={recruiter.id}>
                    {recruiter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "MMM dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={fetchLocationHistory}
              disabled={!selectedRecruiter || fetchingHistory}
              className="flex-1"
            >
              {fetchingHistory ? "Loading..." : "Fetch History"}
            </Button>

            {locationHistory.length >= 2 && (
              <Button
                onClick={isAnimating ? stopAnimation : startAnimation}
                variant={isAnimating ? "destructive" : "outline"}
              >
                {isAnimating ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    {animationProgress}%
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Animate
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <Button
                  key={speed}
                  variant={animationSpeed === speed ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAnimationSpeed(speed)}
                  className="text-xs px-3"
                >
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </Button>
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={reloadMap}
              title="Reload map"
              disabled={!mapLoaded}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 mx-4 my-4 rounded-xl overflow-hidden shadow-lg bg-muted relative" style={{ minHeight: '350px' }}>
          <div 
            ref={mapRef} 
            className="absolute inset-0"
            style={{ display: mapLoaded && !mapError ? 'block' : 'none' }}
          />
          {(!mapLoaded || mapError) && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {mapError ? mapError : "Loading map..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {locationHistory.length > 0 && (
          <div className="mx-4 mb-4 p-3 bg-card rounded-xl flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {locationHistory.length} locations tracked from{' '}
              {format(new Date(locationHistory[0].recorded_at), 'hh:mm a')} to{' '}
              {format(new Date(locationHistory[locationHistory.length - 1].recorded_at), 'hh:mm a')}
            </p>
            <ExportMenu
              data={exportData}
              filename={`Location_History_${selectedRecruiterName.replace(/\s+/g, '_')}`}
              sheetName="Location History"
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MapHistory;
