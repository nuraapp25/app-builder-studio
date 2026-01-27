import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only set up listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleBackButton = App.addListener("backButton", ({ canGoBack }) => {
      // If on home page or auth page, minimize the app instead of closing
      if (location.pathname === "/" || location.pathname === "/auth") {
        App.minimizeApp();
      } else if (canGoBack) {
        // Navigate back in the router history
        navigate(-1);
      } else {
        // Fallback: go to home
        navigate("/");
      }
    });

    return () => {
      handleBackButton.then((listener) => listener.remove());
    };
  }, [navigate, location.pathname]);
};
