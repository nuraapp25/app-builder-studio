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
    initMap: () => void;
  }
}

const MapView = () => {
  const [recruiters, setRecruiters] = useState<FieldRecruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentRecruiterIndex, setCurrentRecruiterIndex] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = async () => {
      // Check if Google Maps is already fully loaded
      if (window.google?.maps?.Map) {
        console.log('Google Maps already loaded');
        setMapLoaded(true);
        return;
      }

      try {
        setMapError(null);
        
        // Check if script is already in the DOM
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]');
        if (existingScript) {
          console.log('Google Maps script exists, waiting for it to load...');
          // Another screen already started loading the script. Wait for window.google.
          const waitStart = Date.now();
          const check = window.setInterval(() => {
            if (window.google?.maps?.Map) {
              console.log('Google Maps loaded via existing script');
              window.clearInterval(check);
              setMapLoaded(true);
            }
            if (Date.now() - waitStart > 15000) {
              window.clearInterval(check);
              setMapError("Map script did not finish loading");
            }
          }, 250);
          return;
        }

        console.log('Fetching Google Maps API key...');
        const { data, error } = await supabase.functions.invoke('get-maps-key', {});
        
        if (error || !data?.apiKey) {
          console.error('Failed to get Maps API key:', error);
          toast({
            title: "Error",
            description: "Failed to load Google Maps API key",
            variant: "destructive",
          });
          setMapError("Failed to load map key");
          return;
        }

        console.log('API key received, loading Google Maps script...');

        // Define the callback before adding the script
        window.initMap = () => {
          console.log('Google Maps initMap callback fired');
          setMapLoaded(true);
        };

        const script = document.createElement('script');
        script.dataset.googleMaps = "true";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&callback=initMap&v=weekly&libraries=geometry`;
        script.async = true;
        script.defer = true;

        script.onerror = (e) => {
          console.error('Google Maps script failed to load:', e);
          setMapError("Failed to load Google Maps script");
          toast({
            title: "Map failed to load",
            description: "Please check your internet connection and try again.",
            variant: "destructive",
          });
        };

        document.head.appendChild(script);

        // Safety timeout so we don't stay stuck on a blank map
        window.setTimeout(() => {
          if (!window.google?.maps?.Map) {
            console.error('Google Maps loading timed out');
            setMapError("Map loading timed out");
          }
        }, 15000);
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        setMapError("Unexpected error while loading map");
        toast({
          title: "Error",
          description: "Failed to load Google Maps",
          variant: "destructive",
        });
      }
    };

    loadGoogleMaps();
  }, [toast]);

  // Fetch field recruiters with their latest locations
  const fetchRecruiters = useCallback(async () => {
    try {
      // Get today's date range
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Get all field recruiters who are signed in today
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

      // Get latest location for each user
      const { data: locations, error: locationError } = await supabase
        .from('location_tracking')
        .select('user_id, latitude, longitude, area_name, recorded_at')
        .in('user_id', userIds)
        .order('recorded_at', { ascending: false });

      if (locationError) throw locationError;

      // Get profiles for the users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Map to get latest location per user
      const latestLocationsByUser = new Map<string, typeof locations[0]>();
      locations?.forEach(loc => {
        if (!latestLocationsByUser.has(loc.user_id)) {
          latestLocationsByUser.set(loc.user_id, loc);
        }
      });

      // Combine data
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
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchRecruiters, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRecruiters]);

  // Initialize map and markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Default center (Chennai, India)
    const defaultCenter = { lat: 13.0827, lng: 80.2707 };
    
    const mapOptions: google.maps.MapOptions = {
      zoom: 12,
      center: defaultCenter,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);
    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [mapLoaded]);

  // Update markers when recruiters change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (recruiters.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    recruiters.forEach((recruiter, index) => {
      const position = { lat: recruiter.latitude, lng: recruiter.longitude };
      bounds.extend(position);

      // Create numbered circle marker
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

    // Fit map to show all markers
    if (recruiters.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      if (recruiters.length === 1) {
        mapInstanceRef.current.setZoom(15);
      }
    }
  }, [recruiters, mapLoaded]);

  // Navigate to specific recruiter
  const navigateToRecruiter = useCallback((index: number) => {
    if (!mapInstanceRef.current || recruiters.length === 0) return;
    
    const recruiter = recruiters[index];
    const position = { lat: recruiter.latitude, lng: recruiter.longitude };
    
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setZoom(16);
    
    // Open the info window for this marker
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

          {/* Navigation controls */}
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

          {/* Map container - takes remaining space */}
          <div 
            ref={mapRef} 
            className="flex-1 rounded-xl overflow-hidden shadow-lg bg-muted"
            style={{ minHeight: '200px' }}
          >
            {(!mapLoaded || mapError) && (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {mapError ? "Map unavailable" : "Loading map..."}
                  </p>
                  {mapError && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {mapError}
                    </p>
                  )}
                </div>
              </div>
            )}
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
