"use client";

import React, { useState, useRef } from "react";
import { Mic, Square, Loader2, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
    onAudioRecorded: (base64Audio: string) => void;
    isProcessing?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
    onAudioRecorded,
    isProcessing = false
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);

                // Convert to base64 for the API
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    // remove the data URL prefix e.g., "data:audio/webm;base64,"
                    const base64String = base64data.split(',')[1];
                    onAudioRecorded(base64String);
                };
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            setAudioUrl(null);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access the microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-sm w-full max-w-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isRecording ? "bg-action-red animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {isRecording ? "Recording..." : "Voice Dictation"}
                    </span>
                </div>
                {isRecording && (
                    <span className="text-sm font-mono text-action-red font-bold">
                        {formatTime(recordingTime)}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {!isRecording ? (
                    <button
                        type="button"
                        onClick={startRecording}
                        disabled={isProcessing}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-white font-bold text-sm transition-all",
                            isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-cobalt-blue hover:bg-navy-blue shadow-sm"
                        )}
                    >
                        {isProcessing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                        ) : (
                            <><Mic className="w-4 h-4" /> Start Recording</>
                        )}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={stopRecording}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-action-red hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-colors"
                    >
                        <Square className="w-4 h-4" fill="currentColor" /> Stop
                    </button>
                )}

                {audioUrl && !isRecording && !isProcessing && (
                    <button
                        type="button"
                        onClick={togglePlayback}
                        className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors shrink-0"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                />
            )}
            
            <p className="text-[10px] text-slate-400 text-center">
                Speak naturally. Describe the role, skills required, education, and responsibilities.
            </p>
        </div>
    );
};
