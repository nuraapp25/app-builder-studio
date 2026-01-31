/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { MapPin, History, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { MapLoadingOverlay } from "@/components/maps/MapLoadingOverlay";

interface FieldRecruiter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  area_name: string;
  recorded_at: string;
}

declare global {
  interface Window {
    google: any;
  }
}

const MapView = () => {
  const [recruiters, setRecruiters] = useState<FieldRecruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRecruiterIndex, setCurrentRecruiterIndex] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load Google Maps
  useEffect(() => {
    let cancelled = false;

    const loadMap = async () => {
      // Already loaded
      if (window.google?.maps?.Map) {
        console.log('[MapView] Google Maps already available');
        if (!cancelled) setMapLoaded(true);
        return;
      }

      // Check for existing script
      const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existing) {
        console.log('[MapView] Script exists, waiting...');
        const poll = setInterval(() => {
          if (window.google?.maps?.Map) {
            clearInterval(poll);
            console.log('[MapView] Maps ready via polling');
            if (!cancelled) setMapLoaded(true);
          }
        }, 100);
        setTimeout(() => clearInterval(poll), 15000);
        return;
      }

      // Fetch API key and load script
      try {
        console.log('[MapView] Fetching API key...');
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        
        if (cancelled) return;
        
        if (error || !data?.apiKey) {
          console.error('[MapView] Failed to get API key:', error);
          setMapError('Failed to load map');
          return;
        }

        console.log('[MapView] Loading script...');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=geometry`;
        script.async = true;
        
        script.onload = () => {
          console.log('[MapView] Script loaded, waiting for Maps...');
          const poll = setInterval(() => {
            if (window.google?.maps?.Map) {
              clearInterval(poll);
              console.log('[MapView] Maps ready!');
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
          console.error('[MapView] Script load error');
          if (!cancelled) setMapError('Failed to load map');
        };
        
        document.head.appendChild(script);
      } catch (e) {
        console.error('[MapView] Error:', e);
        if (!cancelled) setMapError('Error loading map');
      }
    };

    loadMap();
    return () => { cancelled = true; };
  }, []);

  // Fetch field recruiters with their latest locations
  const fetchRecruiters = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: activeAttendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('user_id, id')
        .eq('record_type', 'sign_in')
        .is('sign_out_time', null)
        .gte('sign_in_time', todayStart.toISOString());

      if (attendanceError) throw attendanceError;

      if (!activeAttendance || activeAttendance.length === 0) {
        setRecruiters([]);
        setLoading(false);
        return;
      }

      const userIds = activeAttendance.map(a => a.user_id);

      const { data: locations, error: locationError } = await supabase
        .from('location_tracking')
        .select('user_id, latitude, longitude, area_name, recorded_at')
        .in('user_id', userIds)
        .order('recorded_at', { ascending: false });

      if (locationError) throw locationError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const latestLocationsByUser = new Map<string, typeof locations[0]>();
      locations?.forEach(loc => {
        if (!latestLocationsByUser.has(loc.user_id)) {
          latestLocationsByUser.set(loc.user_id, loc);
        }
      });

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      const recruitersData: FieldRecruiter[] = [];

      latestLocationsByUser.forEach((loc, userId) => {
        recruitersData.push({
          id: userId,
          name: profileMap.get(userId) || 'Unknown',
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          area_name: loc.area_name || 'Unknown Location',
          recorded_at: loc.recorded_at,
        });
      });

      setRecruiters(recruitersData);
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
  }, [toast]);

  useEffect(() => {
    fetchRecruiters();
    const interval = setInterval(fetchRecruiters, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRecruiters]);

  // Initialize map
  useEffect(() => {
    // Google Maps can finish loading while we're still rendering the page-level
    // loading state, meaning mapRef isn't mounted yet. Re-run on `loading`.
    if (!mapLoaded || loading || !mapRef.current) return;

    // Avoid re-initializing on rerenders for the same mount.
    if (mapInstanceRef.current) return;

    const defaultCenter = { lat: 13.0827, lng: 80.2707 };
    
    const initMap = () => {
      if (!mapRef.current || !window.google?.maps?.Map) return;
      
      console.log('[MapView] Initializing map...');
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      infoWindowRef.current = new google.maps.InfoWindow();

      try {
        google.maps.event.addListenerOnce(mapInstanceRef.current, "idle", () => {
          setMapInitialized(true);
        });
      } catch {
        setMapInitialized(true);
      }
      
      setTimeout(() => {
        if (mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, "resize");
          mapInstanceRef.current.setCenter(defaultCenter);
        }
      }, 100);
    };

    requestAnimationFrame(initMap);

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
      setMapInitialized(false);
    };
  }, [mapLoaded, loading]);

  // Update markers when recruiters change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (recruiters.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    recruiters.forEach((recruiter, index) => {
      const position = { lat: recruiter.latitude, lng: recruiter.longitude };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        label: {
          text: String(index + 1),
          color: 'white',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: '#bceb39',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        const content = `
          <div style="padding: 8px; min-width: 150px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${recruiter.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">
              <strong>Location:</strong> ${recruiter.area_name}
            </p>
            <p style="margin: 0; color: #999; font-size: 12px;">
              Last updated: ${format(new Date(recruiter.recorded_at), 'hh:mm a')}
            </p>
          </div>
        `;
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
    });

    if (recruiters.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      if (recruiters.length === 1) {
        mapInstanceRef.current.setZoom(15);
      }
    }
  }, [recruiters, mapLoaded]);

  const navigateToRecruiter = useCallback((index: number) => {
    if (!mapInstanceRef.current || recruiters.length === 0) return;
    
    const recruiter = recruiters[index];
    const position = { lat: recruiter.latitude, lng: recruiter.longitude };
    
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setZoom(16);
    
    if (markersRef.current[index] && infoWindowRef.current) {
      const content = `
        <div style="padding: 8px; min-width: 150px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${recruiter.name}</h3>
          <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">
            <strong>Location:</strong> ${recruiter.area_name}
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            Last updated: ${format(new Date(recruiter.recorded_at), 'hh:mm a')}
          </p>
        </div>
      `;
      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open(mapInstanceRef.current, markersRef.current[index]);
    }
    
    setCurrentRecruiterIndex(index);
  }, [recruiters]);

  const goToNextRecruiter = () => {
    if (recruiters.length === 0) return;
    const nextIndex = (currentRecruiterIndex + 1) % recruiters.length;
    navigateToRecruiter(nextIndex);
  };

  const goToPreviousRecruiter = () => {
    if (recruiters.length === 0) return;
    const prevIndex = (currentRecruiterIndex - 1 + recruiters.length) % recruiters.length;
    navigateToRecruiter(prevIndex);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-full max-w-sm px-6">
            <MapLoadingOverlay
              variant="inline"
              title="Loading Map View"
              description="Fetching active recruiters and preparing the map…"
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentRecruiter = recruiters[currentRecruiterIndex];

  return (
    <AppLayout>
      <div className="pb-20 safe-area-top flex flex-col" style={{ height: '100dvh' }}>
        <AppHeader 
          title="Map View" 
          subtitle={`${recruiters.length} active field recruiters`}
          backPath="/"
        />

        <div className="flex-1 flex flex-col overflow-hidden px-4 pt-3 pb-2 gap-2">
          <Button
            onClick={() => navigate('/map-history')}
            className="w-full shrink-0"
            variant="outline"
          >
            <History className="w-4 h-4 mr-2" />
            Show Location History
          </Button>

          {recruiters.length > 0 && (
            <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousRecruiter}
                disabled={recruiters.length <= 1}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <div className="text-center flex-1">
                <p className="font-medium text-foreground">{currentRecruiter?.name || 'No recruiters'}</p>
                <p className="text-xs text-muted-foreground">
                  {currentRecruiter ? `${currentRecruiterIndex + 1} of ${recruiters.length}` : ''}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextRecruiter}
                disabled={recruiters.length <= 1}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          <div 
            ref={mapRef} 
            className="flex-1 rounded-xl overflow-hidden shadow-lg bg-muted"
            style={{ minHeight: '200px' }}
          >
            {mapError ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">{mapError}</p>
                </div>
              </div>
            ) : !mapInitialized ? (
              <MapLoadingOverlay title="Loading map" description="Initializing Google Maps…" />
            ) : null}
          </div>

          {recruiters.length === 0 && !loading && (
            <div className="p-6 bg-card rounded-xl text-center shrink-0">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No field recruiters are currently signed in
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MapView;
