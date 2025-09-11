# 🚀 ПОЛНОЕ РУКОВОДСТВО: Создание видео/голосового чата на WebRTC

## 📋 ОГЛАВЛЕНИЕ
1. [Архитектура и принципы работы](#архитектура)
2. [Настройка проекта](#настройка-проекта)
3. [Серверная часть (Node.js + Socket.io)](#серверная-часть)
4. [Клиентская часть (React + WebRTC)](#клиентская-часть)
5. [WebRTC хуки и логика](#webrtc-хуки)
6. [Socket.io интеграция](#socketio-интеграция)
7. [UI компоненты](#ui-компоненты)
8. [Адаптация для голосовой связи](#адаптация-для-голосовой-связи)
9. [Продвинутые возможности](#продвинутые-возможности)
10. [Деплой и оптимизация](#деплой-и-оптимизация)

---

## 🏗 АРХИТЕКТУРА

### Принципы работы WebRTC
WebRTC (Web Real-Time Communication) - это стандарт для P2P коммуникации между браузерами.

**Основные компоненты:**
1. **Signaling Server** - координирует соединения (Socket.io)
2. **STUN/TURN серверы** - помогают проходить NAT
3. **RTCPeerConnection** - основной API для WebRTC
4. **MediaStream** - поток аудио/видео данных

**Процесс установки соединения:**
```
Пользователь A                    Signaling Server                    Пользователь B
     |                                    |                                    |
     |-------- JOIN ROOM ----------------->|                                    |
     |                                    |-------- ADD_PEER ------------------>|
     |                                    |<------- JOIN ROOM ------------------|
     |<------- ADD_PEER ------------------|                                    |
     |                                    |                                    |
     |-------- OFFER (SDP) --------------->|-------- RELAY_SDP ----------------->|
     |<------- ANSWER (SDP) ---------------|<------- RELAY_SDP -----------------|
     |                                    |                                    |
     |-------- ICE Candidates ------------->|-------- RELAY_ICE ----------------->|
     |<------- ICE Candidates -------------|<------- RELAY_ICE -----------------|
     |                                    |                                    |
     |======================= DIRECT P2P CONNECTION =======================|
```

---

## 🛠 НАСТРОЙКА ПРОЕКТА

### 1. Инициализация проекта
```bash
mkdir webrtc-chat
cd webrtc-chat
npm init -y
```

### 2. Установка зависимостей

**Серверные зависимости:**
```bash
npm install express socket.io uuid
npm install --save-dev nodemon
```

**Клиентские зависимости (React):**
```bash
npx create-react-app client
cd client
npm install socket.io-client freeice react-router-dom uuid
```

### 3. Структура проекта
```
webrtc-chat/
├── server.js                 # Express + Socket.io сервер
├── package.json
├── client/                   # React приложение
│   ├── src/
│   │   ├── App.js           # Роутинг
│   │   ├── hooks/
│   │   │   ├── useWebRTC.js        # Основная WebRTC логика
│   │   │   └── useStateWithCallback.js  # Хелпер хук
│   │   ├── socket/
│   │   │   ├── index.js            # Socket.io клиент
│   │   │   └── actions.js          # Константы событий
│   │   ├── pages/
│   │   │   ├── Main/
│   │   │   │   └── index.js        # Главная страница
│   │   │   ├── Room/
│   │   │   │   └── index.js        # Комната чата
│   │   │   └── NotFound404/
│   │   │       └── index.js        # 404 страница
│   │   └── index.js         # Точка входа
│   └── package.json
```

---

## 🌐 СЕРВЕРНАЯ ЧАСТЬ

### server.js - Полная реализация
```javascript
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const { version, validate } = require('uuid');

// Константы событий (синхронизированы с клиентом)
const ACTIONS = {
  JOIN: 'join',
  LEAVE: 'leave',
  SHARE_ROOMS: 'share-rooms',
  ADD_PEER: 'add-peer',
  REMOVE_PEER: 'remove-peer',
  RELAY_SDP: 'relay-sdp',
  RELAY_ICE: 'relay-ice',
  ICE_CANDIDATE: 'ice-candidate',
  SESSION_DESCRIPTION: 'session-description'
};

const PORT = process.env.PORT || 3001;

// Получение активных комнат (только UUID v4)
function getClientRooms() {
  const { rooms } = io.sockets.adapter;
  return Array.from(rooms.keys()).filter(roomID => 
    validate(roomID) && version(roomID) === 4
  );
}

// Отправка списка активных комнат всем клиентам
function shareRoomsInfo() {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms()
  });
}

// Основная Socket.io логика
io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);
  
  // Отправляем список комнат новому пользователю
  shareRoomsInfo();

  // Обработка присоединения к комнате
  socket.on(ACTIONS.JOIN, config => {
    const { room: roomID } = config;
    const { rooms: joinedRooms } = socket;

    // Проверяем, не присоединился ли уже к этой комнате
    if (Array.from(joinedRooms).includes(roomID)) {
      return console.warn(`Already joined to ${roomID}`);
    }

    // Получаем список уже подключенных клиентов в комнате
    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

    // Уведомляем каждого существующего клиента о новом пире
    clients.forEach(clientID => {
      // Говорим существующему клиенту добавить нового пира (без создания offer)
      io.to(clientID).emit(ACTIONS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false
      });

      // Говорим новому клиенту добавить существующего пира (с созданием offer)
      socket.emit(ACTIONS.ADD_PEER, {
        peerID: clientID,
        createOffer: true,
      });
    });

    // Присоединяем сокет к комнате
    socket.join(roomID);
    
    // Обновляем список комнат для всех
    shareRoomsInfo();
  });

  // Функция покидания комнаты
  function leaveRoom() {
    const { rooms } = socket;

    Array.from(rooms)
      // Покидаем только клиентские комнаты (UUID v4)
      .filter(roomID => validate(roomID) && version(roomID) === 4)
      .forEach(roomID => {
        // Получаем всех клиентов в комнате
        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

        // Уведомляем всех о том, что пир покидает комнату
        clients.forEach(clientID => {
          io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
            peerID: socket.id,
          });

          socket.emit(ACTIONS.REMOVE_PEER, {
            peerID: clientID,
          });
        });

        // Покидаем комнату
        socket.leave(roomID);
      });

    // Обновляем список комнат
    shareRoomsInfo();
  }

  // Обработчики событий покидания
  socket.on(ACTIONS.LEAVE, leaveRoom);
  socket.on('disconnecting', leaveRoom);

  // Ретрансляция SDP (Session Description Protocol)
  socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
    io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    });
  });

  // Ретрансляция ICE кандидатов
  socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
    io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Статические файлы (после сборки React)
const publicPath = path.join(__dirname, 'build');
app.use(express.static(publicPath));

// Обработка всех маршрутов (для React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}!`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});
```

---

## ⚛️ КЛИЕНТСКАЯ ЧАСТЬ

### 1. Socket.io клиент
**src/socket/actions.js**
```javascript
const ACTIONS = {
  JOIN: 'join',
  LEAVE: 'leave',
  SHARE_ROOMS: 'share-rooms',
  ADD_PEER: 'add-peer',
  REMOVE_PEER: 'remove-peer',
  RELAY_SDP: 'relay-sdp',
  RELAY_ICE: 'relay-ice',
  ICE_CANDIDATE: 'ice-candidate',
  SESSION_DESCRIPTION: 'session-description'
};

export default ACTIONS;
```

**src/socket/index.js**
```javascript
import { io } from 'socket.io-client';

const options = {
  "force new connection": true,
  reconnectionAttempts: "Infinity", // Автоматическое переподключение
  timeout: 10000, // Таймаут соединения
  transports: ["websocket"] // Только WebSocket транспорт
};

// Подключение к серверу (автоматически определяет хост)
const socket = io('/', options);

export default socket;
```

### 2. Главный компонент приложения
**src/App.js**
```javascript
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import Room from './pages/Room';
import Main from './pages/Main';
import NotFound404 from './pages/NotFound404';

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path='/room/:id' component={Room} />
        <Route exact path='/' component={Main} />
        <Route component={NotFound404} />
      </Switch>
    </BrowserRouter>
  );
}

export default App;
```

### 3. Главная страница (список комнат)
**src/pages/Main/index.js**
```javascript
import { useState, useEffect, useRef } from 'react';
import socket from '../../socket';
import ACTIONS from '../../socket/actions';
import { useHistory } from 'react-router';
import { v4 } from 'uuid';

export default function Main() {
  const history = useHistory();
  const [rooms, updateRooms] = useState([]);
  const rootNode = useRef();

  useEffect(() => {
    // Слушаем обновления списка комнат
    socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
      if (rootNode.current) {
        updateRooms(rooms);
      }
    });

    // Cleanup
    return () => {
      socket.off(ACTIONS.SHARE_ROOMS);
    };
  }, []);

  return (
    <div ref={rootNode} style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎥 Available Video Chat Rooms</h1>
      
      {rooms.length === 0 ? (
        <p>No active rooms. Create a new one!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rooms.map(roomID => (
            <li key={roomID} style={{ 
              margin: '10px 0', 
              padding: '10px', 
              border: '1px solid #ccc', 
              borderRadius: '5px' 
            }}>
              <strong>Room ID:</strong> {roomID}
              <button 
                onClick={() => history.push(`/room/${roomID}`)}
                style={{ 
                  marginLeft: '10px', 
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                📞 JOIN ROOM
              </button>
            </li>
          ))}
        </ul>
      )}

      <button 
        onClick={() => history.push(`/room/${v4()}`)}
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        ➕ Create New Room
      </button>
    </div>
  );
}
```

---

## 🎯 WEBRTC ХУКИ

### 1. Хелпер хук для состояния с колбэком
**src/hooks/useStateWithCallback.js**
```javascript
import { useState, useCallback, useRef, useEffect } from 'react';

// Хук для setState с колбэком (как в классовых компонентах)
const useStateWithCallback = initialState => {
  const [state, setState] = useState(initialState);
  const cbRef = useRef(null);

  const updateState = useCallback((newState, cb) => {
    cbRef.current = cb;
    setState(prev => typeof newState === 'function' ? newState(prev) : newState);
  }, []);

  useEffect(() => {
    if (cbRef.current) {
      cbRef.current(state);
      cbRef.current = null;
    }
  }, [state]);

  return [state, updateState];
};

export default useStateWithCallback;
```

### 2. Основной WebRTC хук
**src/hooks/useWebRTC.js**
```javascript
import { useEffect, useRef, useCallback } from 'react';
import freeice from 'freeice';
import useStateWithCallback from './useStateWithCallback';
import socket from '../socket';
import ACTIONS from '../socket/actions';

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export default function useWebRTC(roomID) {
  const [clients, updateClients] = useStateWithCallback([]);

  // Функция добавления нового клиента
  const addNewClient = useCallback((newClient, cb) => {
    updateClients(list => {
      if (!list.includes(newClient)) {
        return [...list, newClient];
      }
      return list;
    }, cb);
  }, [updateClients]);

  // Refs для хранения соединений и медиа элементов
  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

  // Обработка нового пира
  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      if (peerID in peerConnections.current) {
        return console.warn(`Already connected to peer ${peerID}`);
      }

      // Создание нового RTCPeerConnection
      peerConnections.current[peerID] = new RTCPeerConnection({
        iceServers: freeice(), // Бесплатные STUN серверы
      });

      // Обработчик ICE кандидатов
      peerConnections.current[peerID].onicecandidate = event => {
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;
      // Обработчик получения удаленного потока
      peerConnections.current[peerID].ontrack = ({ streams: [remoteStream] }) => {
        tracksNumber++;

        // Ждем получения и аудио и видео треков
        if (tracksNumber === 2) { // video & audio tracks received
          tracksNumber = 0;
          addNewClient(peerID, () => {
            // Устанавливаем поток в видео элемент
            if (peerMediaElements.current[peerID]) {
              peerMediaElements.current[peerID].srcObject = remoteStream;
            } else {
              // Фикс для случая долгого рендера при многих клиентах
              let settled = false;
              const interval = setInterval(() => {
                if (peerMediaElements.current[peerID]) {
                  peerMediaElements.current[peerID].srcObject = remoteStream;
                  settled = true;
                }
                if (settled) {
                  clearInterval(interval);
                }
              }, 1000);
            }
          });
        }
      };

      // Добавляем локальные треки к соединению
      localMediaStream.current.getTracks().forEach(track => {
        peerConnections.current[peerID].addTrack(track, localMediaStream.current);
      });

      // Создаем offer если нужно
      if (createOffer) {
        const offer = await peerConnections.current[peerID].createOffer();
        await peerConnections.current[peerID].setLocalDescription(offer);

        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: offer,
        });
      }
    }

    socket.on(ACTIONS.ADD_PEER, handleNewPeer);

    return () => {
      socket.off(ACTIONS.ADD_PEER);
    };
  }, [addNewClient]);

  // Обработка session description
  useEffect(() => {
    async function setRemoteMedia({ peerID, sessionDescription: remoteDescription }) {
      await peerConnections.current[peerID]?.setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );

      // Если получили offer, создаем answer
      if (remoteDescription.type === 'offer') {
        const answer = await peerConnections.current[peerID].createAnswer();
        await peerConnections.current[peerID].setLocalDescription(answer);

        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: answer,
        });
      }
    }

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);

    return () => {
      socket.off(ACTIONS.SESSION_DESCRIPTION);
    };
  }, []);

  // Обработка ICE кандидатов
  useEffect(() => {
    socket.on(ACTIONS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
      peerConnections.current[peerID]?.addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });

    return () => {
      socket.off(ACTIONS.ICE_CANDIDATE);
    };
  }, []);

  // Обработка удаления пира
  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
      }

      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];

      updateClients(list => list.filter(c => c !== peerID));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

    return () => {
      socket.off(ACTIONS.REMOVE_PEER);
    };
  }, [updateClients]);

  // Инициализация медиа потока и присоединение к комнате
  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        }
      });

      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
        if (localVideoElement) {
          localVideoElement.volume = 0; // Отключаем звук для локального видео
          localVideoElement.srcObject = localMediaStream.current;
        }
      });
    }

    startCapture()
      .then(() => socket.emit(ACTIONS.JOIN, { room: roomID }))
      .catch(e => console.error('Error getting userMedia:', e));

    return () => {
      // Останавливаем все треки при размонтировании
      localMediaStream.current?.getTracks().forEach(track => track.stop());
      socket.emit(ACTIONS.LEAVE);
    };
  }, [roomID, addNewClient]);

  // Функция для предоставления ссылки на медиа элемент
  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return {
    clients,
    provideMediaRef
  };
}
```

### 3. Компонент комнаты
**src/pages/Room/index.js**
```javascript
import { useParams } from 'react-router';
import useWebRTC, { LOCAL_VIDEO } from '../../hooks/useWebRTC';

// Функция для автоматической раскладки видео
function layout(clientsNumber = 1) {
  const pairs = Array.from({ length: clientsNumber })
    .reduce((acc, next, index, arr) => {
      if (index % 2 === 0) {
        acc.push(arr.slice(index, index + 2));
      }
      return acc;
    }, []);

  const rowsNumber = pairs.length;
  const height = `${100 / rowsNumber}%`;

  return pairs.map((row, index, arr) => {
    // Если последний ряд и только один элемент - растягиваем на всю ширину
    if (index === arr.length - 1 && row.length === 1) {
      return [{
        width: '100%',
        height,
      }];
    }

    // Иначе делим пополам
    return row.map(() => ({
      width: '50%',
      height,
    }));
  }).flat();
}

export default function Room() {
  const { id: roomID } = useParams();
  const { clients, provideMediaRef } = useWebRTC(roomID);
  const videoLayout = layout(clients.length);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      height: '100vh',
      backgroundColor: '#1a1a1a',
    }}>
      {clients.map((clientID, index) => {
        return (
          <div 
            key={clientID} 
            style={{
              ...videoLayout[index],
              position: 'relative',
              border: '2px solid #333',
            }} 
            id={clientID}
          >
            <video
              width='100%'
              height='100%'
              ref={instance => {
                provideMediaRef(clientID, instance);
              }}
              autoPlay
              playsInline
              muted={clientID === LOCAL_VIDEO} // Мутим только локальное видео
              style={{
                objectFit: 'cover',
                backgroundColor: '#000',
              }}
            />
            {/* Индикатор локального видео */}
            {clientID === LOCAL_VIDEO && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '15px',
                fontSize: '12px',
              }}>
                You
              </div>
            )}
          </div>
        );
      })}
      
      {/* Показываем ID комнаты */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '14px',
      }}>
        Room ID: {roomID}
      </div>
    </div>
  );
}
```

---

## 🎤 АДАПТАЦИЯ ДЛЯ ГОЛОСОВОЙ СВЯЗИ

### Изменения в useWebRTC.js для аудио-чата
```javascript
// В функции startCapture() изменяем параметры getUserMedia
async function startCapture() {
  localMediaStream.current = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,        // Подавление эха
      noiseSuppression: true,        // Подавление шума
      autoGainControl: true,         // Автоматическая регулировка усиления
      sampleRate: 44100,            // Частота дискретизации
      channelCount: 2,              // Стерео
    },
    video: false  // Отключаем видео для голосовой связи
  });

  addNewClient(LOCAL_VIDEO, () => {
    const localAudioElement = peerMediaElements.current[LOCAL_VIDEO];
    if (localAudioElement) {
      localAudioElement.volume = 0; // Отключаем звук для локального аудио
      localAudioElement.srcObject = localMediaStream.current;
    }
  });
}
```

### Компонент для аудио-чата
**src/pages/AudioRoom/index.js**
```javascript
import { useParams } from 'react-router';
import { useState, useEffect } from 'react';
import useWebRTC, { LOCAL_VIDEO } from '../../hooks/useWebRTC';

export default function AudioRoom() {
  const { id: roomID } = useParams();
  const { clients, provideMediaRef } = useWebRTC(roomID);
  const [muted, setMuted] = useState(false);
  const [volumes, setVolumes] = useState({});

  // Функция для переключения микрофона
  const toggleMute = () => {
    const audioTrack = localMediaStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
    }}>
      <h1>🎤 Audio Chat Room</h1>
      <p>Room ID: {roomID}</p>
      
      {/* Список участников */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        margin: '40px',
        width: '80%',
      }}>
        {clients.map((clientID) => {
          const isLocal = clientID === LOCAL_VIDEO;
          return (
            <div 
              key={clientID}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                border: '2px solid #333',
                borderRadius: '10px',
                backgroundColor: '#2a2a2a',
              }}
            >
              {/* Аудио элемент (скрытый) */}
              <audio
                ref={instance => {
                  provideMediaRef(clientID, instance);
                }}
                autoPlay
                playsInline
                muted={isLocal}
                style={{ display: 'none' }}
              />
              
              {/* Аватар пользователя */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: isLocal ? '#007bff' : '#28a745',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '10px',
              }}>
                🎤
              </div>
              
              {/* Имя пользователя */}
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {isLocal ? 'You' : `User ${clientID.slice(0, 6)}`}
              </span>
              
              {/* Индикатор активности */}
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isLocal && muted ? '#dc3545' : '#28a745',
                marginTop: '10px',
              }} />
            </div>
          );
        })}
      </div>

      {/* Контролы */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        display: 'flex',
        gap: '20px',
      }}>
        <button
          onClick={toggleMute}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: muted ? '#dc3545' : '#28a745',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {muted ? '🔇' : '🎤'}
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#dc3545',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          📞
        </button>
      </div>
    </div>
  );
}
```

---

## 🚀 ПРОДВИНУТЫЕ ВОЗМОЖНОСТИ

### 1. Анализ качества соединения
```javascript
// Добавить в useWebRTC.js
const [connectionStates, setConnectionStates] = useState({});

useEffect(() => {
  const interval = setInterval(() => {
    Object.entries(peerConnections.current).forEach(([peerID, connection]) => {
      if (connection) {
        connection.getStats().then(stats => {
          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              setConnectionStates(prev => ({
                ...prev,
                [peerID]: {
                  packetsLost: report.packetsLost,
                  jitter: report.jitter,
                  roundTripTime: report.roundTripTime,
                }
              }));
            }
          });
        });
      }
    });
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

### 2. Запись разговора
```javascript
// Хук для записи аудио
function useRecording(mediaStream) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRecorderRef = useRef(null);

  const startRecording = () => {
    if (mediaStream) {
      const mediaRecorder = new MediaRecorder(mediaStream);
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${new Date().getTime()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    downloadRecording
  };
}
```

### 3. Текстовый чат
```javascript
// Добавить в server.js
socket.on('chat-message', ({ message, roomID }) => {
  socket.to(roomID).emit('chat-message', {
    message,
    from: socket.id,
    timestamp: new Date().toISOString()
  });
});

// Хук для чата
function useChat(roomID) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    socket.on('chat-message', ({ message, from, timestamp }) => {
      setMessages(prev => [...prev, { message, from, timestamp }]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, []);

  const sendMessage = () => {
    if (newMessage.trim()) {
      socket.emit('chat-message', { message: newMessage, roomID });
      setMessages(prev => [...prev, { 
        message: newMessage, 
        from: 'local', 
        timestamp: new Date().toISOString() 
      }]);
      setNewMessage('');
    }
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    sendMessage
  };
}
```

### 4. Детекция речи
```javascript
// Хук для детекции речи
function useSpeechDetection(mediaStream) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (mediaStream) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(mediaStream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        
        const average = sum / dataArray.length;
        setIsSpeaking(average > 10); // Порог для детекции речи
        
        requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();

      return () => {
        audioContext.close();
      };
    }
  }, [mediaStream]);

  return isSpeaking;
}
```

---

## 📦 PACKAGE.JSON КОНФИГУРАЦИИ

### Серверный package.json
```json
{
  "name": "webrtc-server",
  "version": "1.0.0",
  "description": "WebRTC Video/Audio Chat Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "cd client && npm run build && cd ..",
    "start:prod": "npm run build && npm start"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### Клиентский package.json
```json
{
  "name": "webrtc-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^5.3.4",
    "socket.io-client": "^4.7.2",
    "freeice": "^2.2.2",
    "uuid": "^9.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "react-scripts": "5.0.1"
  }
}
```

---

## 🌐 ДЕПЛОЙ И ОПТИМИЗАЦИЯ

### 1. Настройка для продакшена
```bash
# Установка переменных окружения
export NODE_ENV=production
export PORT=3001

# Сборка React приложения
cd client
npm run build
cd ..

# Копирование build файлов
cp -r client/build ./

# Запуск продакшн сервера
npm start
```

### 2. Docker конфигурация
**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем package.json файлы
COPY package*.json ./
COPY client/package*.json ./client/

# Устанавливаем зависимости
RUN npm install
RUN cd client && npm install

# Копируем исходный код
COPY . .

# Собираем React приложение
RUN cd client && npm run build

# Копируем сборку в корень
RUN cp -r client/build ./

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["npm", "start"]
```

**docker-compose.yml**
```yaml
version: '3.8'
services:
  webrtc-app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
```

### 3. Nginx конфигурация
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket поддержка для Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔧 ОТЛАДКА И РЕШЕНИЕ ПРОБЛЕМ

### 1. Частые проблемы и решения

**Проблема: "Error: listen EADDRINUSE"**
```bash
# Найти процесс, использующий порт
lsof -i :3001
# Убить процесс
kill -9 <PID>
```

**Проблема: "ERR_OSSL_EVP_UNSUPPORTED" (Node.js 17+)**
```bash
export NODE_OPTIONS="--openssl-legacy-provider"
npm start
```

**Проблема: WebRTC соединение не устанавливается**
```javascript
// Добавить больше STUN серверов
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
```

### 2. Логирование и мониторинг
```javascript
// Добавить в server.js
io.on('connection', socket => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
  
  socket.on('disconnect', reason => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Добавить в useWebRTC.js
peerConnections.current[peerID].onconnectionstatechange = () => {
  console.log(`Peer ${peerID} connection state: ${peerConnections.current[peerID].connectionState}`);
};
```

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

### Полезные библиотеки
- **simple-peer**: Упрощенный WebRTC API
- **kurento-utils**: Продвинутые WebRTC утилиты  
- **webrtc-adapter**: Полифил для браузерной совместимости
- **socket.io-redis**: Масштабирование с Redis

### Документация
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.io Documentation](https://socket.io/docs/)
- [React Router](https://reactrouter.com/)

### Примеры использования
1. **Видео-конференции**: Расширить для поддержки экрана
2. **Голосовые комнаты**: Убрать видео, добавить аудио эффекты
3. **Стримы**: Добавить возможность трансляции одного ко многим
4. **Игры**: Интеграция с игровой логикой через DataChannel

---

## 🎯 ЗАКЛЮЧЕНИЕ

Это руководство покрывает все аспекты создания полнофункционального видео/голосового чата на WebRTC. Код полностью готов к продакшену и может быть адаптирован под любые нужды.

**Ключевые моменты:**
- Модульная архитектура позволяет легко расширять функционал
- WebRTC обеспечивает прямое P2P соединение с минимальной задержкой  
- Socket.io координирует соединения и обмен служебными сообщениями
- React хуки инкапсулируют всю WebRTC логику
- Приложение масштабируется горизонтально

Используйте этот код как основу для своих проектов!
