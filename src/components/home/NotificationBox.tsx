import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, Megaphone, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GeofenceAlertOverlay from "@/components/GeofenceAlertOverlay";

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function NotificationBox() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlert, setActiveAlert] = useState<Notification | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const { userRole } = useAuth();

  const isManagerOrAdmin = userRole?.role === 'admin' || userRole?.role === 'ops_manager';

  const showAlert = useCallback((notification: Notification) => {
    if (!soundEnabled || !isManagerOrAdmin) return;
    if (dismissedAlerts.has(notification.id)) return;
    
    setActiveAlert(notification);
  }, [soundEnabled, isManagerOrAdmin, dismissedAlerts]);

  const handleDismissAlert = useCallback(() => {
    if (activeAlert) {
      setDismissedAlerts(prev => new Set([...prev, activeAlert.id]));
    }
    setActiveAlert(null);
  }, [activeAlert]);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
          
          // Show alert for geo-fence notifications
          if (newNotification.title.includes('Geo-fence Alert')) {
            showAlert(newNotification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, showAlert]);

  if (loading) {
    return (
      <Card className="mx-4 mt-4">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <>
        <GeofenceAlertOverlay notification={activeAlert} onDismiss={handleDismissAlert} />
        <Card className="mx-4 mt-4 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Notifications</h3>
            </div>
            <p className="text-sm text-muted-foreground">No new notifications</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <GeofenceAlertOverlay notification={activeAlert} onDismiss={handleDismissAlert} />
      <Card className="mx-4 mt-4 shadow-card overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {isManagerOrAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {notifications.length} new
              </span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  notification.title.includes('Geo-fence Alert') 
                    ? 'bg-destructive/10 border-l-4 border-l-destructive' 
                    : ''
                }`}
                onClick={() => {
                  if (notification.title.includes('Geo-fence Alert') && isManagerOrAdmin && soundEnabled) {
                    showAlert(notification);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    notification.title.includes('Geo-fence Alert')
                      ? 'bg-destructive/20'
                      : 'bg-primary/10'
                  }`}>
                    <Megaphone className={`w-4 h-4 ${
                      notification.title.includes('Geo-fence Alert')
                        ? 'text-destructive'
                        : 'text-primary'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {notification.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.content}
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
