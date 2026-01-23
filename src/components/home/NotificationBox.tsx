import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function NotificationBox() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    
    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

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
          <span className="text-xs text-muted-foreground">
            {notifications.length} new
          </span>
        </div>
        <div className="divide-y divide-border">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Megaphone className="w-4 h-4 text-primary" />
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
