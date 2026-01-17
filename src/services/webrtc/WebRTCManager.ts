import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream } from 'react-native-webrtc';
import { Platform, PermissionsAndroid } from 'react-native';

// InCallManager는 선택적 사용 (없어도 작동)
let InCallManager: any = null;
try {
  InCallManager = require('react-native-incall-manager').default;
} catch (e) {
  console.warn('[WebRTCManager] react-native-incall-manager not available, continuing without it');
}

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
  private remoteStreams: Map<string, MediaStream> = new Map();
  private sendSignal: SignalSender | null = null;
  private isTransmitting = false;

  private attachLocalStreamToPeer(peerId: string, pc: RTCPeerConnection): void {
    if (!this.localStream) return;
    // 이미 트랙이 붙어있는지 확인
    const existingTrackIds = pc.getSenders().map(sender => sender.track?.id).filter(Boolean);
    this.localStream.getTracks().forEach((track) => {
      if (!existingTrackIds.includes(track.id)) {
        pc.addTrack(track, this.localStream!);
      }
    });
  }

  async initialize(sendSignal: SignalSender): Promise<void> {
    this.sendSignal = sendSignal;

    // Android에서 마이크 권한 요청
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '마이크 권한',
            message: '도둑 팀 무전을 위해 마이크 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '취소',
            buttonPositive: '허용',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('마이크 권한이 거부되었습니다');
        }
      } catch (err) {
        console.error('[WebRTCManager] 마이크 권한 요청 실패:', err);
        throw err;
      }
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      this.localStream = stream;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      // 이미 만들어진 피어에 로컬 트랙을 추가 (초기화 타이밍 이슈 대응)
      this.peers.forEach((pc, peerId) => {
        this.attachLocalStreamToPeer(peerId, pc);
      });

      if (InCallManager) {
        try {
          InCallManager.start({ media: 'audio', ringback: '' });
          InCallManager.setForceSpeakerphoneOn(true);
        } catch (e) {
          console.warn('[WebRTCManager] InCallManager setup failed', e);
        }
      }

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

    this.attachLocalStreamToPeer(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.sendSignal) {
        this.sendSignal(peerId, {
          type: 'ice',
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (stream) {
        this.remoteStreams.set(peerId, stream);
      }
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
    this.remoteStreams.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (InCallManager) {
      try {
        InCallManager.stop();
      } catch (e) {
        console.warn('[WebRTCManager] InCallManager.stop failed', e);
      }
    }
    console.log('WebRTC cleanup complete');
  }

  connectToThieves(thiefIds: string[]): void {
    thiefIds.forEach((thiefId) => {
      this.createOffer(thiefId);
    });
  }
}
