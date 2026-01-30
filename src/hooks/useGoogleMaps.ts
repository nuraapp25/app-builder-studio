import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  error: string | null;
}

export const useGoogleMaps = (): UseGoogleMapsReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already loaded
    if (window.google?.maps?.Map) {
      setIsLoaded(true);
      return;
    }

    // Check if script exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for existing script to load
      const check = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(check);
          setIsLoaded(true);
        }
      }, 100);
      
      const timeout = setTimeout(() => {
        clearInterval(check);
        if (!window.google?.maps?.Map) {
          setError("Map loading timeout");
        }
      }, 10000);

      return () => {
        clearInterval(check);
        clearTimeout(timeout);
      };
    }

    // Load fresh
    const loadMaps = async () => {
      try {
        const { data, error: fetchError } = await supabase.functions.invoke('get-maps-key');
        
        if (fetchError || !data?.apiKey) {
          setError("Failed to get Maps API key");
          return;
        }

        const callbackName = `gmapsCallback${Date.now()}`;
        
        (window as any)[callbackName] = () => {
          setIsLoaded(true);
          delete (window as any)[callbackName];
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&callback=${callbackName}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          setError("Failed to load Maps script");
          delete (window as any)[callbackName];
        };
        
        document.head.appendChild(script);
      } catch (e) {
        setError("Error loading Maps");
      }
    };

    loadMaps();
  }, []);

  return { isLoaded, error };
};
