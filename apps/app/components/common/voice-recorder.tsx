"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Loader2, Mic, MicOff, Square } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

type RecordingState = "idle" | "recording" | "processing";

export function VoiceRecorder({
  onTranscript,
  className,
  disabled = false,
  placeholder = "Click to start voice recording",
}: VoiceRecorderProps) {
  const [recordingState, setRecordingState] =
    React.useState<RecordingState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [audioLevel, setAudioLevel] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const cleanup = React.useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioLevel(0);
    setDuration(0);
  }, []);

  const processAudio = React.useCallback(
    async (audioBlob: Blob) => {
      setRecordingState("processing");

      try {
        // Check if the browser supports Speech Recognition
        const SpeechRecognition =
          (
            window as unknown as {
              SpeechRecognition?: typeof window.SpeechRecognition;
            }
          ).SpeechRecognition ||
          (
            window as unknown as {
              webkitSpeechRecognition?: typeof window.SpeechRecognition;
            }
          ).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          // Fallback: just indicate the recording was captured
          // In production, you'd send this to a transcription API
          setError(
            "Speech recognition not supported. Audio recorded but cannot transcribe.",
          );
          setRecordingState("idle");
          return;
        }

        // Create audio URL for playback (optional)
        const audioUrl = URL.createObjectURL(audioBlob);

        // For demo purposes, we'll simulate transcription
        // In production, you'd send audioBlob to a transcription API (like OpenAI Whisper)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // For now, prompt user that audio was recorded
        onTranscript(
          "[Voice note recorded - " +
            (duration > 0 ? `${duration}s` : "audio captured") +
            "]",
        );

        URL.revokeObjectURL(audioUrl);
      } catch (err) {
        console.error("Error processing audio:", err);
        setError("Failed to process recording");
      } finally {
        setRecordingState("idle");
      }
    },
    [duration, onTranscript],
  );

  const startRecording = React.useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Visualize audio level
      const updateLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        cleanup();

        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          processAudio(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState("recording");

      // Start duration timer
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Cannot access microphone. Please allow microphone access.");
      setRecordingState("idle");
    }
  }, [cleanup, processAudio]);

  const stopRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [recordingState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanup();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanup]);

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {recordingState === "recording" && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full animate-pulse">
            <div
              className="w-2 h-2 rounded-full bg-red-500"
              style={{
                transform: `scale(${1 + audioLevel * 0.5})`,
                transition: "transform 50ms ease-out",
              }}
            />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {formatDuration(duration)}
            </span>
          </div>
        )}

        {recordingState === "idle" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startRecording}
                disabled={disabled}
                className="gap-2"
              >
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Voice Note</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{placeholder}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {recordingState === "recording" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopRecording}
                className="gap-2"
              >
                <Square className="h-3 w-3 fill-current" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop recording</p>
            </TooltipContent>
          </Tooltip>
        )}

        {recordingState === "processing" && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
        )}

        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </TooltipProvider>
  );
}

// Alternative: Real-time speech-to-text component
interface LiveSpeechToTextProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  className?: string;
  disabled?: boolean;
  language?: string;
}

export function LiveSpeechToText({
  onTranscript,
  className,
  disabled = false,
  language = "en-US",
}: LiveSpeechToTextProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  const startListening = React.useCallback(() => {
    setError(null);

    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: typeof window.SpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: typeof window.SpeechRecognition;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript ?? "";
        if (event.results[i]?.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        onTranscript(final, true);
        setInterimTranscript("");
      } else if (interim) {
        onTranscript(interim, false);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, onTranscript]);

  const stopListening = React.useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {isListening && interimTranscript && (
          <div className="text-sm text-muted-foreground italic max-w-[200px] truncate">
            {interimTranscript}
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              onClick={isListening ? stopListening : startListening}
              disabled={disabled}
              className={cn(
                "gap-2 transition-all",
                isListening && "animate-pulse",
              )}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span className="hidden sm:inline">Dictate</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isListening ? "Stop dictation" : "Start voice dictation"}</p>
          </TooltipContent>
        </Tooltip>

        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </TooltipProvider>
  );
}
