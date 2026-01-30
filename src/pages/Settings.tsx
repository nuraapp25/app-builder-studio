import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Play } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type AlertSoundOption = "siren" | "alert1" | "alert2" | "mute";

const soundOptions: { value: AlertSoundOption; label: string; description: string }[] = [
  { value: "siren", label: "Siren", description: "Default emergency siren sound" },
  { value: "alert1", label: "Alert Sound 1", description: "Custom alert tone 1" },
  { value: "alert2", label: "Alert Sound 2", description: "Custom alert tone 2" },
  { value: "mute", label: "Mute", description: "No sound for alerts" },
];

const Settings = () => {
  const [selectedSound, setSelectedSound] = useState<AlertSoundOption>(() => {
    const saved = localStorage.getItem("alertSound");
    return (saved as AlertSoundOption) || "siren";
  });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    localStorage.setItem("alertSound", selectedSound);
  }, [selectedSound]);

  const playPreview = (sound: AlertSoundOption) => {
    if (sound === "mute" || isPlaying) return;

    setIsPlaying(true);

    if (sound === "siren") {
      // Play generated siren using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      let freq = 440;
      const interval = setInterval(() => {
        freq = freq === 440 ? 880 : 440;
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      }, 200);
      
      setTimeout(() => {
        clearInterval(interval);
        oscillator.stop();
        audioContext.close();
        setIsPlaying(false);
      }, 2000);
    } else {
      // Play MP3 file
      const audioPath = sound === "alert1" ? "/sounds/alert-sound-1.mp3" : "/sounds/alert-sound-2.mp3";
      const audio = new Audio(audioPath);
      audio.volume = 0.5;
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        toast.error("Failed to play sound");
        setIsPlaying(false);
      };
      
      // Stop after 2 seconds
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }, 2000);
      
      audio.play().catch(() => {
        toast.error("Failed to play sound");
        setIsPlaying(false);
      });
    }
  };

  return (
    <AppLayout>
      <AppHeader title="Settings" subtitle="Customize your preferences" />
      
      <div className="px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-card rounded-xl shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Alert Sound</h2>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            Choose the sound for geofence breach alerts
          </p>

          <RadioGroup
            value={selectedSound}
            onValueChange={(value) => setSelectedSound(value as AlertSoundOption)}
            className="space-y-3"
          >
            {soundOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div>
                    <Label
                      htmlFor={option.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                
                {option.value !== "mute" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playPreview(option.value)}
                    disabled={isPlaying}
                    className="h-8 w-8 p-0"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                
                {option.value === "mute" && (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </RadioGroup>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-muted/50 rounded-xl"
        >
          <p className="text-xs text-muted-foreground text-center">
            Sound preview plays for 2 seconds. Full alert sound plays for 5 seconds.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Settings;
