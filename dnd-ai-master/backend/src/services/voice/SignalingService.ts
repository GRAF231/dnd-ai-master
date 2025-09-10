import { Socket } from 'socket.io';

// События для голосовой связи
const VOICE_ACTIONS = {
  JOIN: 'voice-join',
  LEAVE: 'voice-leave',
  ADD_PEER: 'voice-add-peer',
  REMOVE_PEER: 'voice-remove-peer',
  RELAY_SDP: 'voice-relay-sdp',
  RELAY_ICE: 'voice-relay-ice',
  ICE_CANDIDATE: 'voice-ice-candidate',
  SESSION_DESCRIPTION: 'voice-session-description'
};

interface VoiceRoom {
  id: string;
  participants: Set<string>;
  createdAt: Date;
}

interface ParticipantInfo {
  socketId: string;
  roomId: string | null;
  joinedAt: Date;
}

export class SignalingService {
  private rooms: Map<string, VoiceRoom> = new Map();
  private participants: Map<string, ParticipantInfo> = new Map();

  constructor() {
    console.log('🎙️ SignalingService initialized');
  }

  /**
   * Обработка нового подключения Socket.io
   */
  handleConnection(socket: Socket): void {
    console.log(`🔌 New voice connection: ${socket.id}`);
    
    // Регистрируем участника
    this.participants.set(socket.id, {
      socketId: socket.id,
      roomId: null,
      joinedAt: new Date()
    });

    // Присоединение к голосовой комнате
    socket.on(VOICE_ACTIONS.JOIN, (data: { room: string }) => {
      this.joinRoom(socket, data.room);
    });

    // Покидание голосовой комнаты
    socket.on(VOICE_ACTIONS.LEAVE, () => {
      this.leaveRoom(socket);
    });

    // Ретрансляция SDP (Session Description Protocol)
    socket.on(VOICE_ACTIONS.RELAY_SDP, (data: { peerID: string; sessionDescription: RTCSessionDescription }) => {
      console.log(`📋 Relaying SDP from ${socket.id} to ${data.peerID}`);
      socket.to(data.peerID).emit(VOICE_ACTIONS.SESSION_DESCRIPTION, {
        peerID: socket.id,
        sessionDescription: data.sessionDescription
      });
    });

    // Ретрансляция ICE кандидатов
    socket.on(VOICE_ACTIONS.RELAY_ICE, (data: { peerID: string; iceCandidate: RTCIceCandidate }) => {
      console.log(`🧊 Relaying ICE from ${socket.id} to ${data.peerID}`);
      socket.to(data.peerID).emit(VOICE_ACTIONS.ICE_CANDIDATE, {
        peerID: socket.id,
        iceCandidate: data.iceCandidate
      });
    });

    // Обработка отключения
    socket.on('disconnect', () => {
      console.log(`🔌 Voice disconnection: ${socket.id}`);
      this.handleDisconnect(socket);
    });
  }

  /**
   * Присоединение к голосовой комнате
   */
  private joinRoom(socket: Socket, roomId: string): void {
    console.log(`👥 ${socket.id} joining voice room: ${roomId}`);

    // Проверяем, не находится ли уже в комнате
    const participant = this.participants.get(socket.id);
    if (participant?.roomId) {
      console.warn(`${socket.id} already in room ${participant.roomId}`);
      return;
    }

    // Создаем комнату если не существует
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        participants: new Set(),
        createdAt: new Date()
      });
      console.log(`🏠 Created new voice room: ${roomId}`);
    }

    const room = this.rooms.get(roomId)!;
    const existingParticipants = Array.from(room.participants);

    // Уведомляем существующих участников о новом пире
    existingParticipants.forEach(participantId => {
      // Говорим существующему участнику добавить нового пира (без создания offer)
      socket.to(participantId).emit(VOICE_ACTIONS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false
      });

      // Говорим новому участнику добавить существующего пира (с созданием offer)
      socket.emit(VOICE_ACTIONS.ADD_PEER, {
        peerID: participantId,
        createOffer: true
      });
    });

    // Добавляем участника в комнату
    room.participants.add(socket.id);
    socket.join(roomId);

    // Обновляем информацию об участнике
    if (participant) {
      participant.roomId = roomId;
    }

    console.log(`✅ ${socket.id} joined voice room ${roomId}. Total participants: ${room.participants.size}`);
  }

  /**
   * Покидание голосовой комнаты
   */
  private leaveRoom(socket: Socket): void {
    const participant = this.participants.get(socket.id);
    if (!participant?.roomId) {
      return;
    }

    const roomId = participant.roomId;
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return;
    }

    console.log(`👋 ${socket.id} leaving voice room: ${roomId}`);

    // Удаляем участника из комнаты
    room.participants.delete(socket.id);
    socket.leave(roomId);

    // Уведомляем всех остальных участников об удалении пира
    Array.from(room.participants).forEach(participantId => {
      socket.to(participantId).emit(VOICE_ACTIONS.REMOVE_PEER, {
        peerID: socket.id
      });
    });

    // Обновляем информацию об участнике
    participant.roomId = null;

    // Удаляем комнату если она пустая
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      console.log(`🏠 Deleted empty voice room: ${roomId}`);
    } else {
      console.log(`✅ ${socket.id} left voice room ${roomId}. Remaining participants: ${room.participants.size}`);
    }
  }

  /**
   * Обработка отключения сокета
   */
  private handleDisconnect(socket: Socket): void {
    // Покидаем комнату если находились в ней
    this.leaveRoom(socket);
    
    // Удаляем участника из реестра
    this.participants.delete(socket.id);
  }

  /**
   * Получение статистики комнат
   */
  getRoomsStats(): Array<{ roomId: string; participants: number; createdAt: Date }> {
    return Array.from(this.rooms.entries()).map(([roomId, room]) => ({
      roomId,
      participants: room.participants.size,
      createdAt: room.createdAt
    }));
  }

  /**
   * Получение информации о конкретной комнате
   */
  getRoomInfo(roomId: string): { participants: number; participantIds: string[]; exists: boolean } {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return {
        participants: 0,
        participantIds: [],
        exists: false
      };
    }

    return {
      participants: room.participants.size,
      participantIds: Array.from(room.participants),
      exists: true
    };
  }

  /**
   * Получение общей статистики сервиса
   */
  getStats(): { totalRooms: number; totalParticipants: number; connectedSockets: number } {
    const totalParticipantsInRooms = Array.from(this.rooms.values())
      .reduce((sum, room) => sum + room.participants.size, 0);
    
    return {
      totalRooms: this.rooms.size,
      totalParticipants: totalParticipantsInRooms,
      connectedSockets: this.participants.size
    };
  }
}
