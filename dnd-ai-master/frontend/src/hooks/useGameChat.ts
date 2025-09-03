import { useState, useCallback, useRef } from 'react';
import { ChatMessage, DMRequest } from '@/types';
import { dmApi } from '@/utils/api';

interface UseGameChatOptions {
  roomId: string;
  playerName?: string;
  enableStreaming?: boolean;
}

export const useGameChat = ({
  roomId,
  playerName = 'Игрок',
  enableStreaming = false
}: UseGameChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'dm',
      content: 'Добро пожаловать в кампанию! Готовы начать приключение?',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingMessageRef = useRef<string>('');

  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isStreaming) return;

    // Добавляем сообщение игрока
    const playerMessage = addMessage({
      type: 'player',
      playerName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    });

    const dmRequest: DMRequest = {
      playerMessage: content.trim(),
      playerName,
      roomId,
      enableTools: true,
      context: {
        recentHistory: messages.slice(-5).map(m => 
          `${m.type === 'player' ? (m.playerName || 'Игрок') : 'Мастер'}: ${m.content}`
        ),
      },
    };

    try {
      if (enableStreaming) {
        // В стриминговом режиме отключаем tools и используем обычный запрос если нужен roll
        const needsDiceRoll = content.toLowerCase().includes('бросай') || 
                             content.toLowerCase().includes('кубик') ||
                             content.toLowerCase().includes('d20') ||
                             content.toLowerCase().includes('d6');
        
        if (needsDiceRoll) {
          // Если нужен бросок кубика, используем обычный режим
          setIsLoading(true);
          const response = await dmApi.sendMessage(dmRequest);

          if (response.success) {
            addMessage({
              type: 'dm',
              content: response.response.content,
              timestamp: response.response.timestamp,
              toolCalls: response.response.toolCalls,
            });

            // Добавляем tool calls отдельно
            if (response.response.toolCalls && response.response.toolCalls.length > 0) {
              response.response.toolCalls.forEach(toolCall => {
                if (toolCall.success) {
                  addMessage({
                    type: 'system',
                    content: `🎲 ${toolCall.result}`,
                    timestamp: new Date().toISOString(),
                  });
                }
              });
            }
          }
          setIsLoading(false);
          return;
        }

        // Для обычных сообщений используем стриминг без tools
        const streamRequest = { ...dmRequest, enableTools: false };
        setIsStreaming(true);
        streamingMessageRef.current = '';
        setStreamingMessage('');

        await dmApi.sendMessageStream(
          streamRequest,
          // onChunk
          (chunk: string) => {
            streamingMessageRef.current += chunk;
            setStreamingMessage(streamingMessageRef.current);
          },
          // onComplete
          () => {
            if (streamingMessageRef.current) {
              addMessage({
                type: 'dm',
                content: streamingMessageRef.current,
                timestamp: new Date().toISOString(),
              });
            }
            setStreamingMessage('');
            streamingMessageRef.current = '';
            setIsStreaming(false);
          },
          // onError
          (error: Error) => {
            console.error('Streaming error:', error);
            addMessage({
              type: 'system',
              content: `Ошибка при получении ответа: ${error.message}`,
              timestamp: new Date().toISOString(),
            });
            setStreamingMessage('');
            streamingMessageRef.current = '';
            setIsStreaming(false);
          }
        );
      } else {
        setIsLoading(true);
        const response = await dmApi.sendMessage(dmRequest);

        if (response.success) {
          const dmMessage = addMessage({
            type: 'dm',
            content: response.response.content,
            timestamp: response.response.timestamp,
            toolCalls: response.response.toolCalls,
          });

          // Если есть tool calls, добавляем их отдельными сообщениями
          if (response.response.toolCalls && response.response.toolCalls.length > 0) {
            response.response.toolCalls.forEach(toolCall => {
              if (toolCall.success) {
                addMessage({
                  type: 'system',
                  content: `🎲 ${toolCall.result}`,
                  timestamp: new Date().toISOString(),
                });
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        type: 'system',
        content: `Ошибка при отправке сообщения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [roomId, playerName, enableStreaming, messages, isLoading, isStreaming, addMessage]);

  const testToolCalling = useCallback(async (testMessage?: string) => {
    const message = testMessage || 'Бросай за меня d20 на проверку Восприятия';
    
    try {
      setIsLoading(true);
      const response = await dmApi.testTools(message);
      
      if (response.success) {
        addMessage({
          type: 'system',
          content: `🧪 Тест Tool Calling: ${message}`,
          timestamp: new Date().toISOString(),
        });
        
        addMessage({
          type: 'dm',
          content: response.response.content,
          timestamp: response.response.timestamp,
          toolCalls: response.response.toolCalls,
        });

        if (response.response.toolCalls) {
          response.response.toolCalls.forEach(toolCall => {
            addMessage({
              type: 'system',
              content: `🔧 ${toolCall.name}: ${toolCall.result}`,
              timestamp: new Date().toISOString(),
            });
          });
        }
      }
    } catch (error) {
      console.error('Error testing tools:', error);
      addMessage({
        type: 'system',
        content: `Ошибка тестирования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: '1',
      type: 'dm',
      content: 'Чат очищен. Готовы начать заново?',
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    streamingMessage,
    sendMessage,
    testToolCalling,
    clearChat,
  };
};
