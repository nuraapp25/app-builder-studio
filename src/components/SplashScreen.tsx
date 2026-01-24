import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // If autoplay fails, skip splash after 2 seconds
        setTimeout(() => {
          setIsVisible(false);
          onComplete();
        }, 2000);
      });
    }
  }, [onComplete]);

  const handleVideoEnd = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleVideoReady = () => {
    setIsVideoReady(true);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <video
            ref={videoRef}
            src="/splash-video.mp4"
            className={`w-full h-full object-cover transition-opacity duration-100 ${
              isVideoReady ? "opacity-100" : "opacity-0"
            }`}
            muted
            playsInline
            preload="auto"
            onCanPlay={handleVideoReady}
            onEnded={handleVideoEnd}
          />
          <button
            onClick={handleSkip}
            className="absolute bottom-8 right-6 px-4 py-2 bg-card/80 backdrop-blur-sm text-foreground text-sm font-medium rounded-full border border-border hover:bg-card transition-colors"
          >
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
