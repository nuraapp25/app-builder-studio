import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, Megaphone, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationIdRef = useRef<string | null>(null);
  const { userRole } = useAuth();

  const isManagerOrAdmin = userRole?.role === 'admin' || userRole?.role === 'ops_manager';

  const playSirenSound = useCallback(() => {
    if (!soundEnabled || !isManagerOrAdmin) return;
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err);
      });
    }
  }, [soundEnabled, isManagerOrAdmin]);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    
    if (data) {
      // Check if there's a new notification (for siren)
      if (data.length > 0 && lastNotificationIdRef.current && 
          data[0].id !== lastNotificationIdRef.current &&
          data[0].title.includes('Geo-fence Alert')) {
        playSirenSound();
      }
      
      if (data.length > 0) {
        lastNotificationIdRef.current = data[0].id;
      }
      
      setNotifications(data);
    }
    setLoading(false);
  }, [playSirenSound]);

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
          setNotifications(prev => [newNotification, ...prev.slice(0, 2)]);
          
          // Play siren for geo-fence alerts
          if (newNotification.title.includes('Geo-fence Alert')) {
            playSirenSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, playSirenSound]);

  // Create audio element for siren sound
  useEffect(() => {
    // Using a simple oscillator-based siren sound
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Create a simple siren audio element using data URL
    const sirenDataUrl = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbJuYioRve4GJkouBd3R3f4WGhYF6dXZ6f4KCgH15d3h7fn+Af3x5d3h6fH1+fn57eXh4eXt8fX19fHp5eHl6e3x9fXx7enl5eXp7fHx8e3p5eXl6e3t8fHt6eXl5enp7e3t7enp5eXl6ent7e3p6eXl5enp7e3t6enl5eXp6e3t7enp5eXl6ent7e3p6eXl5enp7e3t6enl5eXp6e3t7enp5eXl6ent7e3p6eXl5enp7e3t6enl5eXp6e3t7enp5eXl6ent7e3p6eXl5enp7e3t6enl5eXp6e3t7enp5eXl6ent7e3p6eXl5enp7e3t6enl5eXp6e3t7enp5eXl6ent7e3p6eXl5enp7e3t6enl5eXp6e3t7enp5eXl6ent7e3p6eXl5enp7e3t6enl5eXp6e3t7enp5eXl6ent7e3p6";
    
    const audio = new Audio(sirenDataUrl);
    audio.loop = false;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      audioContext.close();
    };
  }, []);

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
      <Card className="mx-4 mt-4 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>
          <p className="text-sm text-muted-foreground">No new notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}
