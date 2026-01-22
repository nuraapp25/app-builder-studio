import { motion } from "framer-motion";
import { Search, Mail, Phone, MoreVertical } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  status: "online" | "busy" | "offline";
  email: string;
}

const teamMembers: TeamMember[] = [
  { id: "1", name: "Sarah Mitchell", role: "Project Manager", department: "Operations", avatar: "SM", status: "online", email: "sarah@company.com" },
  { id: "2", name: "John Davis", role: "Senior Developer", department: "Engineering", avatar: "JD", status: "online", email: "john@company.com" },
  { id: "3", name: "Alex Kim", role: "Designer", department: "Design", avatar: "AK", status: "busy", email: "alex@company.com" },
  { id: "4", name: "Emily Chen", role: "Marketing Lead", department: "Marketing", avatar: "EC", status: "offline", email: "emily@company.com" },
  { id: "5", name: "Michael Brown", role: "Data Analyst", department: "Analytics", avatar: "MB", status: "online", email: "michael@company.com" },
  { id: "6", name: "Lisa Wang", role: "HR Manager", department: "Human Resources", avatar: "LW", status: "busy", email: "lisa@company.com" },
];

const statusColors = {
  online: "bg-success",
  busy: "bg-warning",
  offline: "bg-muted-foreground",
};

const avatarColors = [
  "from-primary to-blue-400",
  "from-accent to-orange-400",
  "from-success to-emerald-400",
  "from-purple-500 to-pink-400",
];

const Team = () => {
  return (
    <AppLayout>
      <AppHeader title="Team" subtitle={`${teamMembers.length} members`} />
      
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search team members..."
            className="w-full pl-10 pr-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="px-4 space-y-2">
        {teamMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 bg-card rounded-xl shadow-card"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-semibold text-sm`}>
                  {member.avatar}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${statusColors[member.status]}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground">{member.name}</h3>
                <p className="text-xs text-muted-foreground">{member.role}</p>
                <span className="text-xs text-primary">{member.department}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Team;
