import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import DropSlots from "@/components/DropSlots";
import { useWebRTC } from "@/lib/useWebRTC";

type Identity = {
  name: string;
  color: string;
  sessionId: string;
};

type DropId = Id<"drops">;

type FilesDroppedEvent = CustomEvent<{ files: File[]; slotId: number }>;

type DashboardProps = {
  identity: Identity;
};

export default function Dashboard({ identity }: DashboardProps) {
  const upsertPresence = useMutation(api.presence.upsert);
  const removePresence = useMutation(api.presence.remove);
  const markDropsOffline = useMutation(api.drops.markOffline);
  const createDrop = useMutation(api.drops.create);
  const createClaim = useMutation(api.claims.create);
  const updateClaimStatus = useMutation(api.claims.updateStatus);
  const createTransferHistory = useMutation(api.transferHistory.create);
  const transferHistory = useQuery(api.transferHistory.listRecent, {
    limit: 5,
  });
  const onlineUsers = useQuery(api.presence.list);
  const drops = useQuery(api.drops.list);
  const senderClaims = useQuery(api.claims.listForSender, {
    senderSessionId: identity.sessionId,
  });

  const [localFiles, setLocalFiles] = useState<Record<string, File>>({});
  const [receivedFiles, setReceivedFiles] = useState<
    Array<{ file: File; from: string }>
  >([]);
  const processedClaimsRef = useRef(new Set<string>());

  const downloadReceivedFile = (file: File) => {
    const downloadUrl = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
  };

  const { sendFile } = useWebRTC(identity.sessionId, (file, fromSessionId) => {
    setReceivedFiles((existing) => [
      { file, from: fromSessionId },
      ...existing,
    ]);
    downloadReceivedFile(file);
  });

  useEffect(() => {
    upsertPresence({
      name: identity.name,
      color: identity.color,
      sessionId: identity.sessionId,
    });

    const interval = setInterval(() => {
      upsertPresence({
        name: identity.name,
        color: identity.color,
        sessionId: identity.sessionId,
      });
    }, 15000);

    return () => {
      clearInterval(interval);
      removePresence({ sessionId: identity.sessionId });
      markDropsOffline({ senderSessionId: identity.sessionId });
    };
  }, [identity, upsertPresence, removePresence, markDropsOffline]);

  useEffect(() => {
    const handleFilesDropped = async (event: Event) => {
      const customEvent = event as FilesDroppedEvent;
      const { files, slotId } = customEvent.detail;
      const [file] = files;
      if (!file) return;

      try {
        const dropId = await createDrop({
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isFolder: false,
          fileCount: 1,
          senderName: identity.name,
          senderSessionId: identity.sessionId,
          slotId,
        });

        setLocalFiles((current) => ({
          ...current,
          [String(dropId)]: file,
        }));
      } catch (error) {
        console.error("Error dropping file:", error);
      }
    };

    window.addEventListener("filesDropped", handleFilesDropped);
    return () => window.removeEventListener("filesDropped", handleFilesDropped);
  }, [identity, createDrop]);

  useEffect(() => {
    if (!senderClaims || !drops) return;

    const processClaims = async () => {
      for (const claim of senderClaims) {
        const claimKey = String(claim._id);
        if (processedClaimsRef.current.has(claimKey)) continue;
        processedClaimsRef.current.add(claimKey);

        const file = localFiles[String(claim.dropId)];
        if (!file) {
          console.warn(
            "No local file available for claimed drop",
            claim.dropId,
          );
          try {
            await updateClaimStatus({
              claimId: claim._id,
              status: "failed",
            });
          } catch (error) {
            console.error("Error marking claim failed:", error);
          }
          continue;
        }

        try {
          await updateClaimStatus({
            claimId: claim._id,
            status: "transferring",
          });
          await sendFile(claim.claimantSession, file);
          await updateClaimStatus({
            claimId: claim._id,
            status: "complete",
          });
          await createTransferHistory({
            fileName: file.name,
            from: identity.name,
            to: claim.claimantName,
            createdAt: Date.now(),
          });
        } catch (error) {
          console.error("Error sending file:", error);
          try {
            await updateClaimStatus({
              claimId: claim._id,
              status: "failed",
            });
          } catch (updateError) {
            console.error("Error marking claim failed:", updateError);
          }
        }
      }
    };

    void processClaims();
  }, [senderClaims, drops, localFiles, sendFile, updateClaimStatus]);

  const handleClaim = async (dropId: string) => {
    try {
      await createClaim({
        dropId: dropId as DropId,
        claimantName: identity.name,
        claimantSession: identity.sessionId,
      });
    } catch (error) {
      console.error("Error claiming file:", error);
      alert("Error claiming file. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_280px] gap-2">
        <div className="flex flex-col gap-2">
          <div className="px-4 pt-4">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-start">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  SwallowDrop
                </h1>
                <p className="text-slate-400">
                  Welcome,{" "}
                  <span className="font-semibold text-white">
                    {identity.name}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/20 overflow-hidden px-4 pb-4">
            <div className="pt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
              <h2 className="text-2xl font-semibold text-white">
                Drop Zone ({drops?.length || 0}/12)
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Drop files into open slots
              </p>
            </div>
            {((transferHistory?.length || 0) == 0 ||
              receivedFiles.length > 0) && (
              <div className="space-y-2 mb-4">
                {transferHistory && transferHistory.length > 0 && (
                  <div className="rounded-2xl bg-slate-800 p-3 text-sm text-slate-300">
                    <div className="font-medium text-slate-100 mb-2">
                      Latest transfer
                    </div>
                    <div>
                      {transferHistory[0].fileName} — {transferHistory[0].from}{" "}
                      → {transferHistory[0].to}
                    </div>
                  </div>
                )}
                {receivedFiles.length > 0 && (
                  <div className="rounded-2xl bg-slate-800 p-3 text-sm text-slate-300">
                    <div className="font-medium text-slate-100 mb-2">
                      Recent files received
                    </div>
                    <ul className="space-y-2">
                      {receivedFiles
                        .slice(0, 3)
                        .map(({ file, from }, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate">{file.name}</p>
                              <p className="text-xs text-slate-400">
                                From {from}
                              </p>
                            </div>
                            <button
                              onClick={() => downloadReceivedFile(file)}
                              className="px-3 py-1 bg-slate-700 text-slate-100 rounded-lg text-xs hover:bg-slate-600 transition"
                            >
                              Download
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div>
              <DropSlots
                drops={drops || []}
                identity={identity}
                onClaim={handleClaim}
              />
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 flex flex-col justify-center">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl shadow-slate-900/20 mb-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">
              Online Now ({onlineUsers?.length || 0})
            </h3>
            <div className="space-y-2">
              {onlineUsers && onlineUsers.length > 0 ? (
                onlineUsers.map((user) => (
                  <div
                    key={user.sessionId}
                    className="flex items-center gap-2 p-2 rounded-2xl hover:bg-slate-900 transition"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="text-xs font-medium text-slate-100">
                      {user.name}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No one else online</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl shadow-slate-900/20 mb-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">
              Transfer history ({transferHistory?.length || 0})
            </h3>
            <div className="space-y-2 text-sm text-slate-300 max-h-[240px] overflow-y-auto pr-1">
              {transferHistory && transferHistory.length > 0 ? (
                transferHistory.slice(0, 5).map((update, index) => (
                  <div key={index} className="rounded-2xl bg-slate-800 p-3">
                    <p className="truncate text-slate-100">{update.fileName}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {update.from} → {update.to}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">
                  No transfers completed yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
