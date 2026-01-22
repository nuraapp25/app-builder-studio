import { motion } from "framer-motion";
import { Circle, CheckCircle2, ChevronRight, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

const priorityColors = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

const tasks: Task[] = [
  { id: "1", title: "Review Q4 Report", assignee: "Sarah M.", dueDate: "Today", priority: "high", completed: false },
  { id: "2", title: "Update team schedules", assignee: "John D.", dueDate: "Tomorrow", priority: "medium", completed: false },
  { id: "3", title: "Prepare presentation", assignee: "You", dueDate: "Jan 24", priority: "high", completed: false },
  { id: "4", title: "Client meeting notes", assignee: "Alex K.", dueDate: "Jan 25", priority: "low", completed: true },
];

const TaskItem = ({ task, index }: { task: Task; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className={`flex items-center gap-3 p-3 rounded-xl bg-card shadow-card ${
      task.completed ? "opacity-60" : ""
    }`}
  >
    <button className="flex-shrink-0">
      {task.completed ? (
        <CheckCircle2 className="w-5 h-5 text-success" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
    
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium text-foreground truncate ${task.completed ? "line-through" : ""}`}>
        {task.title}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-muted-foreground">{task.assignee}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority]}`} />
      </div>
    </div>
    
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        {task.dueDate}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </motion.div>
);

const RecentTasks = () => {
  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Recent Tasks</h2>
        <button className="text-xs font-medium text-primary">View All</button>
      </div>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskItem key={task.id} task={task} index={index} />
        ))}
      </div>
    </section>
  );
};

export default RecentTasks;
