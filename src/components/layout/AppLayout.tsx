import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import ThemeToggle from "@/components/ThemeToggle";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
      <ThemeToggle />
    </div>
  );
};

export default AppLayout;
