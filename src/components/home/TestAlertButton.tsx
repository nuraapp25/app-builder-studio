import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestAlertButtonProps {
  userId: string;
  userName: string;
  onAlertTriggered: (notification: { id: string; title: string; content: string }) => void;
}

export default function TestAlertButton({ userId, userName, onAlertTriggered }: TestAlertButtonProps) {
  const [loading, setLoading] = useState(false);

  const triggerTestAlert = async () => {
    setLoading(true);
    try {
      // Call the geofence-alert edge function with test data
      const { data, error } = await supabase.functions.invoke("geofence-alert", {
        body: {
          userId,
          currentLatitude: 28.6139, // Test coordinates (Delhi)
          currentLongitude: 77.2090,
          currentAreaName: "Test Location - Admin Triggered",
          isTestAlert: true,
        },
      });

      if (error) {
        throw error;
      }

      // Trigger the in-app alert overlay
      const testNotification = {
        id: `test-${Date.now()}`,
        title: "🚨 Test Geo-fence Alert",
        content: `This is a test alert triggered by ${userName}. The Slack notification has also been sent to #test-alerts channel.`,
      };
      
      onAlertTriggered(testNotification);
      toast.success("Test alert sent to Slack and displayed in-app");
    } catch (error) {
      console.error("Error triggering test alert:", error);
      toast.error("Failed to trigger test alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-4 mt-4 border-warning/30 bg-warning/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/20">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Admin Tools</h3>
              <p className="text-xs text-muted-foreground">Test the geo-fence alert system</p>
            </div>
          </div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              onClick={triggerTestAlert}
              disabled={loading}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              Test Alert
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
