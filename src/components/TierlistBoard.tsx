"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import {
  DayButton,
  DayPicker,
  type DayButtonProps,
} from "react-day-picker";
import { parseIsoDate, toIsoDate } from "@/lib/date";
import {
  fileFromClipboardDataTransfer,
  isValidImageDataUrl,
  isValidPoolPicture,
  readFileAsDataUrl,
} from "@/lib/image-data-url";
import {
  TIERS,
  TIER_POINTS,
  type PoolUser,
  type Tier,
  averagePointsForUser,
  groupByTier,
  tierFromAveragePoints,
} from "@/lib/tierlist";
import "react-day-picker/style.css";

type TabId = "date" | "overall";

const dragId = (userId: string) => `user-${userId}`;

function userImageUnoptimized(src: string): boolean {
  return (
    src.startsWith("data:") || !src.startsWith("https://picsum.photos/")
  );
}

function PoolAvatar({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (src.startsWith("data:")) {
    return (
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={className ?? "h-full w-full object-cover"}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className ?? "object-cover"}
      sizes="56px"
      draggable={false}
      unoptimized={userImageUnoptimized(src)}
    />
  );
}

const tierStyles: Record<Tier, string> = {
  S: "bg-rose-500/90 text-white border-rose-400/50",
  A: "bg-orange-500/90 text-white border-orange-400/50",
  B: "bg-amber-400/95 text-amber-950 border-amber-300/60",
  C: "bg-emerald-600/90 text-white border-emerald-500/50",
  D: "bg-sky-700/90 text-white border-sky-500/50",
};

function TierlistDayButton(props: DayButtonProps) {
  const { modifiers, className, children } = props;
  return (
    <DayButton
      {...props}
      className={`flex min-h-11 flex-col justify-center gap-0.5 py-1 ${className ?? ""}`}
    >
      <span className="text-sm leading-none">{children}</span>
      {modifiers.hasTierlist ? (
        <span
          className="mx-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white"
          aria-hidden
        />
      ) : (
        <span className="mx-auto h-1.5 w-1.5 shrink-0" aria-hidden />
      )}
    </DayButton>
  );
}

function DraggableUserChip({
  user,
  subtitle,
  disabled,
  onEdit,
  onDelete,
}: {
  user: PoolUser;
  subtitle?: string;
  disabled?: boolean;
  onEdit?: (user: PoolUser) => void;
  onDelete?: (user: PoolUser) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId(user.id),
      data: { user },
      disabled,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex min-w-[8.5rem] gap-1 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
        <DragHandle {...listeners} {...attributes} />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-white/15">
            <PoolAvatar src={user.picture} alt={user.name} />
          </div>
          <p className="max-w-[6.5rem] truncate text-center text-xs font-medium text-zinc-100">
            {user.name}
          </p>
          {subtitle ? (
            <p className="text-[10px] font-mono text-zinc-400">{subtitle}</p>
          ) : null}
          {onEdit || onDelete ? (
            <div className="flex justify-center gap-0.5">
              {onEdit ? (
                <button
                  type="button"
                  aria-label={`Edit ${user.name}`}
                  title="Edit"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(user);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 text-cyan-300 hover:bg-white/10"
                >
                  <IconPencil />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  aria-label={`Remove ${user.name} from pool`}
                  title="Delete from pool"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(user);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                >
                  <IconTrash />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StaticUserChip({
  user,
  subtitle,
  onEdit,
  onDelete,
}: {
  user: PoolUser;
  subtitle?: string;
  onEdit?: (user: PoolUser) => void;
  onDelete?: (user: PoolUser) => void;
}) {
  return (
    <div className="flex min-w-[7.5rem] flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm">
      <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-white/15">
        <PoolAvatar src={user.picture} alt={user.name} />
      </div>
      <p className="max-w-[6.5rem] truncate text-center text-xs font-medium text-zinc-100">
        {user.name}
      </p>
      {subtitle ? (
        <p className="text-[10px] font-mono text-zinc-400">{subtitle}</p>
      ) : null}
      {onEdit || onDelete ? (
        <div className="flex justify-center gap-0.5">
          {onEdit ? (
            <button
              type="button"
              aria-label={`Edit ${user.name}`}
              title="Edit"
              onClick={() => onEdit(user)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 text-cyan-300 hover:bg-white/10"
            >
              <IconPencil />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label={`Remove ${user.name} from pool`}
              title="Delete from pool"
              onClick={() => onDelete(user)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
            >
              <IconTrash />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TierDropZone({
  tier,
  children,
  active,
}: {
  tier: Tier;
  children: React.ReactNode;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tier-${tier}`,
    data: { tier },
    disabled: !active,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[5rem] min-w-0 flex-1 flex-wrap content-start gap-2 rounded-lg transition-colors ${
        active && isOver ? "bg-cyan-500/15 ring-2 ring-cyan-400/50" : ""
      }`}
    >
      {children}
    </div>
  );
}

function PoolDropZone({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "pool",
    disabled: !active,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[7rem] flex-wrap content-start gap-2 rounded-xl border border-dashed p-3 transition-colors sm:p-4 ${
        active && isOver
          ? "border-cyan-400/60 bg-cyan-500/10"
          : "border-white/20 bg-zinc-950/40"
      }`}
    >
      {children}
    </div>
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function dateHasTierlist(
  date: Date,
  rankings: Record<string, Partial<Record<string, Tier>>>,
  tierlistScreenshots: Record<string, string | null | undefined>,
): boolean {
  const key = toIsoDate(date);
  const map = rankings[key];
  if (map != null && Object.keys(map).length > 0) return true;
  const img = tierlistScreenshots[key];
  return typeof img === "string" && img.length > 0;
}

function DragHandle(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Drag to move"
      className="mt-1 shrink-0 cursor-grab touch-none rounded border border-white/10 bg-zinc-900/80 p-1 text-zinc-500 hover:border-white/20 hover:text-zinc-300 active:cursor-grabbing"
      {...props}
    >
      <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden className="block">
        <circle cx="2.5" cy="3" r="1.25" fill="currentColor" />
        <circle cx="7.5" cy="3" r="1.25" fill="currentColor" />
        <circle cx="2.5" cy="7" r="1.25" fill="currentColor" />
        <circle cx="7.5" cy="7" r="1.25" fill="currentColor" />
        <circle cx="2.5" cy="11" r="1.25" fill="currentColor" />
        <circle cx="7.5" cy="11" r="1.25" fill="currentColor" />
      </svg>
    </button>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function formatSelectedLabel(iso: string): string {
  const d = parseIsoDate(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TierlistBoard() {
  const { data: session, status: sessionStatus } = useSession();
  const [tab, setTab] = useState<TabId>("date");
  const [users, setUsers] = useState<PoolUser[]>([]);
  const [rankings, setRankings] = useState<
    Record<string, Partial<Record<string, Tier>>>
  >({});
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const selected = useMemo(() => parseIsoDate(selectedDate), [selectedDate]);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  useEffect(() => {
    setCalendarMonth(startOfMonth(parseIsoDate(selectedDate)));
  }, [selectedDate]);

  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserImageData, setNewUserImageData] = useState("");
  const [createUserImageError, setCreateUserImageError] = useState("");
  const newUserNameId = useId();
  const newUserPhotoZoneId = useId();
  const newUserFileInputRef = useRef<HTMLInputElement>(null);

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PoolUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editImageData, setEditImageData] = useState("");
  const [editUserError, setEditUserError] = useState("");
  const editUserNameId = useId();
  const editUserPhotoZoneId = useId();
  const editUserFileInputRef = useRef<HTMLInputElement>(null);

  const [tierlistScreenshots, setTierlistScreenshots] = useState<
    Record<string, string | null>
  >({});
  const [tierlistImageModalOpen, setTierlistImageModalOpen] = useState(false);
  const [tierlistImageError, setTierlistImageError] = useState("");
  const [savingTierlistImage, setSavingTierlistImage] = useState(false);
  const tierlistImageZoneId = useId();
  const tierlistFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dateMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = dateMenuRef.current;
      if (el?.contains(e.target as Node)) return;
      setDateMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDateMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dateMenuOpen]);

  const [activeUser, setActiveUser] = useState<PoolUser | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const saveHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFromApi = useCallback(async () => {
    setLoadState("loading");
    try {
      const r = await fetch("/api/tierlist-state");
      if (r.status === 401) {
        void signOut({ callbackUrl: "/login" });
        return;
      }
      if (!r.ok) throw new Error("fetch failed");
      const data = (await r.json()) as {
        users: PoolUser[];
        rankings: Record<string, Partial<Record<string, Tier>>>;
        selectedDate: string;
        tierlistScreenshots?: Record<string, string | null>;
      };
      setUsers(data.users);
      setRankings(data.rankings);
      setSelectedDate(data.selectedDate);
      setCalendarMonth(startOfMonth(parseIsoDate(data.selectedDate)));
      setTierlistScreenshots(data.tierlistScreenshots ?? {});
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void loadFromApi();
  }, [sessionStatus, loadFromApi]);

  useEffect(() => {
    return () => {
      if (saveHintTimerRef.current != null) {
        clearTimeout(saveHintTimerRef.current);
      }
    };
  }, []);

  const handleSaveTierlist = useCallback(async () => {
    const rankingsPayload = { ...rankings };
    for (const d of Object.keys(tierlistScreenshots)) {
      const img = tierlistScreenshots[d];
      if (img != null && img.length > 0 && rankingsPayload[d] === undefined) {
        rankingsPayload[d] = {};
      }
    }
    try {
      const r = await fetch("/api/tierlist-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users,
          rankings: rankingsPayload,
          selectedDate,
        }),
      });
      if (r.status === 401) {
        void signOut({ callbackUrl: "/login" });
        return;
      }
      if (!r.ok) throw new Error("save failed");
      setSaveHint("Saved");
      if (saveHintTimerRef.current != null) {
        clearTimeout(saveHintTimerRef.current);
      }
      saveHintTimerRef.current = setTimeout(() => setSaveHint(null), 2500);
    } catch {
      setSaveHint("Could not save");
      if (saveHintTimerRef.current != null) {
        clearTimeout(saveHintTimerRef.current);
      }
      saveHintTimerRef.current = setTimeout(() => setSaveHint(null), 4000);
    }
  }, [users, rankings, selectedDate, tierlistScreenshots]);

  const persistTierlistImage = useCallback(async (date: string, dataUrl: string) => {
    setSavingTierlistImage(true);
    setTierlistImageError("");
    try {
      const res = await fetch("/api/tierlist-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dataUrl }),
      });
      if (res.status === 401) {
        void signOut({ callbackUrl: "/login" });
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setTierlistImageError(j.error ?? "Could not save image.");
        return;
      }
      setTierlistScreenshots((prev) => ({ ...prev, [date]: dataUrl }));
      if (saveHintTimerRef.current != null) {
        clearTimeout(saveHintTimerRef.current);
      }
      setSaveHint("Tierlist image saved");
      saveHintTimerRef.current = setTimeout(() => setSaveHint(null), 2500);
    } catch {
      setTierlistImageError("Could not save image.");
    } finally {
      setSavingTierlistImage(false);
    }
  }, []);

  const setTierlistImageFromFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setTierlistImageError("Use an image file.");
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (!isValidImageDataUrl(dataUrl)) {
          setTierlistImageError(
            "Image too large (max ~4MB) or unsupported type.",
          );
          return;
        }
        await persistTierlistImage(selectedDate, dataUrl);
      } catch {
        setTierlistImageError("Could not read image.");
      }
    },
    [persistTierlistImage, selectedDate],
  );

  const handleRemoveTierlistImage = useCallback(async () => {
    try {
      const res = await fetch("/api/tierlist-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, dataUrl: null }),
      });
      if (res.status === 401) {
        void signOut({ callbackUrl: "/login" });
        return;
      }
      if (!res.ok) throw new Error();
      setTierlistScreenshots((prev) => {
        const next = { ...prev };
        delete next[selectedDate];
        return next;
      });
      setTierlistImageModalOpen(false);
      setTierlistImageError("");
    } catch {
      /* ignore */
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!tierlistImageModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTierlistImageModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tierlistImageModalOpen]);

  useEffect(() => {
    setTierlistImageError("");
  }, [selectedDate]);

  useEffect(() => {
    if (!editUserOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditUserOpen(false);
        setEditTarget(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editUserOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const mapForSelected = useMemo(
    () => rankings[selectedDate] ?? {},
    [rankings, selectedDate],
  );
  const dndActive = tab === "date";

  const byTier = useMemo(() => {
    if (tab === "date") {
      return groupByTier(users, (id) => mapForSelected[id] ?? null);
    }
    return groupByTier(users, (id) => {
      const avg = averagePointsForUser(id, rankings);
      if (avg === null) return null;
      return tierFromAveragePoints(avg);
    });
  }, [tab, mapForSelected, rankings, users]);

  const poolUsersList = useMemo(() => {
    if (tab !== "date") return [];
    return users.filter((u) => !mapForSelected[u.id]);
  }, [tab, mapForSelected, users]);

  const setImageFromFile = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCreateUserImageError("Use an image file.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!isValidImageDataUrl(dataUrl)) {
        setCreateUserImageError(
          "Image too large (max ~4MB) or unsupported type.",
        );
        return;
      }
      setNewUserImageData(dataUrl);
      setCreateUserImageError("");
    } catch {
      setCreateUserImageError("Could not read image.");
    }
  }, []);

  const addUser = useCallback(() => {
    const name = newUserName.trim();
    if (!name) return;
    if (!isValidImageDataUrl(newUserImageData)) {
      setCreateUserImageError(
        "Add a photo: drop a file, choose one, or paste an image (Ctrl+V).",
      );
      return;
    }
    setCreateUserImageError("");
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `u-${Date.now()}`;
    setUsers((prev) => [...prev, { id, name, picture: newUserImageData }]);
    setNewUserName("");
    setNewUserImageData("");
    setCreateUserOpen(false);
  }, [newUserName, newUserImageData]);

  const modifiers = useMemo(
    () => ({
      hasTierlist: (date: Date) =>
        dateHasTierlist(date, rankings, tierlistScreenshots),
    }),
    [rankings, tierlistScreenshots],
  );

  const tierlistImageForDate =
    tierlistScreenshots[selectedDate] ?? null;

  const openEditUser = useCallback((user: PoolUser) => {
    setEditTarget(user);
    setEditName(user.name);
    setEditImageData(user.picture);
    setEditUserError("");
    setEditUserOpen(true);
  }, []);

  const setEditImageFromFile = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEditUserError("Use an image file.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!isValidImageDataUrl(dataUrl)) {
        setEditUserError("Image too large (max ~4MB) or unsupported type.");
        return;
      }
      setEditImageData(dataUrl);
      setEditUserError("");
    } catch {
      setEditUserError("Could not read image.");
    }
  }, []);

  const saveEditUser = useCallback(() => {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) return;
    if (!isValidPoolPicture(editImageData)) {
      setEditUserError("Photo must be a valid image (data URL or https link).");
      return;
    }
    setEditUserError("");
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editTarget.id ? { ...u, name, picture: editImageData } : u,
      ),
    );
    setEditUserOpen(false);
    setEditTarget(null);
  }, [editTarget, editName, editImageData]);

  const deleteUserFromPool = useCallback((user: PoolUser) => {
    if (
      !window.confirm(
        `Remove ${user.name} from the pool for all dates? This cannot be undone.`,
      )
    ) {
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setRankings((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        const m = { ...next[k] };
        if (m[user.id] !== undefined) {
          delete m[user.id];
          if (Object.keys(m).length === 0) delete next[k];
          else next[k] = m;
        }
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const u = e.active.data.current?.user as PoolUser | undefined;
    setActiveUser(u ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveUser(null);
      if (!dndActive) return;
      const userId = e.active.data.current?.user?.id as string | undefined;
      if (!userId) return;
      const overId = e.over?.id?.toString();

      setRankings((prev) => {
        const day = { ...(prev[selectedDate] ?? {}) };

        if (overId === "pool") {
          delete day[userId];
          const next = { ...prev };
          if (Object.keys(day).length === 0) {
            delete next[selectedDate];
            return next;
          }
          next[selectedDate] = day;
          return next;
        }

        if (overId?.startsWith("tier-")) {
          const tier = overId.slice(5) as Tier;
          if (!TIERS.includes(tier)) return prev;
          return {
            ...prev,
            [selectedDate]: { ...day, [userId]: tier },
          };
        }

        return prev;
      });
    },
    [dndActive, selectedDate],
  );

  const handleDragCancel = useCallback(() => setActiveUser(null), []);

  if (sessionStatus === "loading") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-400">
        <p>Loading…</p>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return null;
  }

  if (loadState === "loading") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-400">
        <p>Loading tierlist…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-zinc-400">Could not load your tierlist.</p>
        <button
          type="button"
          onClick={() => void loadFromApi()}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-zinc-100 hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
              Chillzone Tierlist
            </h1>
            {session?.user?.tenantName ? (
              <p className="truncate text-xs text-zinc-500">
                {session.user.tenantName}
                {session.user.tenantSlug
                  ? ` · ${session.user.tenantSlug}`
                  : null}
              </p>
            ) : null}
          </div>
          <nav
            className="flex gap-1 rounded-lg bg-black/25 p-1 ring-1 ring-white/10"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setTab("date")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "date"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Specific date
            </button>
            <button
              type="button"
              onClick={() => setTab("overall")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "overall"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Overall
            </button>
          </nav>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/5"
          >
            Sign out
          </button>
        </header>

        {tab === "date" ? (
          <div className="border-b border-white/5 px-4 py-3 sm:px-6">
            <div ref={dateMenuRef} className="relative w-full max-w-xs">
              <button
                type="button"
                aria-expanded={dateMenuOpen}
                aria-haspopup="dialog"
                onClick={() => setDateMenuOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-zinc-900/70 px-4 py-3 text-left text-sm text-zinc-100 shadow-sm outline-none ring-cyan-500/40 transition-colors hover:border-white/25 hover:bg-zinc-900 focus-visible:ring-2"
              >
                <span>
                  <span className="block text-xs font-medium text-zinc-500">
                    Selected date
                  </span>
                  <span className="font-medium text-zinc-50">
                    {formatSelectedLabel(selectedDate)}
                  </span>
                </span>
                <span
                  className={`text-zinc-400 transition-transform ${dateMenuOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▼
                </span>
              </button>
              {dateMenuOpen ? (
                <div
                  className="absolute left-0 right-0 top-full z-40 mt-1.5 rounded-xl border border-white/10 bg-zinc-950/95 p-3 shadow-xl ring-1 ring-black/40 backdrop-blur-md"
                  role="dialog"
                  aria-label="Choose date"
                >
                  <p className="mb-2 px-1 text-xs text-zinc-500">
                    Filled dot = rankings and/or a tierlist image for that day.
                  </p>
                  <div className="flex justify-center">
                    <DayPicker
                      mode="single"
                      required
                      selected={selected}
                      onSelect={(d) => {
                        if (d) {
                          setSelectedDate(toIsoDate(d));
                          setDateMenuOpen(false);
                        }
                      }}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      modifiers={modifiers}
                      components={{ DayButton: TierlistDayButton }}
                      className="chillzone-rdp rounded-lg border border-white/10 bg-zinc-900/50 p-2 [--rdp-accent-color:rgb(34,211,238)] [--rdp-accent-background-color:rgba(34,211,238,0.15)] [--rdp-outside-opacity:0.35] [--rdp-weekday-opacity:0.65]"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="border-b border-white/5 px-4 py-3 text-sm text-zinc-400 sm:px-6">
            Overall ranks use your average tier score (S = {TIER_POINTS.S}, A ={" "}
            {TIER_POINTS.A}, B = {TIER_POINTS.B}, C = {TIER_POINTS.C}, D ={" "}
            {TIER_POINTS.D}), rounded to the nearest whole step.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-white/5 px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={handleSaveTierlist}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/15"
          >
            Save tierlist
          </button>
          {tab === "date" ? (
            tierlistImageForDate ? (
              <button
                type="button"
                onClick={() => setTierlistImageModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <img
                  src={tierlistImageForDate}
                  alt=""
                  className="h-9 w-14 rounded border border-white/15 object-cover object-top"
                />
                View image for this date
              </button>
            ) : (
              <div className="flex max-w-md flex-col gap-1">
                <div
                  id={tierlistImageZoneId}
                  tabIndex={0}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void setTierlistImageFromFile(
                      fileFromClipboardDataTransfer(e.dataTransfer),
                    );
                  }}
                  onPaste={(e) => {
                    const f = e.clipboardData.files[0];
                    if (f?.type.startsWith("image/")) {
                      void setTierlistImageFromFile(f);
                    }
                  }}
                  className="rounded-lg border border-dashed border-violet-500/40 bg-violet-500/10 px-3 py-2 text-left outline-none ring-violet-500/30 focus-visible:ring-2"
                >
                  <input
                    ref={tierlistFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={savingTierlistImage}
                    onChange={(e) =>
                      void setTierlistImageFromFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-xs text-zinc-400">
                    <span className="text-zinc-300">Image for this date</span> —
                    drop, paste, or{" "}
                    <button
                      type="button"
                      disabled={savingTierlistImage}
                      onClick={() => tierlistFileInputRef.current?.click()}
                      className="font-medium text-violet-300 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      choose file
                    </button>
                    {savingTierlistImage ? " (saving…)" : null}
                  </p>
                </div>
                {tierlistImageError ? (
                  <p className="text-xs text-rose-400" role="alert">
                    {tierlistImageError}
                  </p>
                ) : null}
              </div>
            )
          ) : null}
          {saveHint ? (
            <span className="text-xs text-zinc-400" role="status">
              {saveHint}
            </span>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-4 sm:p-6">
          {TIERS.map((tier) => (
            <section
              key={tier}
              className="flex min-h-[5.5rem] gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3 sm:gap-4"
            >
              <div
                className={`flex w-11 shrink-0 items-center justify-center rounded-lg border text-lg font-bold shadow-inner sm:w-14 sm:text-xl ${tierStyles[tier]}`}
              >
                {tier}
              </div>
              <TierDropZone tier={tier} active={dndActive}>
                {byTier[tier].length === 0 ? (
                  <span className="self-center text-sm text-zinc-500">
                    {dndActive
                      ? "Drop people here"
                      : "No one in this tier"}
                  </span>
                ) : (
                  byTier[tier].map((user) => {
                    const subtitle =
                      tab === "overall"
                        ? (() => {
                            const avg = averagePointsForUser(
                              user.id,
                              rankings,
                            );
                            return avg != null
                              ? `avg ${avg.toFixed(2)}`
                              : undefined;
                          })()
                        : undefined;
                    return dndActive ? (
                      <DraggableUserChip
                        key={user.id}
                        user={user}
                        onEdit={openEditUser}
                        onDelete={deleteUserFromPool}
                      />
                    ) : (
                      <StaticUserChip
                        key={user.id}
                        user={user}
                        subtitle={subtitle}
                        onEdit={openEditUser}
                        onDelete={deleteUserFromPool}
                      />
                    );
                  })
                )}
              </TierDropZone>
            </section>
          ))}
        </div>

        {tab === "date" ? (
          <div className="border-t border-white/10 px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-sm font-medium text-zinc-300">User pool</h2>
              <button
                type="button"
                onClick={() => setCreateUserOpen((o) => !o)}
                className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
              >
                {createUserOpen ? "Close" : "Create user"}
              </button>
            </div>
            {createUserOpen ? (
              <div className="mb-3 rounded-xl border border-white/10 bg-zinc-900/50 p-3 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={newUserNameId}
                      className="mb-1 block text-xs text-zinc-400"
                    >
                      Name
                    </label>
                    <input
                      id={newUserNameId}
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Display name"
                      className="w-full rounded-lg border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-cyan-500/30 focus:ring-2"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={newUserPhotoZoneId}
                      className="mb-1 block text-xs text-zinc-400"
                    >
                      Photo
                    </label>
                    <div
                      id={newUserPhotoZoneId}
                      tabIndex={0}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        void setImageFromFile(
                          fileFromClipboardDataTransfer(e.dataTransfer),
                        );
                      }}
                      onPaste={(e) => {
                        const f = e.clipboardData.files[0];
                        if (f?.type.startsWith("image/")) {
                          void setImageFromFile(f);
                        }
                      }}
                      className="rounded-xl border border-dashed border-white/25 bg-zinc-950/60 p-3 text-center outline-none ring-cyan-500/30 focus-visible:ring-2"
                    >
                      <input
                        ref={newUserFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          void setImageFromFile(e.target.files?.[0] ?? null)
                        }
                      />
                      {newUserImageData ? (
                        <img
                          src={newUserImageData}
                          alt="Preview"
                          className="mx-auto h-20 w-20 rounded-lg border border-white/10 object-cover"
                        />
                      ) : (
                        <p className="text-xs text-zinc-500">
                          Drop an image here, paste (Ctrl+V), or choose a file.
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => newUserFileInputRef.current?.click()}
                          className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
                        >
                          Choose image
                        </button>
                        {newUserImageData ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNewUserImageData("");
                              setCreateUserImageError("");
                            }}
                            className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-400 hover:bg-white/5"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {createUserImageError ? (
                      <p className="mt-1 text-xs text-rose-400" role="alert">
                        {createUserImageError}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={addUser}
                    disabled={
                      !newUserName.trim() ||
                      !isValidImageDataUrl(newUserImageData)
                    }
                    className="shrink-0 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40 sm:self-end"
                  >
                    Add to pool
                  </button>
                </div>
              </div>
            ) : (
              <p className="mb-3 text-xs text-zinc-500">
                Drag into a tier to rank for {selectedDate}. Drag back here to
                remove from the list.
              </p>
            )}
            <PoolDropZone active={dndActive}>
              {poolUsersList.length === 0 ? (
                <span className="text-sm text-zinc-500">
                  Everyone is placed — drag from a tier to return someone here.
                </span>
              ) : (
                poolUsersList.map((user) => (
                  <DraggableUserChip
                    key={user.id}
                    user={user}
                    onEdit={openEditUser}
                    onDelete={deleteUserFromPool}
                  />
                ))
              )}
            </PoolDropZone>
          </div>
        ) : null}

        <DragOverlay dropAnimation={null}>
          {activeUser ? (
            <div className="cursor-grabbing opacity-95">
              <StaticUserChip user={activeUser} />
            </div>
          ) : null}
        </DragOverlay>

        {editUserOpen && editTarget ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Edit pool user"
            onClick={() => {
              setEditUserOpen(false);
              setEditTarget(null);
            }}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-4 shadow-2xl sm:p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">
                Edit user
              </h3>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={editUserNameId}
                    className="mb-1 block text-xs text-zinc-400"
                  >
                    Name
                  </label>
                  <input
                    id={editUserNameId}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-cyan-500/30 focus:ring-2"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={editUserPhotoZoneId}
                    className="mb-1 block text-xs text-zinc-400"
                  >
                    Photo
                  </label>
                  <div
                    id={editUserPhotoZoneId}
                    tabIndex={0}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      void setEditImageFromFile(
                        fileFromClipboardDataTransfer(e.dataTransfer),
                      );
                    }}
                    onPaste={(e) => {
                      const f = e.clipboardData.files[0];
                      if (f?.type.startsWith("image/")) {
                        void setEditImageFromFile(f);
                      }
                    }}
                    className="rounded-xl border border-dashed border-white/25 bg-zinc-950/60 p-3 text-center outline-none ring-cyan-500/30 focus-visible:ring-2"
                  >
                    <input
                      ref={editUserFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        void setEditImageFromFile(e.target.files?.[0] ?? null)
                      }
                    />
                    {editImageData ? (
                      <img
                        src={editImageData}
                        alt="Preview"
                        className="mx-auto h-20 w-20 rounded-lg border border-white/10 object-cover"
                      />
                    ) : null}
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => editUserFileInputRef.current?.click()}
                        className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
                      >
                        Choose image
                      </button>
                    </div>
                  </div>
                  {editUserError ? (
                    <p className="mt-1 text-xs text-rose-400" role="alert">
                      {editUserError}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditUserOpen(false);
                    setEditTarget(null);
                  }}
                  className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditUser}
                  disabled={!editName.trim()}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tierlistImageModalOpen && tierlistImageForDate ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Tierlist image for selected date"
            onClick={() => setTierlistImageModalOpen(false)}
          >
            <div
              className="max-h-[92vh] max-w-full overflow-auto rounded-xl border border-white/10 bg-zinc-900 p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={tierlistImageForDate}
                alt="Tierlist image for selected date"
                className="max-h-[80vh] max-w-full rounded-lg object-contain"
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setTierlistImageModalOpen(false)}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-zinc-100 hover:bg-white/15"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemoveTierlistImage()}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/25"
                >
                  Remove image
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DndContext>
  );
}
