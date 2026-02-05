# BATTLE 모드 - 서버 측 구현 요구사항 (필수)

**모든 플레이어가 동일한 베이스캠프/자기장을 보려면 반드시 서버 수정이 필요합니다.**

BATTLE 모드에서 베이스캠프와 자기장이 **방장(호스트)의 첫 위치**를 중심으로 모든 플레이어에게 동일하게 적용되려면, 서버가 다음을 처리해야 합니다.

## 1. game:start 수신 시

클라이언트(방장)가 `game:start` 요청을 보낼 때, BATTLE 모드이면 `payload.basecamp`에 방장의 현재 위치 `{ lat, lng }`가 포함됩니다.

```json
{
  "type": "game:start",
  "playerId": "...",
  "roomId": "...",
  "payload": {
    "basecamp": { "lat": 37.xxx, "lng": 127.xxx }
  }
}
```

## 2. game:state 브로드캐스트 시

게임 시작 시 모든 클라이언트에게 보내는 `game:state` 메시지에 `basecamp`를 포함해야 합니다.

- BATTLE 모드: `payload.basecamp`를 받아서 `game:state.data.basecamp`로 그대로 전달
- BASIC 모드 또는 basecamp 없음: `basecamp` 필드 생략 (각 클라이언트가 자체 위치 사용)

```json
{
  "type": "game:state",
  "data": {
    "status": "HIDING",
    "settings": { "gameMode": "BATTLE", ... },
    "basecamp": { "lat": 37.xxx, "lng": 127.xxx },
    "phaseEndsAt": ...,
    "players": [...]
  }
}
```

이렇게 하면 BATTLE 모드에서 모든 플레이어가 동일한 베이스캠프 위치와 자기장 영역을 갖게 됩니다.
