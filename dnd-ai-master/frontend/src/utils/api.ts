import { DMRequest, DMApiResponse, ToolsResponse } from '@/types';

export class DMApiClient {
  /**
   * Отправка сообщения ИИ-мастеру
   */

  async sendMessage(request: DMRequest): Promise<DMApiResponse> {
    const response = await fetch('/api/dm/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Стриминг сообщения от ИИ-мастера
   */
  async sendMessageStream(
    request: DMRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch('/api/dm/reply-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content' && data.content) {
                onChunk(data.content);
              } else if (data.type === 'end') {
                onComplete();
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line, parseError);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Получение информации о доступных инструментах
   */
  async getTools(): Promise<ToolsResponse> {
    const response = await fetch('/api/dm/tools');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Тестирование Tool Calling (прямое обращение к бэкенду)
   */
  async testTools(message: string): Promise<DMApiResponse> {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/dm/test-tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Проверка здоровья DM сервиса (прямое обращение к бэкенду)
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/dm/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

// Экспортируем singleton
export const dmApi = new DMApiClient();
