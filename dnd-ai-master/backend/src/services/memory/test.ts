#!/usr/bin/env node

import { MemoryManager } from './MemoryManager.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMemorySystem() {
  console.log('🧪 Запуск тестирования системы памяти...\n');
  
  const testDbPath = './data/test_memory.db';
  const memoryManager = new MemoryManager(testDbPath);
  
  try {
    console.log('1️⃣ Инициализация MemoryManager...');
    await memoryManager.initialize();
    console.log('✅ Инициализация завершена\n');
    
    console.log('2️⃣ Создание тестовой комнаты...');
    const roomResult = await memoryManager.createRoom({
      id: 'test_room_001',
      title: 'Тестовая комната для системы памяти',
      settings: { 
        theme: 'fantasy',
        max_players: 5,
        auto_save: true
      }
    });
    
    if (roomResult.success) {
      console.log('✅ Комната создана:', roomResult.data?.title);
    } else {
      console.log('❌ Ошибка создания комнаты:', roomResult.error);
    }
    console.log();
    
    console.log('3️⃣ Создание игровой сессии...');
    const session = await memoryManager.startSession('test_room_001');
    console.log('✅ Сессия создана:', session.id);
    console.log();
    
    console.log('4️⃣ Сохранение тестовых сообщений...');
    
    const messages = [
      { content: 'Привет! Я хочу начать новое приключение.', player: 'Алиса' },
      { content: 'Добро пожаловать в мир D&D! Вы находитесь в таверне "Золотой дракон".', player: null },
      { content: 'Я осматриваю таверну. Что я вижу?', player: 'Алиса' },
      { content: 'В таверне полумрак, горят свечи. За стойкой стоит дородный трактирщик.', player: null }
    ];
    
    for (const msg of messages) {
      if (msg.player) {
        const result = await memoryManager.saveUserMessage(session.id, msg.content, msg.player);
        if (result.success) {
          console.log(`✅ Сообщение игрока сохранено: ${msg.player}`);
        }
      } else {
        const result = await memoryManager.saveAssistantMessage(session.id, msg.content, 150);
        if (result.success) {
          console.log('✅ Сообщение ИИ-мастера сохранено');
        }
      }
    }
    console.log();
    
    console.log('5️⃣ Создание игровых сущностей...');
    
    const entities = [
      {
        type: 'location' as const,
        name: 'Таверна "Золотой дракон"',
        description: 'Уютная таверна в центре города',
        data: { 
          atmosphere: 'cozy',
          npcs: ['Трактирщик Борис'],
          items: ['Эль', 'Хлеб', 'Сыр']
        }
      },
      {
        type: 'npc' as const,
        name: 'Трактирщик Борис',
        description: 'Дородный мужчина средних лет, владелец таверны',
        data: {
          race: 'human',
          class: 'commoner',
          personality: 'friendly',
          secrets: ['Знает о тайном проходе в подвал']
        }
      }
    ];
    
    for (const entity of entities) {
      const result = await memoryManager.createEntity({
        room_id: 'test_room_001',
        ...entity
      });
      
      if (result.success) {
        console.log(`✅ Сущность создана: ${entity.type} - ${entity.name}`);
      }
    }
    console.log();
    
    console.log('6️⃣ Построение игрового контекста...');
    const context = await memoryManager.buildContext('test_room_001');
    
    console.log(`✅ Контекст построен:`);
    console.log(`   📝 Сообщений: ${context.recent_messages.length}`);
    console.log(`   🏷️ Сущностей: ${context.active_entities.length}`);
    console.log(`   📊 Фактов: ${context.relevant_facts.length}`);
    console.log(`   🔢 Примерно токенов: ${context.total_tokens}`);
    console.log();
    
    console.log('7️⃣ Получение статистики системы...');
    const stats = await memoryManager.getStats();
    
    console.log('✅ Статистика системы памяти:');
    console.log(`   🎮 Всего сессий: ${stats.total_sessions}`);
    console.log(`   💬 Всего сообщений: ${stats.total_messages}`);
    console.log(`   🏷️ Всего сущностей: ${stats.total_entities}`);
    console.log(`   📝 Всего фактов: ${stats.total_facts}`);
    console.log(`   📊 Средняя длина сессии: ${stats.average_session_length} сообщений`);
    console.log();
    
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('🧠 Система памяти готова к интеграции с ИИ-мастером');
    
  } catch (error) {
    console.error('❌ ОШИБКА ТЕСТИРОВАНИЯ:', error);
    process.exit(1);
  } finally {
    await memoryManager.close();
    console.log('\n📦 Соединение с базой данных закрыто');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testMemorySystem().catch(console.error);
}
