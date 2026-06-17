"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  Pause,
  Play,
  SkipForward,
  FileText,
  Bookmark,
  XCircle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { formatTimer } from "@/lib/algorithm";
import SubjectIcon from "@/components/SubjectIcon";
import { toast } from "sonner";

export default function StudySessionScreen() {
  const { state, dispatch } = useStore();
  const { activeSession, subjects } = state;

  const [elapsed, setElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [autoPausedNotice, setAutoPausedNotice] = useState(false);
  const lastHiddenAtRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const subject = subjects.find((s) => s.id === activeSession?.subjectId);
  const lecture = subject?.lectures.find((l) => l.id === activeSession?.lectureId);

  const isPaused = !!activeSession?.pausedAt;

  // Calculate live elapsed time
  useEffect(() => {
    if (!activeSession) return;

    const tick = () => {
      if (activeSession.pausedAt) {
        const pausedElapsed = Math.floor(
          (activeSession.pausedAt - activeSession.startTime - activeSession.totalPausedMs) / 1000,
        );
        setElapsed(Math.max(0, pausedElapsed));
        return;
      }
      const now = Date.now();
      const activeElapsed = Math.floor(
        (now - activeSession.startTime - activeSession.totalPausedMs) / 1000,
      );
      setElapsed(Math.max(0, activeElapsed));
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession]);

  // ─── Soft inactivity guard ───────────────────────────────────────────
  // Short background periods (phone auto-lock, glancing at a notification,
  // switching to lecture video on another device) keep the session running.
  // Only pause if the app has been inactive for more than 30 minutes, so
  // unattended time can't silently accumulate into fake progress.
  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
  useEffect(() => {
    if (!activeSession) return;

    const onHidden = () => {
      if (!state.activeSession || state.activeSession.pausedAt !== null) return;
      lastHiddenAtRef.current = Date.now();
    };
    const onVisible = () => {
      const hiddenAt = lastHiddenAtRef.current;
      lastHiddenAtRef.current = null;
      if (!hiddenAt) return;
      if (!state.activeSession || state.activeSession.pausedAt !== null) return;
      if (Date.now() - hiddenAt > INACTIVITY_LIMIT_MS) {
        dispatch({ type: "PAUSE_SESSION" });
        setAutoPausedNotice(true);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") onHidden();
      else onVisible();
    };
    window.addEventListener("blur", onHidden);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pagehide", onHidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", onHidden);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pagehide", onHidden);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeSession, state.activeSession, dispatch]);

  if (!activeSession || !subject || !lecture) {
    return <IdleSessionView />;
  }

  const targetSeconds = activeSession.targetMinutes * 60;
  const remainingSeconds = Math.max(0, targetSeconds - elapsed);
  const progressPct = Math.min(elapsed / targetSeconds, 1);
  const isComplete = elapsed >= targetSeconds;

  const handleEnd = (completed: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    dispatch({ type: "END_SESSION", actualSeconds: elapsed, completed });
    setShowEndConfirm(false);
    toast.success(completed ? "Session complete! Great job." : "Progress saved. Take a break.");
  };

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    dispatch({ type: "SKIP_SESSION" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={() => setShowEndConfirm(true)}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>
        <h1 className="font-heading font-semibold text-lg text-foreground">Study Session</h1>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-semibold text-sm">
            {state.user?.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 flex flex-col gap-4">
        {autoPausedNotice && isPaused && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-foreground">Session paused due to extended inactivity.</p>
            <button
              onClick={() => {
                dispatch({ type: "RESUME_SESSION" });
                setAutoPausedNotice(false);
              }}
              className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shrink-0"
            >
              Resume
            </button>
          </div>
        )}
        {/* Main timer card — dark green */}
        <div className="bg-primary rounded-3xl p-6 flex flex-col gap-4">
          {/* Subject header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-heading font-bold text-2xl text-primary-foreground leading-tight">
                {subject.name}
              </p>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{lecture.name}</p>
            </div>
            <span
              className={cn(
                "text-[11px] font-semibold px-3 py-1 rounded-full",
                isComplete
                  ? "bg-[#22C55E]/20 text-[#86efac]"
                  : "bg-white/15 text-primary-foreground",
              )}
            >
              {isComplete ? "Complete!" : "In Progress"}
            </span>
          </div>

          {/* Timer display */}
          <div className="flex items-center justify-between">
            <span className="font-heading font-bold text-7xl text-primary-foreground tracking-tight tabular-nums">
              {formatTimer(elapsed)}
            </span>
            <button
              onClick={() => {
                if (isPaused) dispatch({ type: "RESUME_SESSION" });
                else dispatch({ type: "PAUSE_SESSION" });
              }}
              className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center active:scale-95 transition-transform"
              aria-label={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Play size={22} className="text-primary-foreground ml-0.5" fill="currentColor" />
              ) : (
                <Pause size={22} className="text-primary-foreground" fill="currentColor" />
              )}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex justify-between">
            <div>
              <p className="text-primary-foreground/60 text-xs">Today&apos;s Target</p>
              <p className="font-heading font-bold text-lg text-primary-foreground">
                {activeSession.targetMinutes} min
              </p>
            </div>
            <div className="text-right">
              <p className="text-primary-foreground/60 text-xs">Remaining</p>
              <p className="font-heading font-bold text-lg text-primary-foreground">
                {Math.ceil(remainingSeconds / 60)} min
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-1000"
              style={{ width: `${progressPct * 100}%` }}
            />
          </div>
        </div>

        {/* Lecture Progress card */}
        <div className="bg-card rounded-3xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Lecture Progress</span>
            <span className="text-sm font-semibold text-muted-foreground">
              {lecture.watchedMinutes + Math.round(elapsed / 60)} / {lecture.durationMinutes} min
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-success rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(
                  ((lecture.watchedMinutes + elapsed / 60) / lecture.durationMinutes) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round(((lecture.watchedMinutes + elapsed / 60) / lecture.durationMinutes) * 100)}%
            of lecture
          </p>
        </div>

        {/* Circular progress indicator */}
        <div className="flex items-center justify-center">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#E8E4DC" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="#2B4A3A"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="201.1"
                strokeDashoffset={201.1 * (1 - progressPct)}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-foreground">
                {Math.round(progressPct * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-3xl border border-border p-4">
          <p className="text-sm font-semibold text-foreground mb-4">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleSkip}
              className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <SkipForward size={18} className="text-foreground" />
              </div>
              <span className="text-[11px] font-medium text-foreground">Skip</span>
            </button>

            <button
              onClick={() => toast.success("Notes saved for this lecture.")}
              className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <FileText size={18} className="text-foreground" />
              </div>
              <span className="text-[11px] font-medium text-foreground">Notes</span>
            </button>

            <button
              onClick={() => toast.success("Lecture bookmarked.")}
              className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Bookmark size={18} className="text-foreground" />
              </div>
              <span className="text-[11px] font-medium text-foreground">Bookmark</span>
            </button>

            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FFE8EC] flex items-center justify-center">
                <XCircle size={18} className="text-[#C43650]" />
              </div>
              <span className="text-[11px] font-medium text-[#C43650]">End</span>
            </button>
          </div>
        </div>

        {/* Complete early button */}
        {isComplete && (
          <button
            onClick={() => handleEnd(true)}
            className="w-full h-14 bg-success text-success-foreground rounded-2xl font-heading font-semibold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
          >
            <Check size={20} />
            Session Complete!
          </button>
        )}
      </div>

      {/* End session confirm overlay */}
      {showEndConfirm && (
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            className="w-full max-w-[430px] mx-auto bg-card rounded-t-3xl p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h3 className="font-heading font-bold text-xl text-foreground mb-2 text-balance">
              End session?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              You&apos;ve studied for {formatTimer(elapsed)}. Your progress will be saved.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleEnd(true)}
                className="w-full h-13 bg-primary text-primary-foreground rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Mark Complete & End
              </button>
              <button
                onClick={() => handleEnd(false)}
                className="w-full h-13 bg-muted text-foreground rounded-2xl font-semibold"
              >
                Save Progress & End
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="w-full h-13 text-muted-foreground font-medium"
              >
                Continue Studying
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IdleSessionView() {
  const { state, dispatch } = useStore();
  const nextItem = state.todaySchedule.find(
    (i) => i.status === "in-progress" || i.status === "upcoming",
  );
  const subject = nextItem ? state.subjects.find((s) => s.id === nextItem.subjectId) : undefined;
  const lecture = subject?.lectures.find((l) => l.id === nextItem?.lectureId);

  const handleStart = () => {
    if (!nextItem) return;
    dispatch({
      type: "START_SESSION",
      subjectId: nextItem.subjectId,
      lectureId: nextItem.lectureId,
      targetMinutes: nextItem.targetMinutes,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={() => dispatch({ type: "NAVIGATE", screen: "home" })}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>
        <h1 className="font-heading font-semibold text-lg text-foreground">Focus Session</h1>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 px-5 flex flex-col gap-4">
        <div className="bg-primary rounded-3xl p-6 flex flex-col gap-4">
          <div>
            <p className="font-heading font-bold text-2xl text-primary-foreground leading-tight">
              {subject?.name ?? "Ready when you are"}
            </p>
            <p className="text-primary-foreground/70 text-sm mt-0.5">
              {lecture?.name ?? "No session active"}
            </p>
          </div>
          <div className="font-heading font-bold text-7xl text-primary-foreground tracking-tight tabular-nums">
            00:00
          </div>
          {nextItem && (
            <div className="flex justify-between text-primary-foreground/80 text-sm">
              <span>Today&apos;s Target</span>
              <span className="font-semibold">{nextItem.targetMinutes} min</span>
            </div>
          )}
        </div>

        {nextItem ? (
          <button
            onClick={handleStart}
            className="w-full h-14 bg-success text-success-foreground rounded-2xl font-heading font-semibold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
          >
            <Play size={20} fill="currentColor" />
            Start Session
          </button>
        ) : (
          <div className="bg-card rounded-3xl border border-border p-6 text-center">
            <p className="font-heading font-semibold text-foreground mb-2">
              Nothing scheduled right now
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Open Blueprint to plan today&apos;s study, or rest — recovery counts too.
            </p>
            <button
              onClick={() => dispatch({ type: "NAVIGATE", screen: "plan" })}
              className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold"
            >
              Open Blueprint
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
