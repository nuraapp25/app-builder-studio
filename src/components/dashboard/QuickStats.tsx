import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  variant: "primary" | "success" | "warning" | "accent";
  delay: number;
}

const variantStyles = {
  primary: "gradient-primary",
  success: "gradient-success",
  warning: "bg-warning",
  accent: "gradient-accent",
};

const StatCard = ({ icon: Icon, label, value, trend, variant, delay }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="bg-card rounded-xl p-4 shadow-card"
  >
    <div className={`inline-flex p-2 rounded-lg ${variantStyles[variant]} mb-3`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <div className="flex items-center justify-between mt-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {trend && (
        <span className="flex items-center gap-0.5 text-xs text-success">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </span>
      )}
    </div>
  </motion.div>
);

const QuickStats = () => {
  const stats = [
    { icon: CheckCircle2, label: "Completed", value: 24, trend: "+12%", variant: "success" as const },
    { icon: Clock, label: "In Progress", value: 8, variant: "primary" as const },
    { icon: AlertCircle, label: "Pending", value: 5, variant: "warning" as const },
    { icon: TrendingUp, label: "This Week", value: 37, trend: "+8%", variant: "accent" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.label} {...stat} delay={index * 0.1} />
      ))}
    </div>
  );
};

export default QuickStats;
