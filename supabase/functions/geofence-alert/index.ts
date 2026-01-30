import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Haversine formula to calculate distance between two points in km
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

async function sendSlackAlert(
  slackToken: string,
  channel: string,
  recruiterName: string,
  assignedLocation: string,
  currentArea: string,
  distanceKm: number
): Promise<void> {
  const message = {
    channel,
    text: `🚨 *Geo-fence Alert*\n\n*Field Recruiter:* ${recruiterName}\n*Assigned Location:* ${assignedLocation}\n*Current Location:* ${currentArea}\n*Distance from assigned area:* ${distanceKm.toFixed(2)} km\n\nThe recruiter has moved outside the 1km radius of their assigned location.`,
  };

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('Slack API error:', result.error);
    throw new Error(`Slack API error: ${result.error}`);
  }
  console.log('Slack alert sent successfully');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
    if (!slackToken) {
      console.error('SLACK_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Slack bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, currentLatitude, currentLongitude, currentAreaName } = await req.json();
    
    console.log('Geofence check for user:', userId);
    console.log('Current location:', { currentLatitude, currentLongitude, currentAreaName });

    if (!userId || currentLatitude === undefined || currentLongitude === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, currentLatitude, currentLongitude' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's assignment for this recruiter
    const today = new Date().toISOString().split('T')[0];
    const { data: assignment, error: assignmentError } = await supabase
      .from('field_planning_assignments')
      .select('*')
      .eq('field_recruiter_id', userId)
      .eq('assignment_date', today)
      .maybeSingle();

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch assignment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!assignment || !assignment.latitude || !assignment.longitude) {
      console.log('No assignment with coordinates found for today');
      return new Response(
        JSON.stringify({ message: 'No assignment found for today or no coordinates set', alert: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate distance from assigned location
    const distance = calculateDistance(
      currentLatitude,
      currentLongitude,
      Number(assignment.latitude),
      Number(assignment.longitude)
    );

    console.log(`Distance from assigned location: ${distance.toFixed(2)} km`);

    const GEOFENCE_RADIUS_KM = 1; // 1km radius

    if (distance > GEOFENCE_RADIUS_KM) {
      console.log('User is outside geofence! Sending Slack alert...');

      // Get recruiter profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const recruiterName = profile?.name || 'Unknown Recruiter';

      // Send Slack alert to #test-alerts channel
      const slackChannel = '#test-alerts';
      
      await sendSlackAlert(
        slackToken,
        slackChannel,
        recruiterName,
        assignment.location_name,
        currentAreaName || 'Unknown',
        distance
      );

      return new Response(
        JSON.stringify({ 
          message: 'User outside geofence - alert sent',
          alert: true,
          distance: distance.toFixed(2),
          assignedLocation: assignment.location_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'User within geofence',
        alert: false,
        distance: distance.toFixed(2),
        assignedLocation: assignment.location_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Geofence alert error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
