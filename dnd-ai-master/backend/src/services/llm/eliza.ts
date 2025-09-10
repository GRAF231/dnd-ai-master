export interface ElizaConfig {
  apiKey: string;
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  logRequests?: boolean;
}

export interface ElizaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ElizaChatRequest {
  model: string;
  messages: ElizaMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
}

export interface ElizaResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ElizaService {
  private config: ElizaConfig;

  constructor(config: ElizaConfig) {
    this.config = config;
  }

  private convertMessages(messages: any[]): ElizaMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }



  async createChatCompletion(request: ElizaChatRequest): Promise<ElizaResponse> {
    if (this.config.logRequests) {
      console.log('Eliza API Request:', { 
        model: request.model, 
        messages: request.messages.length, 
        stream: false,
        tools: request.tools?.length || 0,
        baseURL: this.config.baseURL
      });
    }

    try {
      const response = await fetch(`${this.config.baseURL}/anthropic/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `OAuth ${this.config.apiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.max_tokens || 4096,
          temperature: request.temperature || 0.7,
          messages: this.convertMessages(request.messages.filter(m => m.role !== 'system')),
          system: request.messages.find(m => m.role === 'system')?.content,
          tools: request.tools,
          tool_choice: request.tools && request.tools.length > 0 ? { type: 'auto' } : undefined
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Eliza API Error:', data);
        throw new Error(`Eliza API Error: ${response.status} - ${JSON.stringify(data)}`);
      }

      // Преобразуем ответ Anthropic в стандартный формат
      let responseContent = '';
      let toolCalls: any[] = [];
      
      // Обрабатываем content массив
      if (data.content && Array.isArray(data.content)) {
        for (const item of data.content) {
          if (item.type === 'text') {
            responseContent += item.text;
          } else if (item.type === 'tool_use') {
            // Конвертируем tool_use в OpenAI формат
            toolCalls.push({
              id: item.id,
              type: 'function',
              function: {
                name: item.name,
                arguments: JSON.stringify(item.input)
              }
            });
          }
        }
      }
      
      if (this.config.logRequests) {
        console.log('Eliza API Response content:', responseContent);
        console.log('Eliza API Tool calls:', toolCalls);
      }

      return {
        id: data.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined
          },
          finish_reason: data.stop_reason === 'tool_use' ? 'tool_calls' : 
                        data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
        }],
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      console.error('Eliza API Error:', error);
      throw error;
    }
  }

  async createStreamingChatCompletion(request: ElizaChatRequest): Promise<AsyncIterable<any>> {
    if (this.config.logRequests) {
      console.log('Eliza API Streaming Request:', { 
        model: request.model, 
        messages: request.messages.length,
        tools: request.tools?.length || 0
      });
    }

    try {
      const response = await fetch(`${this.config.baseURL}/anthropic/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `OAuth ${this.config.apiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.max_tokens || 4096,
          temperature: request.temperature || 0.7,
          messages: this.convertMessages(request.messages.filter(m => m.role !== 'system')),
          system: request.messages.find(m => m.role === 'system')?.content,
          stream: true,
          tools: request.tools,
          tool_choice: request.tools && request.tools.length > 0 ? { type: 'auto' } : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Eliza Streaming API Error: ${response.status}`);
      }

      return this.processElizaStream(response.body!);
    } catch (error) {
      console.error('Eliza Streaming API Error:', error);
      throw error;
    }
  }

  private async* processElizaStream(stream: ReadableStream<Uint8Array>): AsyncIterable<any> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta?.text) {
                yield {
                  id: parsed.id || 'eliza-stream',
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: 'claude-3-5-sonnet-20241022',
                  choices: [{
                    index: 0,
                    delta: {
                      content: parsed.delta.text
                    },
                    finish_reason: null
                  }]
                };
              }
            } catch (e) {
              // Игнорируем ошибки парсинга отдельных чанков
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.createChatCompletion({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      return !!response;
    } catch (error) {
      console.error('Eliza Health Check Failed:', error);
      return false;
    }
  }
}

export function createElizaService(): ElizaService {
  const config: ElizaConfig = {
    apiKey: process.env.ELIZA_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    baseURL: process.env.ELIZA_BASE_URL || 'https://api.eliza.yandex.net/raw',
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    logRequests: process.env.LOG_API_REQUESTS === 'true',
  };
  if (!config.apiKey) {
    throw new Error('ELIZA_API_KEY или ANTHROPIC_API_KEY environment variable is required');
  }
  return new ElizaService(config);
}
