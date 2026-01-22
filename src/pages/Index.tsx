import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import QuickStats from "@/components/dashboard/QuickStats";
import RecentTasks from "@/components/dashboard/RecentTasks";
import Announcements from "@/components/dashboard/Announcements";

const Index = () => {
  return (
    <AppLayout>
      <AppHeader title="WorkHub" subtitle="Your productivity companion" />
      <div className="pb-6">
        <WelcomeCard />
        <div className="mt-6">
          <QuickStats />
        </div>
        <RecentTasks />
        <Announcements />
      </div>
    </AppLayout>
  );
};

export default Index;
