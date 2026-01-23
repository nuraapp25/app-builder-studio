import { motion } from "framer-motion";
import { 
  Users, 
  ClipboardList, 
  MapPin, 
  BarChart3, 
  Calendar, 
  Settings,
  FileText,
  Target,
  HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  route: string;
}

const appItems: AppItem[] = [
  {
    id: "drivers",
    name: "Drivers",
    icon: <Users className="w-6 h-6" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    route: "/team",
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: <ClipboardList className="w-6 h-6" />,
    color: "text-accent",
    bgColor: "bg-accent/10",
    route: "/tasks",
  },
  {
    id: "locations",
    name: "Locations",
    icon: <MapPin className="w-6 h-6" />,
    color: "text-success",
    bgColor: "bg-success/10",
    route: "/updates",
  },
  {
    id: "reports",
    name: "Reports",
    icon: <BarChart3 className="w-6 h-6" />,
    color: "text-warning",
    bgColor: "bg-warning/10",
    route: "/updates",
  },
  {
    id: "schedule",
    name: "Schedule",
    icon: <Calendar className="w-6 h-6" />,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    route: "/updates",
  },
  {
    id: "documents",
    name: "Documents",
    icon: <FileText className="w-6 h-6" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    route: "/updates",
  },
  {
    id: "targets",
    name: "Targets",
    icon: <Target className="w-6 h-6" />,
    color: "text-success",
    bgColor: "bg-success/10",
    route: "/updates",
  },
  {
    id: "settings",
    name: "Settings",
    icon: <Settings className="w-6 h-6" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    route: "/updates",
  },
  {
    id: "help",
    name: "Help",
    icon: <HelpCircle className="w-6 h-6" />,
    color: "text-accent",
    bgColor: "bg-accent/10",
    route: "/updates",
  },
];

export default function AppGrid() {
  const navigate = useNavigate();

  return (
    <div className="mx-4 mt-4">
      <h3 className="font-semibold text-foreground mb-3">Quick Access</h3>
      <div className="grid grid-cols-3 gap-3">
        {appItems.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(item.route)}
            className="flex flex-col items-center p-4 bg-card rounded-xl shadow-card hover:shadow-md transition-shadow"
          >
            <div className={`p-3 ${item.bgColor} rounded-xl mb-2`}>
              <span className={item.color}>{item.icon}</span>
            </div>
            <span className="text-xs font-medium text-foreground text-center">
              {item.name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
