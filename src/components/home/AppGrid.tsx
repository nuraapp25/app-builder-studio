import { motion } from "framer-motion";
import { 
  UserCog,
  ClipboardCheck,
  UserPlus,
  FolderOpen,
  MapPin
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
  allowedRoles: ("admin" | "ops_manager" | "field_recruiter")[];
}

const appItems: AppItem[] = [
  {
    id: "users",
    name: "Users",
    icon: <UserCog className="w-6 h-6" />,
    color: "text-warning",
    bgColor: "bg-warning/10",
    route: "/users",
    allowedRoles: ["admin"],
  },
  {
    id: "attendance-logs",
    name: "Attendance Logs",
    icon: <ClipboardCheck className="w-6 h-6" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    route: "/attendance-logs",
    allowedRoles: ["admin", "ops_manager"],
  },
  {
    id: "lead-forms",
    name: "Lead Forms",
    icon: <UserPlus className="w-6 h-6" />,
    color: "text-success",
    bgColor: "bg-success/10",
    route: "/lead-forms",
    allowedRoles: ["admin", "ops_manager", "field_recruiter"],
  },
  {
    id: "leads-documents",
    name: "Leads Docs",
    icon: <FolderOpen className="w-6 h-6" />,
    color: "text-accent",
    bgColor: "bg-accent/10",
    route: "/leads-documents",
    allowedRoles: ["admin", "ops_manager", "field_recruiter"],
  },
  {
    id: "map-view",
    name: "Map View",
    icon: <MapPin className="w-6 h-6" />,
    color: "text-info",
    bgColor: "bg-info/10",
    route: "/map-view",
    allowedRoles: ["admin", "ops_manager"],
  },
];

export default function AppGrid() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  const currentRole = userRole?.role || "field_recruiter";

  // Filter items based on user role
  const visibleItems = appItems.filter(item => 
    item.allowedRoles.includes(currentRole as "admin" | "ops_manager" | "field_recruiter")
  );

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
