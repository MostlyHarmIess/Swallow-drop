import { useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PeerConnection, type SignalingMessage } from "@/lib/webrtc";

/**
 * Hook to manage WebRTC file transfers
 * Handles peer connections, signaling, and file exchange
 */
export function useWebRTC(sessionId: string, onFileReceived: (file: File, fromSessionId: string) => void) {
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const processingRef = useRef<Set<string>>(new Set());
  const sendSignaling = useMutation(api.webrtc.sendSignaling);
  const consumeMessage = useMutation(api.webrtc.consumeMessage);
  const signalingMessages = useQuery(api.webrtc.listForSession, {
    sessionId,
  });

  const createPeerConnection = useCallback(
    (peerId: string) => {
      if (peersRef.current.has(peerId)) {
        return peersRef.current.get(peerId)!;
      }

      // Callback to send signaling messages through Convex
      const onMessage = async (message: SignalingMessage) => {
        try {
          await sendSignaling({
            fromSessionId: sessionId,
            toSessionId: peerId,
            message: JSON.stringify(message),
          });
        } catch (error) {
          console.error("Error sending signaling message:", error);
        }
      };

      const peer = new PeerConnection(onMessage, file => {
        onFileReceived(file, peerId);
      });
      peersRef.current.set(peerId, peer);
      return peer;
    },
    [sessionId, sendSignaling, onFileReceived]
  );

  const handleSignalingMessage = useCallback(
    async (fromSessionId: string, message: SignalingMessage) => {
      let peer = peersRef.current.get(fromSessionId);

      if (!peer) {
        peer = createPeerConnection(fromSessionId);
      }

      try {
        if (message.type === "offer") {
          const answer = await peer.handleOffer(message.offer);
          await sendSignaling({
            fromSessionId: sessionId,
            toSessionId: fromSessionId,
            message: JSON.stringify({
              type: "answer",
              answer,
            }),
          });
        } else if (message.type === "answer") {
          await peer.handleAnswer(message.answer);
        } else if (message.type === "ice-candidate") {
          await peer.addIceCandidate(message.candidate);
        }
      } catch (error) {
        console.error("Error handling signaling message:", error);
      }
    },
    [createPeerConnection, sessionId, sendSignaling]
  );

  useEffect(() => {
    if (!signalingMessages) return;

    const processMessages = async () => {
      for (const signal of signalingMessages) {
        if (processingRef.current.has(signal._id)) continue;
        processingRef.current.add(signal._id);

        try {
          const message = JSON.parse(signal.message) as SignalingMessage;
          await handleSignalingMessage(signal.fromSessionId, message);
          await consumeMessage({ messageId: signal._id });
        } catch (error) {
          console.error("Error processing signaling message:", error);
          processingRef.current.delete(signal._id);
        }
      }
    };

    void processMessages();
  }, [signalingMessages, handleSignalingMessage, consumeMessage]);

  const sendFile = useCallback(
    async (peerId: string, file: File) => {
      const peer = createPeerConnection(peerId);

      try {
        const offer = await peer.createOffer();
        await sendSignaling({
          fromSessionId: sessionId,
          toSessionId: peerId,
          message: JSON.stringify({
            type: "offer",
            offer,
          }),
        });

        await peer.sendFile(file);
        console.log("File sent successfully");
      } catch (error) {
        console.error("Error initiating transfer:", error);
        throw error;
      }
    },
    [createPeerConnection, sessionId, sendSignaling]
  );

  const closePeerConnection = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.close();
      peersRef.current.delete(peerId);
    }
  }, []);

  return {
    sendFile,
    handleSignalingMessage,
    closePeerConnection,
  };
}
