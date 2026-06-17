"use client";

import { useEffect, useRef, useState } from "react";
import {
  User,
  BookOpen,
  Bell,
  Trash2,
  ChevronRight,
  Plus,
  X,
  Check,
  AlertTriangle,
  Camera,
  Sun,
  Moon,
  Monitor,
  Archive,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useStore, exportBackup, importBackup } from "@/lib/store";
import { getAutoBackups, AutoBackup } from "@/lib/backup";
import {
  getReminderSettings,
  setReminderSettings,
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/reminders";

import { formatMinutes } from "@/lib/algorithm";
import { SUBJECT_COLORS, SUBJECT_ICONS } from "@/lib/algorithm";
import SubjectIcon from "@/components/SubjectIcon";
import type { SubjectColor, LectureDifficulty } from "@/lib/types";

function makeId() {
  return Math.random().toString(36).slice(2);
}

// ─── Avatar section ─────────────────────────────────────────────────────────

function AvatarSection() {
  const { state, dispatch } = useStore();
  const { user } = state;
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        dispatch({ type: "UPDATE_AVATAR", avatarUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => fileRef.current?.click()}
        className="relative shrink-0"
        aria-label="Change avatar"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-16 h-16 rounded-2xl object-cover border border-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-sm">
          <Camera size={11} className="text-foreground" />
        </div>
      </button>
      <div>
        <p className="font-semibold text-foreground">{user.name}</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs text-primary font-medium mt-0.5"
        >
          {user.avatarUrl ? "Change photo" : "Upload photo"}
        </button>
        {user.avatarUrl && (
          <button
            onClick={() => dispatch({ type: "UPDATE_AVATAR", avatarUrl: null })}
            className="text-xs text-muted-foreground font-medium mt-0.5 ml-3"
          >
            Remove
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Profile editor ────────────────────────────────────────────────────────

function ProfileSection() {
  const { state, dispatch } = useStore();
  const { user } = state;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [examName, setExamName] = useState(user?.examName ?? "");
  const [examDate, setExamDate] = useState(user?.examDate ?? "");

  if (!user) return null;

  const save = () => {
    dispatch({ type: "UPDATE_USER", updates: { name, examName, examDate } });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-card rounded-3xl border border-border p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-foreground">Edit Profile</h3>
          <button onClick={() => setEditing(false)} className="text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Exam / Goal
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. NEET 2025"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Exam Date
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <button
          onClick={save}
          className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Check size={16} />
          Save Changes
        </button>
      </div>
    );
  }

  const daysUntil = user.examDate
    ? Math.max(0, Math.ceil((new Date(user.examDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="bg-card rounded-3xl border border-border p-4 flex flex-col gap-4">
      <AvatarSection />
      <div className="border-t border-border/60 pt-3 flex items-center justify-between">
        <div>
          {user.examName ? (
            <>
              <p className="text-sm font-medium text-foreground">{user.examName}</p>
              {daysUntil !== null && (
                <p className="text-xs text-muted-foreground mt-0.5">{daysUntil} days left</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No exam set</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-xs text-primary font-medium"
        >
          Edit <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Study capacity card ────────────────────────────────────────────────────

function CapacityCard() {
  const { state } = useStore();
  const { user } = state;
  if (!user) return null;

  return (
    <div className="bg-card rounded-3xl border border-border px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">Today&apos;s Rhythm</p>
        <span className="text-sm font-bold text-primary">
          {formatMinutes(user.currentCapacity)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Your rhythm adjusts automatically based on how your completed study sessions feel. Rate each
        session honestly so Brick can find your pace.
      </p>
    </div>
  );
}

// ─── Subject manager ───────────────────────────────────────────────────────

function SubjectManager() {
  const { state, dispatch } = useStore();
  const { subjects: allSubjects } = state;
  const subjects = allSubjects.filter((s) => !s.archived);
  const archivedSubjects = allSubjects.filter((s) => s.archived);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const addSubject = () => {
    const idx = subjects.length % SUBJECT_COLORS.length;
    const newSubject = {
      id: makeId(),
      name: "New Subject",
      color: SUBJECT_COLORS[idx],
      icon: SUBJECT_ICONS[idx % SUBJECT_ICONS.length],
      lectures: [],
    };
    dispatch({ type: "ADD_SUBJECTS", subjects: [newSubject] });
    setExpandedId(newSubject.id);
  };

  const updateSubjectName = (id: string, name: string) => {
    const sub = subjects.find((s) => s.id === id);
    if (!sub) return;
    dispatch({ type: "UPDATE_SUBJECT", subject: { ...sub, name } });
  };

  const updateSubjectColor = (id: string, color: SubjectColor) => {
    const sub = subjects.find((s) => s.id === id);
    if (!sub) return;
    dispatch({ type: "UPDATE_SUBJECT", subject: { ...sub, color } });
  };

  const addLecture = (subjectId: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;
    const updated = {
      ...sub,
      lectures: [
        ...sub.lectures,
        {
          id: makeId(),
          name: `Lecture ${sub.lectures.length + 1}`,
          durationMinutes: 45,
          status: "pending" as const,
          watchedMinutes: 0,
        },
      ],
    };
    dispatch({ type: "UPDATE_SUBJECT", subject: updated });
  };

  const removeLecture = (subjectId: string, lectureId: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;
    dispatch({
      type: "UPDATE_SUBJECT",
      subject: { ...sub, lectures: sub.lectures.filter((l) => l.id !== lectureId) },
    });
  };

  const cycleDifficulty = (subjectId: string, lectureId: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;
    const cycle: (LectureDifficulty | undefined)[] = [undefined, "easy", "moderate", "heavy"];
    dispatch({
      type: "UPDATE_SUBJECT",
      subject: {
        ...sub,
        lectures: sub.lectures.map((l) => {
          if (l.id !== lectureId) return l;
          const i = cycle.indexOf(l.difficulty);
          return { ...l, difficulty: cycle[(i + 1) % cycle.length] };
        }),
      },
    });
  };

  const deleteSubject = (id: string) => {
    dispatch({ type: "DELETE_SUBJECT", subjectId: id });
    setShowDeleteConfirm(null);
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {subjects.map((subject) => {
        const isExpanded = expandedId === subject.id;
        const pendingCount = subject.lectures.filter((l) => l.status === "pending").length;
        const doneCount = subject.lectures.filter((l) => l.status === "completed").length;

        return (
          <div
            key={subject.id}
            className="bg-card rounded-3xl border border-border overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : subject.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{subject.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doneCount}/{subject.lectures.length} lectures · {pendingCount} pending
                </p>
              </div>
              <ChevronRight
                size={16}
                className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90",
                )}
              />
            </button>

            {isExpanded && (
              <div className="border-t border-border/60 px-4 py-3 space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    defaultValue={subject.name}
                    onBlur={(e) => updateSubjectName(subject.id, e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {SUBJECT_COLORS.map((c) => {
                      const colorMap: Record<SubjectColor, string> = {
                        lavender: "bg-[#7C5CC4]",
                        sage: "bg-[#2B7A52]",
                        amber: "bg-[#C47A1A]",
                        sky: "bg-[#1A72C4]",
                        rose: "bg-[#C43650]",
                        emerald: "bg-[#1A8A60]",
                      };
                      return (
                        <button
                          key={c}
                          onClick={() => updateSubjectColor(subject.id, c)}
                          className={cn(
                            "w-7 h-7 rounded-full transition-all",
                            colorMap[c],
                            subject.color === c
                              ? "ring-2 ring-offset-2 ring-foreground/30 scale-110"
                              : "opacity-60",
                          )}
                          aria-label={c}
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Lectures ({subject.lectures.length})
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {subject.lectures.map((lec, i) => {
                      const diffLabel: Record<LectureDifficulty, string> = {
                        easy: "Easy",
                        moderate: "Med",
                        heavy: "Heavy",
                      };
                      const diffStyle: Record<LectureDifficulty, string> = {
                        easy: "bg-success/15 text-success",
                        moderate: "bg-muted text-foreground",
                        heavy: "bg-warning/20 text-warning-foreground",
                      };
                      return (
                        <div
                          key={lec.id}
                          className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2"
                        >
                          <span className="text-xs text-muted-foreground w-4 text-right shrink-0">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-foreground truncate">
                            {lec.name}
                          </span>
                          <button
                            onClick={() => cycleDifficulty(subject.id, lec.id)}
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 transition-colors",
                              lec.difficulty
                                ? diffStyle[lec.difficulty]
                                : "bg-transparent text-muted-foreground/60 border border-dashed border-border",
                            )}
                            aria-label="Toggle lecture difficulty"
                          >
                            {lec.difficulty ? diffLabel[lec.difficulty] : "—"}
                          </button>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {lec.durationMinutes}m
                          </span>
                          {lec.status === "completed" && (
                            <Check size={12} className="text-success shrink-0" />
                          )}
                          {lec.status === "pending" && (
                            <button
                              onClick={() => removeLecture(subject.id, lec.id)}
                              className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                              aria-label="Remove lecture"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => addLecture(subject.id)}
                    className="flex items-center gap-1.5 text-xs text-primary font-medium py-2 mt-1"
                  >
                    <Plus size={13} />
                    Add Lecture
                  </button>
                </div>

                {(() => {
                  const hasProgress = subject.lectures.some(
                    (l) => l.status === "completed" || l.watchedMinutes > 0,
                  );
                  if (showDeleteConfirm === subject.id) {
                    return (
                      <div className="bg-muted rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-muted-foreground shrink-0" />
                          <p className="text-xs text-foreground font-medium">
                            {hasProgress
                              ? `Archive ${subject.name}? It will leave today's rotation but all progress and history are preserved.`
                              : `Delete ${subject.name}? It has no progress yet.`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (hasProgress) {
                                dispatch({ type: "ARCHIVE_SUBJECT", subjectId: subject.id });
                              } else {
                                deleteSubject(subject.id);
                              }
                              setShowDeleteConfirm(null);
                              if (expandedId === subject.id) setExpandedId(null);
                            }}
                            className={cn(
                              "flex-1 h-9 rounded-lg text-sm font-semibold",
                              hasProgress
                                ? "bg-foreground text-background"
                                : "bg-destructive text-white",
                            )}
                          >
                            {hasProgress ? "Archive" : "Delete"}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 h-9 bg-card border border-border text-foreground rounded-lg text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button
                      onClick={() => setShowDeleteConfirm(subject.id)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium py-1",
                        hasProgress ? "text-muted-foreground" : "text-destructive",
                      )}
                    >
                      {hasProgress ? <Archive size={13} /> : <Trash2 size={13} />}
                      {hasProgress ? "Archive Subject" : "Delete Subject"}
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={addSubject}
        className="w-full h-12 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
      >
        <Plus size={16} />
        Add Subject
      </button>

      {archivedSubjects.length > 0 && (
        <div className="mt-2 pt-3 border-t border-border/60">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Archived ({archivedSubjects.length})
          </p>
          <div className="flex flex-col gap-2">
            {archivedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60"
              >
                <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{subject.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {subject.lectures.filter((l) => l.status === "completed").length}/
                    {subject.lectures.length} lectures · history preserved
                  </p>
                </div>
                <button
                  onClick={() => dispatch({ type: "UNARCHIVE_SUBJECT", subjectId: subject.id })}
                  className="flex items-center gap-1 text-xs font-medium text-primary px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <RotateCcw size={12} />
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reminders ─────────────────────────────────────────────────────────────

function RemindersCard() {
  const [settings, setSettingsState] = useState(() => getReminderSettings());
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPerm(notificationPermission());
  }, []);

  const update = (next: Partial<typeof settings>) => {
    const merged = { ...settings, ...next };
    setSettingsState(merged);
    setReminderSettings(merged);
  };

  const toggleEnabled = async () => {
    if (!settings.enabled) {
      const p = await requestNotificationPermission();
      setPerm(p);
      if (p !== "granted") return;
      update({ enabled: true });
    } else {
      update({ enabled: false });
    }
  };

  const timeOptions = ["07:00", "08:00", "12:00", "17:00", "19:00", "20:00", "21:00", "22:00"];

  const unsupported = perm === "unsupported";
  const denied = perm === "denied";

  return (
    <div className="bg-card rounded-3xl border border-border px-4 py-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-foreground">Daily Reminder</p>
        <button
          onClick={toggleEnabled}
          disabled={unsupported || denied}
          aria-pressed={settings.enabled}
          className={cn(
            "w-11 h-6 rounded-full relative transition-colors",
            settings.enabled ? "bg-primary" : "bg-muted",
            (unsupported || denied) && "opacity-50 cursor-not-allowed",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-5 h-5 bg-card rounded-full shadow-sm transition-transform",
              settings.enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        A single, gentle mentor nudge at your preferred study time. Maximum three a day. Never
        streaks. Never guilt.
      </p>

      {settings.enabled && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Preferred time
          </p>
          <div className="grid grid-cols-4 gap-2">
            {timeOptions.map((t) => {
              const active = settings.time === t;
              return (
                <button
                  key={t}
                  onClick={() => update({ time: t })}
                  className={cn(
                    "h-9 rounded-xl text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border text-foreground",
                  )}
                >
                  {formatClockTime(t)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {denied && (
        <p className="text-xs text-muted-foreground mt-3">
          Notifications are blocked for this site. Enable them in your browser settings to receive
          reminders.
        </p>
      )}
      {unsupported && (
        <p className="text-xs text-muted-foreground mt-3">
          This device or browser does not support notifications.
        </p>
      )}
    </div>
  );
}

function formatClockTime(t: string): string {
  const [hh, mm] = t.split(":").map((n) => parseInt(n, 10));
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}${mm ? `:${mm.toString().padStart(2, "0")}` : ""} ${period}`;
}

// ─── Appearance ────────────────────────────────────────────────────────────

function AppearanceCard() {
  const { mode, setMode } = useTheme();
  const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="bg-card rounded-3xl border border-border px-4 py-4">
      <p className="text-sm font-semibold text-foreground mb-1">Appearance</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        Brick follows your system theme by default. Choose what feels calm.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition-all",
                active
                  ? "border-primary/40 bg-primary/8 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={active}
            >
              <Icon size={16} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Backup / Restore ──────────────────────────────────────────────────────

function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [autoBackups, setAutoBackups] = useState<AutoBackup[]>([]);

  useEffect(() => {
    setAutoBackups(getAutoBackups());
  }, []);

  const onExport = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brick-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: "ok", message: "Backup downloaded." });
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const result = importBackup(text);
      if (result.ok) {
        setStatus({ kind: "ok", message: "Backup restored. Reloading…" });
        setTimeout(() => window.location.reload(), 600);
      } else {
        setStatus({ kind: "err", message: result.error });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const onRestoreAutoBackup = (backup: AutoBackup) => {
    if (
      !confirm(
        `Are you sure you want to restore the backup from ${new Date(backup.timestamp).toLocaleString()}?`,
      )
    )
      return;
    const result = importBackup(JSON.stringify(backup.data));
    if (result.ok) {
      setStatus({ kind: "ok", message: "Auto-backup restored. Reloading…" });
      setTimeout(() => window.location.reload(), 600);
    } else {
      setStatus({ kind: "err", message: result.error });
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border px-4 py-4">
      <p className="text-sm font-semibold text-foreground mb-1">Backup & Restore</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        Brick lives on this device. Export a copy of your progress regularly so a cleared browser
        never erases your work.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onExport}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-foreground text-background text-sm font-medium active:opacity-80 transition-opacity"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-muted text-foreground text-sm font-medium active:opacity-80 transition-opacity"
        >
          <Upload size={14} />
          Restore
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        onChange={onImport}
        className="hidden"
      />
      {status && (
        <p
          className={cn("text-xs mt-2", status.kind === "ok" ? "text-success" : "text-destructive")}
        >
          {status.message}
        </p>
      )}

      {autoBackups.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/60">
          <p className="text-sm font-semibold text-foreground mb-2">Automatic Backups</p>
          <div className="flex flex-col gap-2">
            {autoBackups.map((backup) => (
              <div
                key={backup.timestamp}
                className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/60"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">
                    {new Date(backup.timestamp).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{backup.reason}</span>
                </div>
                <button
                  onClick={() => onRestoreAutoBackup(backup)}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reset confirm ─────────────────────────────────────────────────────────


function ResetButton() {
  const { dispatch } = useStore();
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="bg-destructive/10 rounded-3xl border border-destructive/20 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-destructive" />
          <p className="text-sm font-semibold text-destructive">Reset all data?</p>
        </div>
        <p className="text-xs text-muted-foreground">
          This will delete all your subjects, sessions, and progress. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: "RESET_APP" })}
            className="flex-1 h-10 bg-destructive text-white rounded-xl font-semibold text-sm"
          >
            Yes, reset everything
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="flex-1 h-10 bg-muted text-foreground rounded-xl font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full h-12 bg-card rounded-2xl border border-border flex items-center justify-center gap-2 text-sm font-medium text-destructive active:opacity-70 transition-opacity"
    >
      <Trash2 size={15} />
      Reset All Data
    </button>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 pt-14 pb-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80">
          — The Workshop —
        </p>
        <h1 className="font-heading text-4xl text-foreground leading-none mt-1">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1 italic">Shape your space.</p>
      </div>

      <div className="px-5 space-y-6">
        {/* Profile */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Profile
            </h2>
          </div>
          <ProfileSection />
        </section>

        {/* Capacity */}
        <section>
          <CapacityCard />
        </section>

        {/* Subjects */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Subjects & Lectures
            </h2>
          </div>
          <SubjectManager />
        </section>

        {/* Appearance */}
        <section>
          <AppearanceCard />
        </section>

        {/* Reminders */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Reminders
            </h2>
          </div>
          <RemindersCard />
        </section>

        {/* Backup */}
        <section className="space-y-3">
          <BackupCard />
        </section>

        {/* Danger zone */}
        <section className="pb-4">
          <ResetButton />
          <p className="text-center text-xs text-muted-foreground mt-4">Brick v1.0</p>
        </section>
      </div>
    </div>
  );
}
