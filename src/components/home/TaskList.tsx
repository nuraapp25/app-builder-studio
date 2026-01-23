import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
}

const priorityConfig = {
  high: { color: "text-destructive", bg: "bg-destructive/10", label: "High" },
  medium: { color: "text-warning", bg: "bg-warning/10", label: "Medium" },
  low: { color: "text-success", bg: "bg-success/10", label: "Low" },
};

const statusIcons = {
  pending: <Circle className="w-5 h-5 text-muted-foreground" />,
  in_progress: <Clock className="w-5 h-5 text-warning" />,
  completed: <CheckCircle2 className="w-5 h-5 text-success" />,
};

export default function TaskList({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [userId]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", userId)
      .neq("status", "completed")
      .order("due_date", { ascending: true })
      .limit(5);
    
    if (data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "pending" ? "in_progress" : 
                      task.status === "in_progress" ? "completed" : "pending";
    
    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);
    
    fetchTasks();
  };

  if (loading) {
    return (
      <Card className="mx-4 mt-4">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-12 bg-muted rounded w-full"></div>
            <div className="h-12 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 mt-4 mb-6 shadow-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Assigned Tasks</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {tasks.length} pending
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
            <p className="text-muted-foreground">All caught up! No pending tasks.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task, index) => {
              const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
              const statusIcon = statusIcons[task.status as keyof typeof statusIcons] || statusIcons.pending;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {statusIcon}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {task.title}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {task.description}
                        </p>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
