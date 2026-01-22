import { motion } from "framer-motion";
import { Megaphone, ChevronRight } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  preview: string;
  author: string;
  time: string;
  isNew: boolean;
}

const announcements: Announcement[] = [
  {
    id: "1",
    title: "Team Meeting Tomorrow",
    preview: "Don't forget the all-hands meeting at 10 AM...",
    author: "Manager",
    time: "2h ago",
    isNew: true,
  },
  {
    id: "2",
    title: "New Project Guidelines",
    preview: "Please review the updated project submission guidelines...",
    author: "HR Team",
    time: "Yesterday",
    isNew: false,
  },
];

const Announcements = () => {
  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-accent" />
          <h2 className="text-base font-semibold text-foreground">Announcements</h2>
        </div>
        <button className="text-xs font-medium text-primary">View All</button>
      </div>
      
      <div className="space-y-2">
        {announcements.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-card rounded-xl shadow-card"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                  {item.isNew && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-accent text-accent-foreground">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.preview}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">{item.author}</span>
                  <span>•</span>
                  <span>{item.time}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Announcements;
