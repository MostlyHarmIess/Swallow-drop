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

  constructor(onMessage: (message: SignalingMessage) => Promise<void>, onFileReceived?: (file: File) => void) {
    this.onMessage = onMessage;
    this.onFileReceived = onFileReceived;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: `turn:${import.meta.env.VITE_TURN_HOST}:80`,
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_CREDENTIAL,
        },
        {
          urls: `turn:${import.meta.env.VITE_TURN_HOST}:443`,
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_CREDENTIAL,
        },
        {
          urls: `turns:${import.meta.env.VITE_TURN_HOST}:443`,
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_CREDENTIAL,
        },
      ],
    });

    this.channelReadyPromise = new Promise(resolve => {
      this.resolveChannelReady = resolve;
    });

    this.setupPeerEvents();
  }

  private setupPeerEvents() {
    // Handle ICE candidates for NAT traversal
    this.pc.onicecandidate = event => {
      if (event.candidate) {
        this.onMessage({
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
        }).catch(console.error);
      } else {
        console.log("ICE gathering complete — no more candidates");
      }
    };

    this.pc.onicecandidateerror = event => {
      console.warn("ICE candidate error:", event.errorCode, event.errorText, event.url);
    };

    this.pc.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", this.pc.iceGatheringState);
    };

    this.pc.ondatachannel = event => {
      this.dataChannel = event.channel;
      this.setupDataChannelEvents();
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      switch (state) {
        case "connected":
          console.log("WebRTC connected");
          break;
        case "disconnected":
          console.warn("WebRTC disconnected — peer may have gone offline");
          break;
        case "failed":
          console.error("WebRTC failed — no viable path between peers, TURN may be required");
          break;
        case "closed":
          console.log("WebRTC connection closed");
          break;
        default:
          console.log("WebRTC connection state:", state);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      switch (state) {
        case "connected":
        case "completed":
          console.log("ICE connected");
          break;
        case "disconnected":
          console.warn("ICE disconnected — attempting to reconnect...");
          break;
        case "failed":
          console.error("ICE failed — no viable network path found between peers");
          break;
        case "closed":
          console.log("ICE closed");
          break;
        default:
          console.log("ICE connection state:", state);
      }
    };
  }

  private setupDataChannelEvents() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("Data channel opened - ready to transfer files");
      this.resolveChannelReady?.();
    };

    this.dataChannel.onmessage = event => {
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

    this.dataChannel.onerror = event => {
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
    if (this.dataChannel?.readyState === "open") return;

    await Promise.race([
      this.channelReadyPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Channel open timeout")), 30000)),
    ]);
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
      })
    );

    const chunkSize = 64 * 1024;
    const buffer = await file.arrayBuffer();
    const view = new Uint8Array(buffer);

    for (let i = 0; i < view.length; i += chunkSize) {
      while (this.dataChannel.bufferedAmount > 16 * 1024 * 1024) {
        await new Promise(r => setTimeout(r, 50));
      }
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
