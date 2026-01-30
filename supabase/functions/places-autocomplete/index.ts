import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { input } = await req.json();
    
    if (!input || input.length < 3) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching places for:', input);

    // Using Places API (New) - Autocomplete endpoint
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: input,
        includedRegionCodes: ['in'],
      }),
    });

    const data = await response.json();
    console.log('Places API response:', JSON.stringify(data).substring(0, 200));

    // Transform the new API response to match the expected format
    const predictions = (data.suggestions || []).map((suggestion: any) => ({
      place_id: suggestion.placePrediction?.placeId || '',
      description: suggestion.placePrediction?.text?.text || '',
      structured_formatting: {
        main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || '',
        secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text || '',
      },
    })).filter((p: any) => p.place_id);

    return new Response(
      JSON.stringify({ status: 'OK', predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Places autocomplete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
