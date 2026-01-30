import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  error: string | null;
}

// Track global loading state to prevent multiple script loads
let isLoadingScript = false;
let loadPromise: Promise<void> | null = null;

const loadGoogleMapsScript = async (): Promise<void> => {
  // Already loaded
  if (window.google?.maps?.Map) {
    console.log('[GoogleMaps] Already loaded');
    return;
  }

  // Check if already loading
  if (loadPromise) {
    console.log('[GoogleMaps] Waiting for existing load');
    return loadPromise;
  }

  // Check if script already in DOM
  const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existing) {
    console.log('[GoogleMaps] Script exists, polling...');
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.google?.maps?.Map) {
          clearInterval(poll);
          console.log('[GoogleMaps] Loaded via polling');
          resolve();
        }
        if (attempts > 150) { // 15 seconds
          clearInterval(poll);
          reject(new Error('Timeout waiting for Google Maps'));
        }
      }, 100);
    });
  }

  isLoadingScript = true;

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('[GoogleMaps] Fetching API key...');
      const { data, error } = await supabase.functions.invoke('get-maps-key');

      if (error || !data?.apiKey) {
        console.error('[GoogleMaps] Failed to get API key:', error);
        reject(new Error('Failed to get Maps API key'));
        return;
      }

      console.log('[GoogleMaps] Got API key, loading script...');

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=geometry`;
      script.async = true;

      script.onload = () => {
        console.log('[GoogleMaps] Script onload fired, polling for Maps...');
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          if (window.google?.maps?.Map) {
            clearInterval(poll);
            console.log('[GoogleMaps] Maps available!');
            isLoadingScript = false;
            resolve();
          }
          if (attempts > 100) { // 10 seconds
            clearInterval(poll);
            console.error('[GoogleMaps] Maps object not available after script load');
            isLoadingScript = false;
            reject(new Error('Google Maps failed to initialize'));
          }
        }, 100);
      };

      script.onerror = (e) => {
        console.error('[GoogleMaps] Script load error:', e);
        isLoadingScript = false;
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    } catch (e) {
      console.error('[GoogleMaps] Exception:', e);
      isLoadingScript = false;
      reject(e);
    }
  });

  return loadPromise;
};

export function useGoogleMaps(): UseGoogleMapsReturn {
  const [isLoaded, setIsLoaded] = React.useState<boolean>(!!window.google?.maps?.Map);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (window.google?.maps?.Map) {
      setIsLoaded(true);
      return;
    }

    let mounted = true;

    loadGoogleMapsScript()
      .then(() => {
        if (mounted) {
          console.log('[GoogleMaps] Hook: setIsLoaded(true)');
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('[GoogleMaps] Hook: setError', err.message);
          setError(err.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { isLoaded, error };
}
