# SwallowDrop

A peer-to-peer file sharing app for friends and family. Drop files into a shared space, let others claim and download them directly. No accounts, no cloud storage, no file size limits imposed by the app.

## How it works

1. Open the site and enter your name.
2. You'll land on a shared dashboard showing everyone who is currently online
3. Drag a file (or tap a slot on mobile) to drop it into one of the 16 slots
4. Anyone else online can see your file and claim it
5. Claiming triggers a direct browser-to-browser transfer via WebRTC
6. The file downloads automatically on the receiver's end
7. Your file stays in its slot until you cancel it or you go offline

No files are stored on any server. The only data that passes through the backend is signaling information used to establish the peer connection.

## Tech stack

- **React + TypeScript** - frontend
- **Convex** - real-time backend for presence, signaling, and drop state
- **WebRTC** - direct browser-to-browser file transfer
- **Tailwind CSS** - styling
- **Self-hosted** - runs on a Raspberry Pi via PM2, exposed via Cloudflare Tunnel

## Features

- Bento-grid drop zone with 16 slots
- Real-time presence, see who's online
- Transfer history
- Mobile support, tap to upload
- No authentication, name stored in localStorage per session
- Files are automatically removed when the owner goes offline
- Cancel your own drops at any time

## Network behaviour

SwallowDrop uses WebRTC for transfers. Connection quality depends on the network:

| Scenario | Expected speed |
|---|---|
| Same network | 20–50 MB/s |
| Different networks (home broadband) | 1–2.5 MB/s |
| Relayed via TURN | 0.1–0.6 MB/s |

Transfers between peers on the same network are fully local. For cross-network transfers, a STUN server is used to attempt a direct connection. If that fails (e.g. mobile data, restrictive NAT), a TURN relay is required.

## Getting Started

### Prerequisites
- Node.js 18+
- A free [Convex](https://convex.dev) account

### Setup

```bash
# Clone the repo
git clone https://github.com/MostlyHarmIess/Swallow-drop.git
cd swallowdrop

# Install dependencies
npm install

# Set up Convex (follow the prompts to link your project)
npx convex dev
```

In a separate terminal:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Limitations

- Transfers require both sender and receiver to be online simultaneously
- If the sender closes their tab mid-transfer, the transfer will fail
- TURN relay is required for reliable cross-network transfers (e.g. mobile data)
- No file persistence, drops are tied to the sender's session
