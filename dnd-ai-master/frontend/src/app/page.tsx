'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [roomTitle, setRoomTitle] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const createRoom = async () => {
    if (!roomTitle.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: roomTitle,
          password: password || undefined 
        }),
      });
      
      const room = await response.json();
      router.push(`/room/${room.id}?token=${room.token}`);
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              🎲 AI D&D Master
            </h1>
            <p className="text-gray-300">
              Создайте комнату для игры с ИИ-мастером
            </p>
          </div>

          {/* Create Room Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Название кампании
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  placeholder="Например: Проклятие Страда"
                  className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Пароль (опционально)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Для приватной игры"
                  className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={createRoom}
                disabled={!roomTitle.trim() || isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isLoading ? 'Создание...' : 'Создать комнату'}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold text-white mb-4">
              Возможности
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm text-gray-300">
              <div className="flex items-center justify-center space-x-2">
                <span>��</span>
                <span>ИИ-мастер на Claude 3.5 Sonnet</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>🎙️</span>
                <span>Голосовая связь между игроками</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>🧠</span>
                <span>Память между сессиями</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>🤖</span>
                <span>Персональные ассистенты</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
