import { useMutation } from "convex/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";

type Drop = Doc<"drops">;

type Identity = {
  name: string;
  color: string;
  sessionId: string;
};

type DropsListProps = {
  drops: Drop[];
  identity: Identity;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function DropsList({ drops, identity }: DropsListProps) {
  const createClaim = useMutation(api.claims.create);

  const handleClaim = async (dropId: Id<"drops">) => {
    try {
      await createClaim({
        dropId,
        claimantName: identity.name,
        claimantSession: identity.sessionId,
      });
      alert(
        "Claim initiated! Your household member will see a transfer request.",
      );
    } catch (error) {
      console.error("Error claiming file:", error);
      alert("Error claiming file. Please try again.");
    }
  };

  const otherDrops = drops.filter(
    (drop) => drop.senderSessionId !== identity.sessionId,
  );

  return (
    <div>
      {otherDrops.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No files available yet. Your household members can drop files here.
        </p>
      ) : (
        <div className="space-y-3">
          {otherDrops.map((drop) => (
            <div
              key={drop._id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* File icon */}
                <svg
                  className="w-5 h-5 text-slate-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.414l4.293 4.293a1 1 0 011.414 0L16.414 9A2 2 0 0118 10.414V14a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6z"
                    clipRule="evenodd"
                  />
                </svg>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">
                    {drop.originalName}
                  </p>
                  <p className="text-xs text-slate-500">
                    From <span className="font-medium">{drop.senderName}</span>{" "}
                    • {formatFileSize(drop.fileSize)} •{" "}
                    <span
                      className={
                        drop.status === "available"
                          ? "text-green-600"
                          : "text-slate-400"
                      }
                    >
                      {drop.status === "available"
                        ? "🟢 Available"
                        : "⚫ Offline"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Claim button */}
              <button
                onClick={() => handleClaim(drop._id)}
                className="flex-shrink-0 ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Claim
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
