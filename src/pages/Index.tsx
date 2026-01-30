import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import WelcomeHeader from "@/components/home/WelcomeHeader";
import MarkAttendance from "@/components/home/MarkAttendance";
import NotificationBox from "@/components/home/NotificationBox";
import AppGrid from "@/components/home/AppGrid";
import TaskList from "@/components/home/TaskList";
import AppVersion from "@/components/home/AppVersion";
import TestAlertButton from "@/components/home/TestAlertButton";
import GeofenceAlertOverlay from "@/components/GeofenceAlertOverlay";

const Index = () => {
  const { user, profile, userRole, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [alertNotification, setAlertNotification] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="pb-24 safe-area-top">
        <WelcomeHeader
          name={profile?.name || "User"}
          role={userRole?.role || "field_recruiter"}
          onSignOut={handleSignOut}
        />
        
        <div className="mt-4">
          <MarkAttendance userId={user.id} />
        </div>

        <NotificationBox />

        <AppGrid />

        <TaskList userId={user.id} />

        {isAdmin && (
          <TestAlertButton
            userId={user.id}
            userName={profile?.name || "Admin"}
            onAlertTriggered={setAlertNotification}
          />
        )}

        <AppVersion />
      </div>

      <GeofenceAlertOverlay
        notification={alertNotification}
        onDismiss={() => setAlertNotification(null)}
      />
    </AppLayout>
  );
};

export default Index;
