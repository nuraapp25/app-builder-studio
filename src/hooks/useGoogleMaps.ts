import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  error: string | null;
}

// Global state to track loading across components
let globalLoadPromise: Promise<void> | null = null;
let globalLoadState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
let globalError: string | null = null;

// Callbacks to notify all waiting hooks
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(cb => cb());
};

const loadGoogleMapsScript = async (): Promise<void> => {
  // Already loaded
  if (window.google?.maps?.Map) {
    globalLoadState = 'loaded';
    return;
  }

  // Script already in DOM - wait for it
  const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]');
  if (existingScript) {
    return new Promise((resolve, reject) => {
      const waitStart = Date.now();
      const check = window.setInterval(() => {
        if (window.google?.maps?.Map) {
          window.clearInterval(check);
          globalLoadState = 'loaded';
          resolve();
        }
        if (Date.now() - waitStart > 15000) {
          window.clearInterval(check);
          globalLoadState = 'error';
          globalError = "Map script did not finish loading";
          reject(new Error(globalError));
        }
      }, 250);
    });
  }

  // Fetch API key and load script
  const { data, error } = await supabase.functions.invoke('get-maps-key', {});
  
  if (error || !data?.apiKey) {
    globalLoadState = 'error';
    globalError = "Failed to load Google Maps API key";
    throw new Error(globalError);
  }

  return new Promise((resolve, reject) => {
    // Use a unique callback name
    const callbackName = `initGoogleMapsCallback_${Date.now()}`;
    
    (window as any)[callbackName] = () => {
      globalLoadState = 'loaded';
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.dataset.googleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&callback=${callbackName}&v=weekly&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      globalLoadState = 'error';
      globalError = "Failed to load Google Maps script";
      delete (window as any)[callbackName];
      reject(new Error(globalError));
    };

    document.head.appendChild(script);

    // Safety timeout
    window.setTimeout(() => {
      if (!window.google?.maps?.Map && globalLoadState === 'loading') {
        globalLoadState = 'error';
        globalError = "Map loading timed out";
        delete (window as any)[callbackName];
        reject(new Error(globalError));
      }
    }, 15000);
  });
};

export const useGoogleMaps = (): UseGoogleMapsReturn => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const update = () => forceUpdate({});
    listeners.add(update);

    // If already loaded, return immediately
    if (globalLoadState === 'loaded' || window.google?.maps?.Map) {
      globalLoadState = 'loaded';
      update();
      return () => { listeners.delete(update); };
    }

    // If there's an error, don't retry
    if (globalLoadState === 'error') {
      return () => { listeners.delete(update); };
    }

    // Start loading if not already
    if (globalLoadState === 'idle') {
      globalLoadState = 'loading';
      globalLoadPromise = loadGoogleMapsScript()
        .then(() => {
          notifyListeners();
        })
        .catch((err) => {
          console.error('Google Maps load error:', err);
          notifyListeners();
        });
    }

    return () => { listeners.delete(update); };
  }, []);

  return {
    isLoaded: globalLoadState === 'loaded' || !!window.google?.maps?.Map,
    error: globalLoadState === 'error' ? globalError : null,
  };
};
