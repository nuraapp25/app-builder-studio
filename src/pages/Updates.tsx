import { motion } from "framer-motion";
import { Megaphone, Calendar, Users, FileText, ChevronRight, Pin } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";

interface Update {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  time: string;
  type: "announcement" | "event" | "document" | "team";
  pinned: boolean;
}

const updates: Update[] = [
  {
    id: "1",
    title: "All-Hands Meeting Tomorrow",
    content: "Please join us for the monthly all-hands meeting at 10 AM. We'll be discussing Q1 goals and celebrating team achievements.",
    author: "Sarah Mitchell",
    authorRole: "Project Manager",
    time: "2 hours ago",
    type: "event",
    pinned: true,
  },
  {
    id: "2",
    title: "New Project Guidelines Released",
    content: "We've updated our project submission guidelines. Please review the changes before your next submission.",
    author: "HR Team",
    authorRole: "Human Resources",
    time: "Yesterday",
    type: "document",
    pinned: false,
  },
  {
    id: "3",
    title: "Welcome New Team Members",
    content: "Please welcome Alex Kim and Emily Chen to our team! They'll be joining the Design and Marketing departments respectively.",
    author: "Lisa Wang",
    authorRole: "HR Manager",
    time: "2 days ago",
    type: "team",
    pinned: false,
  },
  {
    id: "4",
    title: "Office Closure Notice",
    content: "The office will be closed on January 26th for maintenance. Remote work is encouraged.",
    author: "Operations",
    authorRole: "Facilities",
    time: "3 days ago",
    type: "announcement",
    pinned: false,
  },
];

const typeConfig = {
  announcement: { icon: Megaphone, color: "bg-accent" },
  event: { icon: Calendar, color: "gradient-primary" },
  document: { icon: FileText, color: "bg-success" },
  team: { icon: Users, color: "bg-purple-500" },
};

const Updates = () => {
  return (
    <AppLayout>
      <AppHeader title="Updates" subtitle="Stay informed" />
      
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {(["All", "Announcements", "Events", "Documents"] as const).map((filter, index) => (
            <button
              key={filter}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {updates.map((update, index) => {
          const TypeIcon = typeConfig[update.type].icon;
          
          return (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 bg-card rounded-xl shadow-card ${update.pinned ? "border-l-4 border-accent" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${typeConfig[update.type].color}`}>
                  <TypeIcon className="w-4 h-4 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{update.title}</h3>
                    {update.pinned && <Pin className="w-3 h-3 text-accent" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{update.content}</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-[10px] font-medium">
                        {update.author.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{update.author}</p>
                        <p className="text-[10px] text-muted-foreground">{update.authorRole}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{update.time}</span>
                  </div>
                </div>
                
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default Updates;
