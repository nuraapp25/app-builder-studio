import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Filter, Circle, CheckCircle2, Clock, Flag, MoreVertical } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  category: string;
}

const initialTasks: Task[] = [
  { id: "1", title: "Review Q4 Report", description: "Complete analysis of quarterly performance", assignee: "Sarah M.", dueDate: "Today", priority: "high", completed: false, category: "Reports" },
  { id: "2", title: "Update team schedules", description: "Adjust for holiday period", assignee: "John D.", dueDate: "Tomorrow", priority: "medium", completed: false, category: "Admin" },
  { id: "3", title: "Prepare client presentation", description: "For Monday's meeting", assignee: "You", dueDate: "Jan 24", priority: "high", completed: false, category: "Meetings" },
  { id: "4", title: "Submit expense reports", description: "Q4 expenses due", assignee: "You", dueDate: "Jan 25", priority: "medium", completed: false, category: "Finance" },
  { id: "5", title: "Client meeting notes", description: "Transcribe and share", assignee: "Alex K.", dueDate: "Jan 23", priority: "low", completed: true, category: "Meetings" },
  { id: "6", title: "Code review - Feature X", description: "Review PR #234", assignee: "You", dueDate: "Jan 26", priority: "low", completed: false, category: "Development" },
];

const priorityConfig = {
  high: { color: "bg-destructive", label: "High", icon: Flag },
  medium: { color: "bg-warning", label: "Medium", icon: Flag },
  low: { color: "bg-success", label: "Low", icon: Flag },
};

const filters = ["All", "My Tasks", "High Priority", "Completed"];

const Tasks = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeFilter, setActiveFilter] = useState("All");

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const filteredTasks = tasks.filter(task => {
    switch (activeFilter) {
      case "My Tasks": return task.assignee === "You";
      case "High Priority": return task.priority === "high";
      case "Completed": return task.completed;
      default: return true;
    }
  });

  return (
    <AppLayout>
      <AppHeader title="Tasks" subtitle={`${tasks.filter(t => !t.completed).length} pending`} />
      
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-2">
        <AnimatePresence>
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 bg-card rounded-xl shadow-card ${task.completed ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <button 
                  onClick={() => toggleTask(task.id)}
                  className="flex-shrink-0 mt-0.5"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`text-sm font-medium text-foreground ${task.completed ? "line-through" : ""}`}>
                        {task.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    </div>
                    <button className="p-1 rounded-full hover:bg-secondary">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-muted-foreground">{task.assignee}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {task.dueDate}
                    </div>
                    <span className={`w-2 h-2 rounded-full ${priorityConfig[task.priority].color}`} />
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-secondary-foreground">
                      {task.category}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </AppLayout>
  );
};

export default Tasks;
