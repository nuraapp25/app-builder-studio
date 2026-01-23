import { motion } from "framer-motion";
import { 
  Users, 
  ClipboardList, 
  MapPin, 
  BarChart3, 
  Calendar, 
  FileText,
  Target,
  HelpCircle,
  UserCog,
  ClipboardCheck,
  UserPlus,
  FolderOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AppItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  route: string;
  managerOnly?: boolean;
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
    id: "users",
    name: "Users",
    icon: <UserCog className="w-6 h-6" />,
    color: "text-warning",
    bgColor: "bg-warning/10",
    route: "/users",
    managerOnly: true,
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
    id: "help",
    name: "Help",
    icon: <HelpCircle className="w-6 h-6" />,
    color: "text-accent",
    bgColor: "bg-accent/10",
    route: "/updates",
  },
  {
    id: "attendance-logs",
    name: "Attendance Logs",
    icon: <ClipboardCheck className="w-6 h-6" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    route: "/attendance-logs",
  },
  {
    id: "lead-forms",
    name: "Lead Forms",
    icon: <UserPlus className="w-6 h-6" />,
    color: "text-success",
    bgColor: "bg-success/10",
    route: "/lead-forms",
  },
  {
    id: "leads-documents",
    name: "Leads Docs",
    icon: <FolderOpen className="w-6 h-6" />,
    color: "text-accent",
    bgColor: "bg-accent/10",
    route: "/leads-documents",
  },
];

export default function AppGrid() {
  const navigate = useNavigate();
  const { isManager } = useAuth();

  // Filter items based on user role
  const visibleItems = appItems.filter(item => !item.managerOnly || isManager);

  return (
    <div className="mx-4 mt-4">
      <h3 className="font-semibold text-foreground mb-3">Quick Access</h3>
      <div className="grid grid-cols-3 gap-3">
        {visibleItems.map((item, index) => (
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
