import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const WelcomeCard = () => {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 p-5 rounded-2xl gradient-primary text-white overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs text-white/80">{greeting}</span>
        </div>
        <h2 className="text-xl font-bold">Welcome back, Alex!</h2>
        <p className="text-sm text-white/80 mt-1">
          You have 5 tasks due today. Keep up the great work!
        </p>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
        >
          View Today's Tasks
        </motion.button>
      </div>
    </motion.div>
  );
};

export default WelcomeCard;
