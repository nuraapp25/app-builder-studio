import { Home, ListTodo, Headset, Settings, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: ListTodo, label: "To Do List", path: "/tasks" },
];

const BottomNav = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              <motion.div
                className="flex flex-col items-center gap-1"
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-0.5 w-12 h-1 rounded-full gradient-primary"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="relative flex flex-col items-center justify-center flex-1 h-full"
        >
          <motion.div
            className="flex flex-col items-center gap-1"
            whileTap={{ scale: 0.9 }}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {isDark ? "Light" : "Dark"}
            </span>
          </motion.div>
        </button>

        {/* Contact Support */}
        <Link
          to="/support"
          className="relative flex flex-col items-center justify-center flex-1 h-full"
        >
          <motion.div
            className="flex flex-col items-center gap-1"
            whileTap={{ scale: 0.9 }}
          >
            {location.pathname === "/support" && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-0.5 w-12 h-1 rounded-full gradient-primary"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <Headset
              className={`w-5 h-5 transition-colors ${
                location.pathname === "/support" ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-xs font-medium transition-colors ${
                location.pathname === "/support" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Support
            </span>
          </motion.div>
        </Link>

        {/* Settings */}
        <Link
          to="/settings"
          className="relative flex flex-col items-center justify-center flex-1 h-full"
        >
          <motion.div
            className="flex flex-col items-center gap-1"
            whileTap={{ scale: 0.9 }}
          >
            {location.pathname === "/settings" && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-0.5 w-12 h-1 rounded-full gradient-primary"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <Settings
              className={`w-5 h-5 transition-colors ${
                location.pathname === "/settings" ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-xs font-medium transition-colors ${
                location.pathname === "/settings" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Settings
            </span>
          </motion.div>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
