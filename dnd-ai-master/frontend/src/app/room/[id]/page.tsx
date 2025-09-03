'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { GameChat } from '@/components/GameChat';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const token = searchParams.get('token');

  const [room, setRoom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [enableStreaming, setEnableStreaming] = useState(false);

  useEffect(() => {
    if (!roomId || !token) {
      setError('Неверная ссылка на комнату');
      setIsLoading(false);
      return;
    }

    // TODO: Загрузить данные комнаты
    // Пока заглушка
    setTimeout(() => {
      setRoom({
        id: roomId,
        title: 'Тестовая кампания с ИИ-мастером',
        players: [],
        status: 'waiting'
      });
      setIsLoading(false);
    }, 1000);
  }, [roomId, token]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      setIsNameSet(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка комнаты...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error || 'Комната не найдена'}</div>
      </div>
    );
  }

  // Форма ввода имени
  if (!isNameSet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              🎲 Присоединение к игре
            </h2>
            <p className="text-gray-300 mb-4 text-center">
              {room.title}
            </p>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Введите ваше имя"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="streaming"
                  checked={enableStreaming}
                  onChange={(e) => setEnableStreaming(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="streaming" className="text-sm text-gray-300">
                  Включить стриминг ответов (экспериментально)
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Войти в игру
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{room.title}</h1>
              <p className="text-gray-400">Комната: {roomId} | Игрок: {playerName}</p>
            </div>
            <div className="flex items-center space-x-2">
              {enableStreaming && (
                <span className="px-2 py-1 bg-purple-600 text-xs rounded">STREAM MODE</span>
              )}
              <button
                onClick={() => setIsNameSet(false)}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-xs rounded transition-colors"
              >
                Сменить имя
              </button>
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Left Panel - Voice Chat */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4 h-full">
              <h3 className="text-lg font-semibold mb-4">🎙️ Игроки</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>{playerName} (вы)</span>
                </div>
                <div className="text-gray-500 text-sm">
                  Ожидание других игроков...
                </div>
              </div>
              
              {/* Статус ИИ-мастера */}
              <div className="mt-4 p-3 bg-blue-900/50 rounded">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">🎭 ИИ-мастер готов</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Claude 3.5 Sonnet + Tool Calling
                </p>
              </div>
            </div>
          </div>

          {/* Center Panel - Game Chat */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg h-full">
              <GameChat 
                roomId={roomId}
                playerName={playerName}
                enableStreaming={enableStreaming}
              />
            </div>
          </div>

          {/* Right Panel - Game Info */}
          <div className="lg:col-span-1">
            <div className="space-y-4 h-full">
              {/* Scene Panel */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">🎬 Сцена</h3>
                <p className="text-sm text-gray-300">
                  Готов к началу приключения! Отправьте сообщение ИИ-мастеру, чтобы начать игру.
                </p>
              </div>

              {/* Tool Calling Info */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">🎲 Инструменты</h3>
                <div className="text-sm space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Броски кубиков</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    ИИ автоматически бросает кубики когда нужно
                  </p>
                </div>
              </div>

              {/* Assistant Panel */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">🤖 Мой ассистент</h3>
                <button className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
                  Скоро доступно
                </button>
              </div>

              {/* Initiative Panel */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">⚔️ Инициатива</h3>
                <p className="text-sm text-gray-500">
                  Нет активного боя
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
