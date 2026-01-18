import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream } from 'react-native-webrtc';
import { Platform, PermissionsAndroid } from 'react-native';
import { getIceServers } from '../../config/pntConfig';

// InCallManager는 선택적 사용 (없어도 작동)
let InCallManager: any = null;
try {
  InCallManager = require('react-native-incall-manager').default;
} catch (e) {
  console.warn('[WebRTCManager] react-native-incall-manager not available, continuing without it');
}

type SignalSender = (targetId: string | 'broadcast', signal: any) => void;

export class WebRTCManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private sendSignal: SignalSender | null = null;
  private isTransmitting = false;
  private logPrefix = '[WebRTC]';
  private getCandidateType(candidate?: string): string | null {
    if (!candidate) return null;
    const match = candidate.match(/\btyp\s+(\w+)\b/);
    return match?.[1] ?? null; // host | srflx | relay | prflx
  }

  private setAudioSending(enabled: boolean): void {
    // 로컬 스트림 트랙 토글
    const localTracks = this.localStream?.getAudioTracks() || [];
    console.log(`${this.logPrefix} setAudioSending`, {
      enabled,
      localTracks: localTracks.length,
      peers: this.peers.size,
    });
    localTracks.forEach((track) => {
      track.enabled = enabled;
    });
    // 각 PeerConnection의 sender 트랙도 함께 토글
    this.peers.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = enabled;
        }
      });
    });
  }

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
    console.log(`${this.logPrefix} initialize start`);

    // Android에서 마이크 권한 요청
    if (Platform.OS === 'android') {
      try {
        console.log(`${this.logPrefix} request mic permission`);
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
        console.log(`${this.logPrefix} mic permission granted`);
      } catch (err) {
        console.error('[WebRTCManager] 마이크 권한 요청 실패:', err);
        throw err;
      }
    }

    try {
      console.log(`${this.logPrefix} getUserMedia start`);
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,  // 에코 제거 비활성화로 볼륨 증폭
          noiseSuppression: false,  // 노이즈 제거 비활성화로 볼륨 증폭
          autoGainControl: false,   // 자동 게인 제어 비활성화로 최대 볼륨
          sampleRate: 48000,        // 높은 샘플레이트
        },
        video: false
      });

      this.localStream = stream;
      console.log(`${this.logPrefix} getUserMedia success`, {
        audioTracks: stream.getAudioTracks().length,
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      // 이미 만들어진 피어에 로컬 트랙을 추가 (초기화 타이밍 이슈 대응)
      this.peers.forEach((pc, peerId) => {
        this.attachLocalStreamToPeer(peerId, pc);
      });

      if (InCallManager) {
        try {
          console.log(`${this.logPrefix} InCallManager.start with max volume`);
          InCallManager.start({ media: 'audio', ringback: '' });
          InCallManager.setForceSpeakerphoneOn(true);  // 스피커폰 강제 활성화
          InCallManager.setSpeakerphoneOn(true);       // 스피커 모드
          // Android/iOS 볼륨 최대로
          if (Platform.OS === 'android') {
            InCallManager.setRingbackVolume(1.0);
          }
        } catch (e) {
          console.warn('[WebRTCManager] InCallManager setup failed', e);
        }
      }

      console.log(`${this.logPrefix} initialized`);
    } catch (error) {
      console.error('Failed to initialize WebRTC', error);
      throw error;
    }
  }

  createPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    const iceServers = getIceServers();
    console.log(`${this.logPrefix} createPeerConnection`, {
      peerId,
      iceServers: iceServers.map(s => ({
        urls: Array.isArray(s.urls) ? s.urls : [s.urls],
        hasUsername: !!s.username,
        hasCredential: !!s.credential,
      })),
    });
    const pc = new RTCPeerConnection({ iceServers });

    this.attachLocalStreamToPeer(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.sendSignal) {
        console.log(`${this.logPrefix} ice candidate`, {
          peerId,
          type: this.getCandidateType(event.candidate.candidate),
        });
        this.sendSignal(peerId, {
          type: 'ice',
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`${this.logPrefix} ontrack event`, {
        peerId,
        streams: event.streams?.length || 0,
        trackKind: event.track?.kind,
        trackId: event.track?.id,
      });
      const stream = event.streams?.[0];
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        console.log(`${this.logPrefix} ontrack stream`, {
          peerId,
          audioTracks: audioTracks.length,
          trackIds: audioTracks.map(t => t.id),
        });
        audioTracks.forEach((track) => {
          track.enabled = true;
          console.log(`${this.logPrefix} enabled remote audio track`, {
            peerId,
            trackId: track.id,
            enabled: track.enabled,
            readyState: track.readyState,
          });
        });
        this.remoteStreams.set(peerId, stream);
        console.log(`${this.logPrefix} ✅ Remote stream saved for`, peerId);
      } else if (event.track && event.track.kind === 'audio') {
        event.track.enabled = true;
        console.log(`${this.logPrefix} ontrack single audio`, {
          peerId,
          trackId: event.track.id,
          enabled: event.track.enabled,
        });
      }
    };

    // RN-webrtc 구버전 호환: onaddstream
    pc.onaddstream = (event: any) => {
      const stream: MediaStream | undefined = event?.stream;
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        this.remoteStreams.set(peerId, stream);
        console.log(`${this.logPrefix} onaddstream`, {
          peerId,
          audioTracks: stream.getAudioTracks().length,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`${this.logPrefix} connectionState`, {
        peerId,
        state: pc.connectionState,
      });
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.warn(`${this.logPrefix} connection failed/disconnected for`, peerId);
        this.closePeerConnection(peerId);
      } else if (pc.connectionState === 'connected') {
        console.log(`${this.logPrefix} ✅ Peer connection established:`, peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`${this.logPrefix} iceConnectionState`, {
        peerId,
        state: pc.iceConnectionState,
      });
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log(`${this.logPrefix} ✅ ICE connection established:`, peerId);
      } else if (pc.iceConnectionState === 'failed') {
        console.warn(`${this.logPrefix} ❌ ICE connection failed:`, peerId);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  async createOffer(peerId: string): Promise<RTCSessionDescription> {
    const pc = this.createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log(`${this.logPrefix} createOffer`, peerId);

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
    console.log(`${this.logPrefix} handleOffer`, peerId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log(`${this.logPrefix} created answer for`, peerId);

    if (this.sendSignal) {
      this.sendSignal(peerId, {
        type: 'answer',
        sdp: answer.sdp
      });
      console.log(`${this.logPrefix} sent answer to`, peerId);
    } else {
      console.warn(`${this.logPrefix} sendSignal not available, cannot send answer`);
    }
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`${this.logPrefix} handleAnswer`, peerId);
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(peerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`${this.logPrefix} handleIceCandidate`, peerId);
    }
  }

  startTransmitting(): void {
    if (this.isTransmitting || !this.localStream) return;

    this.setAudioSending(true);

    this.isTransmitting = true;
    console.log(`${this.logPrefix} startTransmitting`);
  }

  stopTransmitting(): void {
    if (!this.isTransmitting || !this.localStream) return;

    this.setAudioSending(false);

    this.isTransmitting = false;
    console.log(`${this.logPrefix} stopTransmitting`);
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
