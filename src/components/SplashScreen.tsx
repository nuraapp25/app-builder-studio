import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const preload = preloadRef.current;
    if (preload) {
      preload.load();
    }
  }, []);

  useEffect(() => {
    if (isVideoReady && videoRef.current) {
      const video = videoRef.current;
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {
          setTimeout(() => {
            setIsVisible(false);
            onComplete();
          }, 2000);
        });
      });
    }
  }, [isVideoReady, onComplete]);

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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
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
          {/* Hidden preloader video */}
          <video
            ref={preloadRef}
            src="/splash-video.mp4"
            className="hidden"
            preload="auto"
            muted
            playsInline
            onCanPlayThrough={handleVideoReady}
          />
          
          {/* Visible video - only rendered when ready */}
          {isVideoReady && (
            <video
              ref={videoRef}
              src="/splash-video.mp4"
              className="w-full h-full object-cover"
              playsInline
              onEnded={handleVideoEnd}
            />
          )}
          <div className="absolute bottom-8 right-6 flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="p-2 bg-card/80 backdrop-blur-sm text-foreground rounded-full border border-border hover:bg-card transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-card/80 backdrop-blur-sm text-foreground text-sm font-medium rounded-full border border-border hover:bg-card transition-colors"
            >
              Skip
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
