import OpenAI from 'openai';
import { Stream } from 'openai/streaming';

export interface OpenRouterConfig {
  apiKey: string;
  baseURL: string;
  siteUrl?: string;
  siteName?: string;
  timeout?: number;
  maxRetries?: number;
  logRequests?: boolean;
}


export interface ChatRequest {
  model: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  tool_choice?: 'auto' | 'none' | OpenAI.Chat.Completions.ChatCompletionNamedToolChoice;
  parallel_tool_calls?: boolean;
}

export class OpenRouterService {
  private client: OpenAI;
  private config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    this.config = config;
    
    const headers: Record<string, string> = {};
    if (config.siteUrl) headers['HTTP-Referer'] = config.siteUrl;
    if (config.siteName) headers['X-Title'] = config.siteName;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: headers,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });
  }

  async createChatCompletion(request: ChatRequest): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    if (this.config.logRequests) {
      console.log('OpenRouter Request:', { 
        model: request.model, 
        messages: request.messages.length, 
        stream: false,
        tools: request.tools?.length || 0,
        tool_choice: request.tool_choice || 'auto'
      });
    }
    try {
      return await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature || 0.7,
        stream: false,
        tools: request.tools,
        tool_choice: request.tool_choice,
        parallel_tool_calls: request.parallel_tool_calls,
      });
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      throw error;
    }
  }

  async createStreamingChatCompletion(request: ChatRequest): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    if (this.config.logRequests) {
      console.log('OpenRouter Streaming Request:', { 
        model: request.model, 
        messages: request.messages.length,
        tools: request.tools?.length || 0,
        tool_choice: request.tool_choice || 'auto'
      });
    }
    try {
      return await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature || 0.7,
        stream: true,
        tools: request.tools,
        tool_choice: request.tool_choice,
        parallel_tool_calls: request.parallel_tool_calls,
      });
    } catch (error) {
      console.error('OpenRouter Streaming API Error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.createChatCompletion({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      return !!response;
    } catch (error) {
      console.error('OpenRouter Health Check Failed:', error);
      return false;
    }
  }
}

export function createOpenRouterService(): OpenRouterService {
  const config: OpenRouterConfig = {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    siteUrl: process.env.SITE_URL,
    siteName: process.env.SITE_NAME,
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    logRequests: process.env.LOG_API_REQUESTS === 'true',
  };
  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
  return new OpenRouterService(config);
}
