'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { GameChat } from '@/components/GameChat';
import { CharacterCreationWizard } from '@/components/CharacterCreation';
import { VoicePanel } from '@/components/VoiceChat';
import { charactersApi, Character } from '@/utils/charactersApi';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const token = searchParams.get('token');

  const [room, setRoom] = useState<{
    id: string;
    title: string;
    players: string[];
    status: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [enableStreaming, setEnableStreaming] = useState(false);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [playerCharacters, setPlayerCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

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
      loadPlayerCharacters();
    }
  };

  const loadPlayerCharacters = async () => {
    try {
      const characters = await charactersApi.getCharacters(roomId);
      const myCharacters = characters.filter(char => char.playerName === playerName);
      setPlayerCharacters(myCharacters);
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  const handleCharacterCreated = (character: Character) => {
    setPlayerCharacters(prev => [...prev, character]);
    setShowCharacterCreation(false);
  };

  const handleCreateCharacter = () => {
    setShowCharacterCreation(true);
  };

  const handleCancelCharacterCreation = () => {
    setShowCharacterCreation(false);
  };

  const handleViewCharacter = (character: Character) => {
    setSelectedCharacter(character);
  };

  const handleCloseCharacterView = () => {
    setSelectedCharacter(null);
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

  // Показать мастер создания персонажа
  if (showCharacterCreation) {
    return (
      <CharacterCreationWizard
        roomId={roomId}
        playerName={playerName}
        onComplete={handleCharacterCreated}
        onCancel={handleCancelCharacterCreation}
      />
    );
  }

  return (
    <>
      {/* Модальное окно с детальной информацией о персонаже */}
      {selectedCharacter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Заголовок */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCharacter.name}</h2>
                  <p className="text-gray-400">
                    {selectedCharacter.race} {selectedCharacter.class} {selectedCharacter.level} уровень
                  </p>
                </div>
                <button
                  onClick={handleCloseCharacterView}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Основные характеристики */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400">Здоровье</div>
                  <div className="text-lg font-bold">
                    {selectedCharacter.hitPoints.current}/{selectedCharacter.hitPoints.maximum}
                  </div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400">Класс брони</div>
                  <div className="text-lg font-bold">{selectedCharacter.armorClass}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400">Скорость</div>
                  <div className="text-lg font-bold">{selectedCharacter.speed} фт</div>
                </div>
              </div>

              {/* Характеристики */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Характеристики</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(selectedCharacter.abilities).map(([ability, value]) => (
                    <div key={ability} className="bg-gray-700 p-3 rounded text-center">
                      <div className="text-xs text-gray-400 uppercase">{ability.slice(0, 3)}</div>
                      <div className="text-lg font-bold">{value}</div>
                      <div className="text-sm text-gray-400">
                        {value >= 10 ? '+' : ''}{Math.floor((value - 10) / 2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Навыки */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Навыки</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(selectedCharacter.skills).map(([skill, modifier]) => (
                    <div key={skill} className="flex justify-between bg-gray-700 p-2 rounded">
                      <span className="capitalize">{skill.replace('_', ' ')}</span>
                      <span>{modifier >= 0 ? '+' : ''}{modifier}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex justify-end">
                <button
                  onClick={handleCloseCharacterView}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <VoicePanel 
              roomId={roomId}
              playerName={playerName}
            />
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
              {/* Characters Panel */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">👤 Мои персонажи</h3>
                  <button
                    onClick={handleCreateCharacter}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-xs rounded transition-colors"
                  >
                    ＋ Создать
                  </button>
                </div>
                
                {playerCharacters.length > 0 ? (
                  <div className="space-y-2">
                    {playerCharacters.map((character) => (
                      <button
                        key={character.id}
                        onClick={() => handleViewCharacter(character)}
                        className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-left transition-colors"
                      >
                        <div className="font-medium">{character.name}</div>
                        <div className="text-xs text-gray-400">
                          {character.race} {character.class} {character.level} ур.
                        </div>
                        <div className="text-xs text-gray-400">
                          ❤️ {character.hitPoints.current}/{character.hitPoints.maximum} | 🛡️ {character.armorClass}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    Нет созданных персонажей
                  </div>
                )}
              </div>

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
    </>
  );
}
