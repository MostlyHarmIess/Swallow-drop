import { useRef } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

type Drop = Doc<"drops">;

type Identity = {
  name: string;
  color: string;
  sessionId: string;
};

type DropSlotsProps = {
  drops: Drop[];
  identity: Identity;
  onClaim: (dropId: string) => void;
};

const TOTAL_SLOTS = 16; 
const SLOT_LAYOUTS = [
  "md:row-span-2",
  "md:row-span-2",
  "",
  "md:row-span-2",
  "md:col-span-2",
  "md:row-span-2",
  "md:row-span-2",
  "",
  "md:col-span-1 md:row-span-2",
  "",
  "md:col-span-2",
];
const COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#22c55e",
  "#0ea5e9",
  "#a855f7",
  "#f97316",
  "#14b8a6",
  "#e11d48",
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function dispatchFilesDropped(files: File[], slotId: number) {
  const event = new CustomEvent("filesDropped", {
    detail: { files, slotId },
  });
  window.dispatchEvent(event);
}

export default function DropSlots({
  drops,
  identity,
  onClaim,
}: DropSlotsProps) {
  const slotMap: Record<number, Drop | undefined> = {};
  drops.forEach((drop) => {
    slotMap[drop.slotId] = drop;
  });

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 auto-rows-[5.75rem] grid-flow-dense pb-1">
      {Array.from({ length: TOTAL_SLOTS }).map((_, slotId) => {
        const drop = slotMap[slotId];
        const isOwner = drop?.senderSessionId === identity.sessionId;

        return (
          <div key={slotId} className={`${SLOT_LAYOUTS[slotId]} h-full`}>
            {drop ? (
              <div
                className="h-full rounded-lg border-2 p-2 flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-950 transition-shadow cursor-pointer"
                style={{
                  backgroundColor:
                    drop.senderSessionId === identity.sessionId
                      ? "#0f172a"
                      : COLORS[slotId % COLORS.length] + "15",
                  borderColor:
                    drop.senderSessionId === identity.sessionId
                      ? "#334155"
                      : COLORS[slotId % COLORS.length] + "80",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-100 truncate text-sm">
                    {drop.originalName}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {drop.senderName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(drop.fileSize)}
                  </p>
                </div>

                {isOwner ? (
                  <div className="mt-2 px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium text-center">
                    Your file
                  </div>
                ) : drop.status === "offline" ? (
                  <div className="mt-2 px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-medium text-center">
                    Sender offline
                  </div>
                ) : (
                  <button
                    onClick={() => onClaim(drop._id)}
                    className="mt-2 w-full px-2 py-1 bg-sky-500 text-slate-950 rounded text-xs font-medium hover:bg-sky-400 transition"
                  >
                    Claim
                  </button>
                )}
              </div>
            ) : (
              // Empty slot
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add(
                    "border-sky-500",
                    "bg-slate-800",
                  );
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove(
                    "border-sky-500",
                    "bg-slate-800",
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove(
                    "border-sky-500",
                    "bg-slate-800",
                  );
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0) {
                    dispatchFilesDropped(files, slotId);
                  }
                }}
                onClick={() => fileInputRefs.current[slotId]?.click()}
                className="h-full rounded-lg border-2 border-dashed border-slate-700 p-2 flex flex-col items-center justify-center hover:border-slate-500 active:border-sky-500 active:bg-slate-800 transition cursor-pointer"
              >
                <input
                  ref={(el) => {
                    fileInputRefs.current[slotId] = el;
                  }}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) {
                      dispatchFilesDropped(files, slotId);
                    }
                    e.target.value = "";
                  }}
                />
                <svg
                  className="w-5 h-5 text-slate-400 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-[10px] text-slate-500 text-center leading-tight">
                  Tap or drop
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
