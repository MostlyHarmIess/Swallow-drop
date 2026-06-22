/**
 * WebRTC Peer Connection Manager
 * Handles P2P connections and file transfers
 */

export class PeerConnection {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private fileChunks: Uint8Array[] = [];
  private currentFile: { name: string; size: number } | null = null;
  private onFileReceived?: (file: File) => void;
  private channelReadyPromise: Promise<void>;
  private resolveChannelReady?: () => void;
  private onMessage: (message: SignalingMessage) => Promise<void>;

  constructor(
    onMessage: (message: SignalingMessage) => Promise<void>,
    onFileReceived?: (file: File) => void,
  ) {
    this.onMessage = onMessage;
    this.onFileReceived = onFileReceived;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    this.channelReadyPromise = new Promise((resolve) => {
      this.resolveChannelReady = resolve;
    });

    this.setupPeerEvents();
  }

  private setupPeerEvents() {
    // Handle ICE candidates for NAT traversal
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onMessage({
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
        }).catch(console.error);
      }
    };

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelEvents();
    };

    this.pc.onconnectionstatechange = () => {
      console.log("WebRTC connection state:", this.pc.connectionState);
    };
  }

  private setupDataChannelEvents() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("Data channel opened - ready to transfer files");
      this.resolveChannelReady?.();
    };

    this.dataChannel.onmessage = (event) => {
      // Handle metadata messages
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "file-start") {
          this.currentFile = { name: msg.name, size: msg.size };
          this.fileChunks = [];
        } else if (msg.type === "file-end") {
          this.reconstructFile();
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.fileChunks.push(new Uint8Array(event.data));
      }
    };

    this.dataChannel.onerror = (event) => {
      console.error("Data channel error:", event);
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel closed");
    };
  }

  async createOffer() {
    if (!this.dataChannel) {
      this.dataChannel = this.pc.createDataChannel("file-transfer", {
        ordered: true,
      });
      this.setupDataChannelEvents();
    }

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: any) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  private async waitForChannelOpen() {
    if (!this.dataChannel || this.dataChannel.readyState === "open") {
      return;
    }
    await this.channelReadyPromise;
  }

  async sendFile(file: File) {
    await this.waitForChannelOpen();

    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      throw new Error("Data channel not open");
    }

    this.dataChannel.send(
      JSON.stringify({
        type: "file-start",
        name: file.name,
        size: file.size,
      }),
    );

    const chunkSize = 64 * 1024;
    const buffer = await file.arrayBuffer();
    const view = new Uint8Array(buffer);

    for (let i = 0; i < view.length; i += chunkSize) {
      const chunk = view.slice(i, i + chunkSize);
      this.dataChannel.send(chunk);
    }

    this.dataChannel.send(JSON.stringify({ type: "file-end" }));
  }

  private reconstructFile() {
    if (!this.currentFile || this.fileChunks.length === 0) return;

    const data = new Uint8Array(this.currentFile.size);
    let offset = 0;

    for (const chunk of this.fileChunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    const blob = new Blob([data]);
    const file = new File([blob], this.currentFile.name);

    if (this.onFileReceived) {
      this.onFileReceived(file);
    }

    this.fileChunks = [];
    this.currentFile = null;
  }

  async close() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    this.pc.close();
  }

  getConnectionState() {
    return this.pc.connectionState;
  }
}

export type SignalingMessage =
  | { type: "offer"; offer: RTCSessionDescriptionInit }
  | { type: "answer"; answer: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; candidate: any };
