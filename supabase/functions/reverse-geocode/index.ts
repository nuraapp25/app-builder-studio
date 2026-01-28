import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Missing latitude or longitude' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

    console.log(`Reverse geocoding: ${latitude}, ${longitude}`);

    const response = await fetch(url);
    const data = await response.json();

    let areaName = 'Unknown Location';

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Try to find a neighborhood, sublocality, or locality
      for (const result of data.results) {
        for (const component of result.address_components) {
          if (component.types.includes('sublocality_level_1') ||
            component.types.includes('sublocality') ||
            component.types.includes('neighborhood')) {
            areaName = component.long_name;
            break;
          }
        }
        if (areaName !== 'Unknown Location') break;
      }

      // Fallback to locality if no sublocality found
      if (areaName === 'Unknown Location') {
        for (const result of data.results) {
          for (const component of result.address_components) {
            if (component.types.includes('locality')) {
              areaName = component.long_name;
              break;
            }
          }
          if (areaName !== 'Unknown Location') break;
        }
      }
    }

    console.log(`Area name resolved: ${areaName}`);

    return new Response(
      JSON.stringify({ areaName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Reverse geocode error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
