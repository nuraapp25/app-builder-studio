import { motion } from "framer-motion";
import { Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
interface WelcomeHeaderProps {
  name: string;
  role: string;
  onSignOut: () => void;
}
export default function WelcomeHeader({
  name,
  role,
  onSignOut
}: WelcomeHeaderProps) {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const roleLabels: Record<string, string> = {
    admin: "Admin",
    ops_manager: "Operations Manager",
    field_recruiter: "Field Recruiter"
  };
  return <motion.div initial={{
    opacity: 0,
    y: -20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="mx-4 mt-4 p-5 rounded-2xl gradient-primary overflow-hidden relative text-white bg-accent">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-black">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs text-black font-semibold">{greeting}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut} className="text-white/80 hover:text-white hover:bg-white/10 h-8 px-2">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        <h2 className="text-xl font-bold text-black">Hello, {name}!</h2>
        <p className="text-sm mt-1 text-black">
          {roleLabels[role] || "Team Member"}
        </p>
      </div>
    </motion.div>;
}