type MessageHandler = (message: any) => void;
type EventHandler = () => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;

  private messageHandlers: MessageHandler[] = [];
  private openHandlers: EventHandler[] = [];
  private closeHandlers: EventHandler[] = [];
  private errorHandlers: Array<(error: Error) => void> = [];

  private url: string = '';
  private playerId: string = '';

  connect(url: string, playerId: string): Promise<void> {
    this.url = url;
    this.playerId = playerId;
    this.isManualDisconnect = false; // 연결 시작 시 플래그 초기화

    return new Promise((resolve, reject) => {
      try {
        // 기존 연결이 있으면 먼저 정리
        if (this.ws) {
          this.isManualDisconnect = true; // 수동 연결 해제
          this.ws.close();
          this.ws = null;
        }

        console.log('[WebSocketClient] Creating WebSocket connection to:', url);
        this.ws = new WebSocket(url);
        this.isManualDisconnect = false; // 새 연결 시작
        let isResolved = false;
        let isRejected = false;
        
        console.log('[WebSocketClient] WebSocket created, readyState:', this.ws.readyState);

        const timeout = setTimeout(() => {
          if (!isResolved && !isRejected) {
            isRejected = true;
            if (this.ws) {
              this.ws.close();
              this.ws = null;
            }
            reject(new Error('WebSocket connection timeout'));
          }
        }, 3000); // 3초 타임아웃 (더 빠른 실패 확인)

        this.ws.onopen = () => {
          if (isRejected) return;
          clearTimeout(timeout);
          isResolved = true;
          console.log('[WebSocketClient] Connected successfully');
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          this.openHandlers.forEach((handler) => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.messageHandlers.forEach((handler) => handler(message));
          } catch (error) {
            console.error('[WebSocketClient] Failed to parse message', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocketClient] Connection closed', { code: event.code, reason: event.reason });
          this.closeHandlers.forEach((handler) => handler());
          if (!isResolved && !isRejected) {
            // 연결 실패로 인한 close
            clearTimeout(timeout);
            isRejected = true;
            this.ws = null;
            reject(new Error('WebSocket connection closed before opening'));
          } else if (isResolved) {
            // 정상 연결 후 close
            this.ws = null;
            // 자동 재연결 비활성화 (수동으로만 재연결)
            // this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocketClient] Connection error', error);
          console.error('[WebSocketClient] Error details:', {
            type: error.type,
            target: error.target,
            readyState: this.ws?.readyState,
            url: url
          });
          // 에러 핸들러는 호출하되, 크래시 방지를 위해 try-catch 추가
          try {
            this.errorHandlers.forEach((handler) => {
              try {
                handler(new Error('WebSocket error'));
              } catch (e) {
                console.error('[WebSocketClient] Error handler failed', e);
              }
            });
          } catch (e) {
            console.error('[WebSocketClient] Error handling failed', e);
          }
          if (!isResolved && !isRejected) {
            clearTimeout(timeout);
            isRejected = true;
            if (this.ws) {
              try {
                this.ws.close();
              } catch (e) {
                console.error('[WebSocketClient] Close failed', e);
              }
              this.ws = null;
            }
            reject(new Error('WebSocket connection failed'));
          }
        };
      } catch (error) {
        this.ws = null;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManualDisconnect = true; // 수동 연결 해제 플래그 설정
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onOpen(handler: EventHandler): void {
    this.openHandlers.push(handler);
  }

  onClose(handler: EventHandler): void {
    this.closeHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  isConnected(): boolean {
    if (!this.ws) {
      return false;
    }
    // WebSocket.OPEN = 1
    const readyState = this.ws.readyState;
    const isOpen = readyState === WebSocket.OPEN;
    
    // CLOSED(3) 또는 CLOSING(2) 상태면 연결이 끊어진 것
    if (readyState === WebSocket.CLOSED || readyState === WebSocket.CLOSING) {
      console.log('[WebSocketClient] Connection is closed/closing, clearing ws');
      this.ws = null;
      return false;
    }
    
    // CONNECTING(0) 상태면 아직 연결 중
    if (readyState === WebSocket.CONNECTING) {
      console.log('[WebSocketClient] Connection is still connecting');
      return false;
    }
    
    return isOpen;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url, this.playerId).catch((error) => {
        console.error('Reconnection failed', error);
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }
}
