export interface AnthropicConfig {
  apiKey: string;
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  logRequests?: boolean;
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicChatRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicDirectService {
  private config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    this.config = config;
  }

  async createChatCompletion(request: AnthropicChatRequest): Promise<any> {
    if (this.config.logRequests) {
      console.log('Eliza Anthropic Direct Request:', { 
        model: request.model, 
        messages: request.messages.length, 
        stream: false,
        tools: request.tools?.length || 0,
        baseURL: this.config.baseURL
      });
    }

    try {
      const response = await fetch(`${this.config.baseURL}/messages`, {
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
          messages: request.messages,
          tools: request.tools,
          tool_choice: request.tool_choice
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Eliza Anthropic API Error:', data);
        throw new Error(`Anthropic API Error: ${response.status} - ${JSON.stringify(data)}`);
      }

      // Преобразуем ответ Anthropic в формат OpenAI для совместимости
      return {
        id: data.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: data.content?.[0]?.text || '',
            tool_calls: data.tool_calls || undefined
          },
          finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
        }],
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      console.error('Eliza Anthropic Direct API Error:', error);
      throw error;
    }
  }

  async createStreamingChatCompletion(request: AnthropicChatRequest): Promise<AsyncIterable<any>> {
    if (this.config.logRequests) {
      console.log('Eliza Anthropic Direct Streaming Request:', { 
        model: request.model, 
        messages: request.messages.length,
        tools: request.tools?.length || 0
      });
    }

    try {
      const response = await fetch(`${this.config.baseURL}/messages`, {
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
          messages: request.messages,
          stream: true,
          tools: request.tools,
          tool_choice: request.tool_choice
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic Streaming API Error: ${response.status}`);
      }

      return this.processAnthropicStream(response.body!);
    } catch (error) {
      console.error('Eliza Anthropic Direct Streaming API Error:', error);
      throw error;
    }
  }

  private async* processAnthropicStream(stream: ReadableStream<Uint8Array>): AsyncIterable<any> {
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
                // Преобразуем в формат OpenAI для совместимости
                yield {
                  id: parsed.id || 'anthropic-stream',
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
      console.error('Eliza Anthropic Health Check Failed:', error);
      return false;
    }
  }
}

export function createAnthropicDirectService(): AnthropicDirectService {
  const config: AnthropicConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.eliza.yandex.net/raw/anthropic/v1',
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    logRequests: process.env.LOG_API_REQUESTS === 'true',
  };
  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY (OAuth токен) environment variable is required');
  }
  return new AnthropicDirectService(config);
}
