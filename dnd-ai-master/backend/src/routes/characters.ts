import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CharacterSheetService } from '../services/tools/characterSheet.js';

const characterSheetService = new CharacterSheetService();

// Типы для запросов
interface CreateCharacterRequest {
  Body: {
    name: string;
    race: string;
    class: string;
    abilities: {
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    };
    roomId: string;
    playerName: string;
    level?: number;
    background?: string;
  };
}

interface GetCharacterRequest {
  Params: {
    id: string;
  };
  Querystring: {
    roomId: string;
  };
}

interface UpdateCharacterRequest {
  Params: {
    id: string;
  };
  Body: {
    roomId: string;
    updates: any;
  };
}

interface GetCharactersRequest {
  Querystring: {
    roomId: string;
  };
}

export default async function charactersRoutes(fastify: FastifyInstance) {
  
  // GET /api/characters - получить всех персонажей в комнате
  fastify.get<GetCharactersRequest>(
    '/characters',
    async (request: FastifyRequest<GetCharactersRequest>, reply: FastifyReply) => {
      try {
        const { roomId } = request.query;
        
        if (!roomId) {
          return reply.status(400).send({ error: 'roomId is required' });
        }

        const characters = characterSheetService.getCharactersInRoom(roomId);
        return reply.send(characters);
      } catch (error) {
        fastify.log.error(`Error getting characters: ${(error as Error).message}`);
        return reply.status(500).send({ error: 'Failed to get characters' });
      }
    }
  );

  // POST /api/characters - создать нового персонажа
  fastify.post<CreateCharacterRequest>(
    '/characters',
    async (request: FastifyRequest<CreateCharacterRequest>, reply: FastifyReply) => {
      try {
        const { name, race, class: characterClass, abilities, roomId, playerName, level, background } = request.body;
        
        // Валидация
        if (!name || !race || !characterClass || !abilities || !roomId || !playerName) {
          return reply.status(400).send({ 
            error: 'Missing required fields: name, race, class, abilities, roomId, playerName' 
          });
        }

        // Валидация характеристик
        const abilityNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        for (const ability of abilityNames) {
          const value = abilities[ability as keyof typeof abilities];
          if (typeof value !== 'number' || value < 3 || value > 18) {
            return reply.status(400).send({ 
              error: `Invalid ${ability}: must be a number between 3 and 18` 
            });
          }
        }

        const character = characterSheetService.createCharacter({
          name,
          race,
          class: characterClass,
          abilities,
          roomId,
          playerName,
          level,
          background
        });

        return reply.status(201).send(character);
      } catch (error) {
        fastify.log.error(`Error creating character: ${(error as Error).message}`);
        return reply.status(500).send({ 
          error: error instanceof Error ? error.message : 'Failed to create character' 
        });
      }
    }
  );

  // GET /api/characters/:id - получить персонажа по ID
  fastify.get<GetCharacterRequest>(
    '/characters/:id',
    async (request: FastifyRequest<GetCharacterRequest>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { roomId } = request.query;
        
        if (!roomId) {
          return reply.status(400).send({ error: 'roomId is required' });
        }

        const character = characterSheetService.getCharacter(id, roomId);
        
        if (!character) {
          return reply.status(404).send({ error: 'Character not found' });
        }

        return reply.send(character);
      } catch (error) {
        fastify.log.error(`Error getting character: ${(error as Error).message}`);
        return reply.status(500).send({ error: 'Failed to get character' });
      }
    }
  );

  // PUT /api/characters/:id - обновить персонажа
  fastify.put<UpdateCharacterRequest>(
    '/characters/:id',
    async (request: FastifyRequest<UpdateCharacterRequest>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { roomId, updates } = request.body;
        
        if (!roomId || !updates) {
          return reply.status(400).send({ error: 'roomId and updates are required' });
        }

        const success = characterSheetService.updateCharacter(id, roomId, updates);
        
        if (!success) {
          return reply.status(404).send({ error: 'Character not found or could not be updated' });
        }

        // Получаем обновленного персонажа
        const updatedCharacter = characterSheetService.getCharacter(id, roomId);
        return reply.send(updatedCharacter);
      } catch (error) {
        fastify.log.error(`Error updating character: ${(error as Error).message}`);
        return reply.status(500).send({ 
          error: error instanceof Error ? error.message : 'Failed to update character' 
        });
      }
    }
  );
}
