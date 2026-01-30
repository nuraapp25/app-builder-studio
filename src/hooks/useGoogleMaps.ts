import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  error: string | null;
}

export function useGoogleMaps(): UseGoogleMapsReturn {
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkAndLoad = async () => {
      // Check if already available
      if (window.google?.maps?.Map) {
        if (mounted) setIsLoaded(true);
        return;
      }

      // Check if script exists in DOM
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      
      if (existingScript) {
        // Poll until available
        pollInterval = setInterval(() => {
          if (window.google?.maps?.Map) {
            if (pollInterval) clearInterval(pollInterval);
            if (mounted) setIsLoaded(true);
          }
        }, 100);

        // Timeout
        setTimeout(() => {
          if (pollInterval) clearInterval(pollInterval);
          if (!window.google?.maps?.Map && mounted) {
            setError("Map loading timeout");
          }
        }, 15000);
        return;
      }

      // Need to load script
      try {
        const { data, error: fetchErr } = await supabase.functions.invoke('get-maps-key');
        
        if (!mounted) return;
        
        if (fetchErr || !data?.apiKey) {
          setError("Failed to get Maps API key");
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=geometry`;
        script.async = true;

        script.onload = () => {
          // Poll for Maps object
          pollInterval = setInterval(() => {
            if (window.google?.maps?.Map) {
              if (pollInterval) clearInterval(pollInterval);
              if (mounted) setIsLoaded(true);
            }
          }, 50);

          setTimeout(() => {
            if (pollInterval) clearInterval(pollInterval);
            if (!window.google?.maps?.Map && mounted) {
              setError("Maps failed to initialize");
            }
          }, 10000);
        };

        script.onerror = () => {
          if (mounted) setError("Failed to load Maps script");
        };

        document.head.appendChild(script);
      } catch (e) {
        if (mounted) setError("Error loading Maps");
      }
    };

    checkAndLoad();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return { isLoaded, error };
}
