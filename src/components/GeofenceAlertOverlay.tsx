import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlertSoundOption } from "@/pages/Settings";

interface GeofenceAlertOverlayProps {
  notification: {
    id: string;
    title: string;
    content: string;
  } | null;
  onDismiss: () => void;
}

const GeofenceAlertOverlay = ({ notification, onDismiss }: GeofenceAlertOverlayProps) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopSound = useCallback(() => {
    // Stop Web Audio API siren
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {
        // Already stopped
      }
      oscillatorRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    // Stop audio element
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    stopSound();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onDismiss();
  }, [stopSound, onDismiss]);

  useEffect(() => {
    if (!notification) return;

    // Reset timer
    setTimeLeft(5);

    // Get selected sound from localStorage
    const savedSound = localStorage.getItem("alertSound") as AlertSoundOption || "siren";
    setIsMuted(savedSound === "mute");

    if (savedSound === "mute") {
      // No sound, just countdown
    } else if (savedSound === "siren") {
      // Create audio context and siren sound
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      
      oscillator.start();
      
      // Siren effect - alternate between two frequencies
      let high = true;
      sirenIntervalRef.current = setInterval(() => {
        if (oscillatorRef.current) {
          oscillatorRef.current.frequency.setValueAtTime(
            high ? 800 : 600,
            ctx.currentTime
          );
          high = !high;
        }
      }, 500);
    } else {
      // Play MP3 file
      const audioPath = savedSound === "alert1" 
        ? "/sounds/alert-sound-1.mp3" 
        : "/sounds/alert-sound-2.mp3";
      
      const audio = new Audio(audioPath);
      audio.volume = 0.5;
      audio.loop = true;
      audioElementRef.current = audio;
      
      audio.play().catch((e) => {
        console.error("Failed to play alert sound:", e);
      });
    }

    // Countdown timer
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      stopSound();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [notification, handleDismiss, stopSound]);

  if (!notification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-destructive"
        >
          {/* Pulsing alert icon */}
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="p-4 bg-destructive/20 rounded-full"
            >
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </motion.div>
          </div>

          {/* Alert content */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-destructive mb-2">
              {notification.title.replace('🚨 ', '')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {notification.content}
            </p>
          </div>

          {/* Sound indicator and timer */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <motion.div
              animate={{ opacity: isMuted ? 1 : [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: isMuted ? 0 : Infinity }}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Volume2 className="w-5 h-5 text-destructive" />
              )}
            </motion.div>
            <span className="text-sm text-muted-foreground">
              Auto-dismiss in {timeLeft}s
            </span>
          </div>

          {/* Dismiss button */}
          <Button
            onClick={handleDismiss}
            variant="destructive"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Dismiss Alert
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GeofenceAlertOverlay;
