# 베이스캠프 공유 - 서버 패치 가이드

**모든 플레이어(경찰/도둑)가 동일한 베이스캠프·자기장을 보려면 서버에서 아래 로직을 추가해야 합니다.**

## 클라이언트에서 이미 하는 일

- BATTLE 모드 게임 시작 시 `game:start` 요청에 `payload.basecamp: { lat, lng }` 포함
- `game:state`의 `data.basecamp`를 수신하면 그 좌표를 베이스캠프·자기장 중심으로 사용

## 서버에서 추가할 처리

### 1. 방(room)에 basecamp 필드 추가

```js
// 예: room 객체에 basecamp 필드
room.basecamp = null;  // { lat, lng } | null
```

### 2. game:start 핸들러 수정

```js
// game:start 메시지 수신 시
function handleGameStart(message) {
  const { playerId, roomId, payload } = message;
  const room = getRoom(roomId);
  if (!room) return;

  // BATTLE 모드일 때 payload.basecamp 저장
  if (payload?.basecamp && typeof payload.basecamp.lat === 'number' && typeof payload.basecamp.lng === 'number') {
    room.basecamp = { lat: payload.basecamp.lat, lng: payload.basecamp.lng };
  }

  // 게임 시작 처리 (status -> HIDING, phaseEndsAt 설정 등)
  room.status = 'HIDING';
  // ...

  // game:state 브로드캐스트 시 basecamp 포함
  broadcastToRoom(roomId, {
    type: 'game:state',
    data: {
      status: room.status,
      settings: room.settings,
      basecamp: room.basecamp,  // ★ 이 필드가 필수
      phaseEndsAt: room.phaseEndsAt,
      players: room.players,
    },
  });
}
```

### 3. game:state를 보내는 모든 곳에 basecamp 포함

게임 상태를 방에 브로드캐스트할 때마다 `data.basecamp`를 넣어야 합니다.

```js
// 예시: 방 전체에 game:state 전송할 때
function broadcastGameState(roomId) {
  const room = getRoom(roomId);
  const payload = {
    type: 'game:state',
    data: {
      status: room.status,
      settings: room.settings,
      basecamp: room.basecamp ?? null,  // BATTLE 모드면 방장의 첫 위치
      phaseEndsAt: room.phaseEndsAt,
      players: room.players,
    },
  };
  room.clients.forEach(client => client.send(JSON.stringify(payload)));
}
```

### 4. 방 생성/재접속 시

- 방을 새로 만들 때: `room.basecamp = null`
- 게임이 시작되기 전까지는 `basecamp`를 사용하지 않음
- 게임 시작 시점에 `game:start`의 `payload.basecamp`로 한 번 설정

## 요약

| 시점 | 서버 처리 |
|------|-----------|
| `game:start` 수신 | `payload.basecamp`가 있으면 `room.basecamp`에 저장 |
| `game:state` 전송 | `data.basecamp`에 `room.basecamp` 포함 |
| 방 생성 | `room.basecamp = null` |
| 게임 종료/방 리셋 | `room.basecamp = null` |

이렇게 하면 모든 클라이언트가 동일한 `basecamp` 좌표를 받아 같은 위치에 베이스캠프와 자기장을 그립니다.

---

## 대안: basecamp:set 별도 메시지

`game:state` 구조를 바꾸기 어렵다면, `game:start` 수신 후 방 전체에 `basecamp:set` 메시지를 별도로 보낼 수 있습니다.

```js
// game:start 핸들러 내에서
if (payload?.basecamp && typeof payload.basecamp.lat === 'number') {
  broadcastToRoom(roomId, {
    type: 'basecamp:set',
    data: { basecamp: payload.basecamp },
  });
}
```

클라이언트는 `basecamp:set` 및 `basecamp:broadcast` 메시지를 처리합니다.
