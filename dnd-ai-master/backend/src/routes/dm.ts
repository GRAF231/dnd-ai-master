import { FastifyInstance } from 'fastify';
import { getDMAgent } from '../services/llm/index.js';
import { type DMRequest } from '../services/llm/dmAgentEliza.js';

export async function dmRoutes(fastify: FastifyInstance) {
  const dmAgent = getDMAgent();

  fastify.get('/dm/health', async (request, reply) => {
    try {
      const isHealthy = await dmAgent.testConnection();
      return { status: isHealthy ? 'healthy' : 'unhealthy', service: 'DM Agent' };
    } catch (error) {
      reply.code(500);
      return { status: 'error', error: 'Health check failed' };
    }
  });

  fastify.post('/dm/reply', async (request, reply) => {
    try {
      const dmRequest = request.body as DMRequest;
      if (!dmRequest.playerMessage || !dmRequest.roomId) {
        reply.code(400);
        return { error: 'playerMessage and roomId are required' };
      }
      // Включаем Tool Calling по умолчанию
      dmRequest.enableTools = dmRequest.enableTools !== false;
      const response = await dmAgent.processPlayerMessage(dmRequest);
      return { success: true, response };
    } catch (error) {
      fastify.log.error(`DM reply error: ${error instanceof Error ? error.message : String(error)}`);
      reply.code(500);
      return { error: 'Failed to process DM response' };
    }
  });

  fastify.post('/dm/reply-stream', async (request, reply) => {
    try {
      const dmRequest = request.body as DMRequest;
      if (!dmRequest.playerMessage || !dmRequest.roomId) {
        reply.code(400);
        return { error: 'playerMessage and roomId are required' };
      }
      // Включаем Tool Calling по умолчанию
      dmRequest.enableTools = dmRequest.enableTools !== false;
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      const stream = await dmAgent.processPlayerMessageStream(dmRequest);
      reply.raw.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);
      for await (const chunk of stream) {
        if (chunk) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
        }
      }
      reply.raw.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      reply.raw.end();
    } catch (error) {
      fastify.log.error(`DM stream error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  fastify.post('/dm/test', async (request, reply) => {
    try {
      const { message, scene, npcs } = request.body as any;
      const testRequest: DMRequest = {
        playerMessage: message || 'Что происходит?',
        playerName: 'Тестер',
        roomId: 'test-room',
        enableTools: true,
        context: {
          currentScene: scene || 'Таверна "Пьяный дракон"',
          activeNPCs: npcs || ['Бармен'],
        }
      };
      const response = await dmAgent.processPlayerMessage(testRequest);
      return { success: true, test: true, request: testRequest, response };
    } catch (error) {
      fastify.log.error(`DM test error: ${error instanceof Error ? error.message : String(error)}`);
      reply.code(500);
      return { error: 'DM test failed' };
    }
  });

  // Новый эндпоинт для тестирования Tool Calling
  fastify.post('/dm/test-tools', async (request, reply) => {
    try {
      const { message } = request.body as any;
      const testRequest: DMRequest = {
        playerMessage: message || 'Бросай за меня d20 на проверку Восприятия',
        playerName: 'Тестер',
        roomId: 'test-room',
        enableTools: true,
        context: {
          currentScene: 'Тестовая комната для Tool Calling',
        }
      };
      const response = await dmAgent.processPlayerMessage(testRequest);
      return { 
        success: true, 
        test: 'tool-calling',
        request: testRequest, 
        response,
        toolCalls: response.toolCalls || []
      };
    } catch (error) {
      fastify.log.error(`DM tools test error: ${error instanceof Error ? error.message : String(error)}`);
      reply.code(500);
      return { error: 'DM tools test failed' };
    }
  });

  // Эндпоинт для получения информации о доступных инструментах
  fastify.get('/dm/tools', async (request, reply) => {
    try {
      const { toolsService } = await import('../services/tools/index.js');
      const toolsInfo = toolsService.getToolsInfo();
      const availableTools = toolsService.getAllTools();
      
      return { 
        success: true,
        tools: toolsInfo,
        definitions: availableTools
      };
    } catch (error) {
      fastify.log.error(`Tools info error: ${error instanceof Error ? error.message : String(error)}`);
      reply.code(500);
      return { error: 'Failed to get tools info' };
    }
  });

  // Роут для проверки статуса Eliza
  fastify.get('/dm/status', async (request, reply) => {
    try {
      const currentAgent = getDMAgent();
      const isHealthy = await currentAgent.testConnection();
      
      return { 
        provider: 'eliza',
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to check Eliza status',
        healthy: false
      });
    }
  });
}
