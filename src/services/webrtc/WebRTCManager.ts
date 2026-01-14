import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

const RTC_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

type SignalSender = (targetId: string | 'broadcast', signal: any) => void;

export class WebRTCManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private sendSignal: SignalSender | null = null;
  private isTransmitting = false;

  async initialize(sendSignal: SignalSender): Promise<void> {
    this.sendSignal = sendSignal;

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      this.localStream = stream;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      InCallManager.start({ media: 'audio', ringback: '' });
      InCallManager.setForceSpeakerphoneOn(true);

      console.log('WebRTC initialized');
    } catch (error) {
      console.error('Failed to initialize WebRTC', error);
      throw error;
    }
  }

  createPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIGURATION);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.sendSignal) {
        this.sendSignal(peerId, {
          type: 'ice',
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from', peerId);
    };

    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeerConnection(peerId);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  async createOffer(peerId: string): Promise<RTCSessionDescription> {
    const pc = this.createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (this.sendSignal) {
      this.sendSignal(peerId, {
        type: 'offer',
        sdp: offer.sdp
      });
    }

    return offer;
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.createPeerConnection(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (this.sendSignal) {
      this.sendSignal(peerId, {
        type: 'answer',
        sdp: answer.sdp
      });
    }
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(peerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  startTransmitting(): void {
    if (this.isTransmitting || !this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    this.isTransmitting = true;
    console.log('Started transmitting');
  }

  stopTransmitting(): void {
    if (!this.isTransmitting || !this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    this.isTransmitting = false;
    console.log('Stopped transmitting');
  }

  closePeerConnection(peerId: string): void {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
      console.log('Closed peer connection', peerId);
    }
  }

  cleanup(): void {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    InCallManager.stop();
    console.log('WebRTC cleanup complete');
  }

  connectToThieves(thiefIds: string[]): void {
    thiefIds.forEach((thiefId) => {
      this.createOffer(thiefId);
    });
  }
}
