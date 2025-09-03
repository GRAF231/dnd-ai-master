import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import { useGameChat } from '@/hooks/useGameChat';

interface GameChatProps {
  roomId: string;
  playerName?: string;
  enableStreaming?: boolean;
}

const MessageComponent: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const getMessageStyle = () => {
    switch (message.type) {
      case 'dm':
        return 'bg-blue-900/50 border-l-4 border-blue-400';
      case 'player':
        return 'bg-green-900/50 border-l-4 border-green-400';
      case 'system':
        return 'bg-gray-700/50 border-l-4 border-gray-400';
      default:
        return 'bg-gray-800/50';
    }
  };

  const getMessageIcon = () => {
    switch (message.type) {
      case 'dm':
        return '🎭';
      case 'player':
        return '👤';
      case 'system':
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getMessageHeader = () => {
    switch (message.type) {
      case 'dm':
        return 'Мастер';
      case 'player':
        return message.playerName || 'Игрок';
      case 'system':
        return 'Система';
      default:
        return 'Неизвестно';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`p-3 rounded-lg ${getMessageStyle()}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getMessageIcon()}</span>
          <span className="text-sm font-medium text-gray-300">
            {getMessageHeader()}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div className="text-white whitespace-pre-wrap">
        {message.content}
      </div>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-1">Использованные инструменты:</div>
          {message.toolCalls.map((toolCall, index) => (
            <div key={index} className="text-xs text-blue-300">
              🔧 {toolCall.name}: {toolCall.success ? '✅' : '❌'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StreamingMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="p-3 rounded-lg bg-blue-900/50 border-l-4 border-blue-400 opacity-75">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🎭</span>
          <span className="text-sm font-medium text-gray-300">
            Мастер
          </span>
          <span className="text-xs text-blue-400">(печатает...)</span>
        </div>
      </div>
      <div className="text-white whitespace-pre-wrap">
        {content}
        <span className="animate-pulse">|</span>
      </div>
    </div>
  );
};

export const GameChat: React.FC<GameChatProps> = ({
  roomId,
  playerName = 'Игрок',
  enableStreaming = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    isStreaming,
    streamingMessage,
    sendMessage,
    testToolCalling,
    clearChat,
  } = useGameChat({ roomId, playerName, enableStreaming });

  // Автоскролл к низу при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || isStreaming) return;

    await sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = isLoading || isStreaming;

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <span>💬</span>
          <span>Игровой чат</span>
          {enableStreaming && (
            <span className="text-xs bg-purple-600 px-2 py-1 rounded">STREAM</span>
          )}
        </h3>
        
        {/* Кнопки управления */}
        <div className="flex space-x-2">
          <button
            onClick={() => testToolCalling()}
            disabled={isDisabled}
            className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded transition-colors"
            title="Тестировать броски кубиков"
          >
            🎲 Тест
          </button>
          <button
            onClick={clearChat}
            disabled={isDisabled}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition-colors"
            title="Очистить чат"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <MessageComponent key={message.id} message={message} />
        ))}
        
        {/* Стриминговое сообщение */}
        {isStreaming && streamingMessage && (
          <StreamingMessage content={streamingMessage} />
        )}
        
        {/* Индикатор загрузки */}
        {isLoading && !isStreaming && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-sm">Мастер думает...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isDisabled}
            placeholder="Введите сообщение или команду (попробуйте: 'бросай d20')..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-800 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isDisabled}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
          >
            {isDisabled ? '...' : 'Отправить'}
          </button>
        </form>
        
        {/* Подсказки */}
        <div className="mt-2 text-xs text-gray-500">
          <p>
            💡 Попробуйте: "бросай d20 на восприятие", "атакую мечом", "бросай 3d6 для характеристик"
          </p>
          {enableStreaming && (
            <p className="mt-1 text-yellow-400">
              ⚡ Стрим режим: При броске кубиков используется обычный режим для корректного отображения
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
