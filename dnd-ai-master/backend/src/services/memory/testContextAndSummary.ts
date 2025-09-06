import { MemoryManager } from './MemoryManager.js';
import { ContextManagerConfig, SummaryServiceConfig } from './types.js';

/**
 * Тестирование ContextManager и SummaryService
 */
async function testContextManagerAndSummaryService() {
  console.log('🧪 Тестирование ContextManager и SummaryService...');

  // Конфигурация для тестирования
  const contextConfig: Partial<ContextManagerConfig> = {
    max_tokens: 100000,        // Меньший лимит для тестирования
    max_messages: 50,
    priority_threshold: 0.2,   // Более низкий порог
    cache_ttl_ms: 2 * 60 * 1000 // 2 минуты кэш
  };

  const summaryConfig: Partial<SummaryServiceConfig> = {
    min_messages_for_summary: 5,      // Меньше для тестирования
    max_messages_per_batch: 20,
    summary_trigger_threshold: 15,    // Меньше для тестирования
    scene_detection_enabled: true,
    background_processing: false      // Отключаем для тестирования
  };

  // Создаем MemoryManager с новыми сервисами
  const memoryManager = new MemoryManager(
    'test_context_summary.db',
    contextConfig,
    summaryConfig
  );

  try {
    // Инициализация
    await memoryManager.initialize();
    console.log('✅ MemoryManager инициализирован');

    // Создаем тестовую комнату
    const roomId = 'test_context_room';
    await memoryManager.ensureRoom(roomId, 'Тестовая комната для контекста');
    console.log('✅ Тестовая комната создана');

    // Создаем тестовые сообщения для проверки приоритизации
    const testMessages = [
      'Привет! Меня зовут Арагорн, я следопыт.',
      'Мы входим в темное подземелье. Что мы видим?',
      'Я делаю проверку Восприятия. Бросаю d20.',
      'Атакую орка своим мечом! Критическое попадание!',
      'Использую заклинание Лечение на союзника.',
      'Мы находим сокровищницу с золотом и магическими предметами.',
      'Разговариваем с мудрым волшебником о квесте.',
      'Исследуем древние руины в поисках артефакта.',
      'Сражаемся с драконом в финальной битве!',
      'Получаем опыт и повышаем уровень персонажей.'
    ];

    const playerNames = ['Арагорн', 'Леголас', 'Гимли', 'Гэндальф'];
    
    // Добавляем сообщения с разными временными интервалами
    for (let i = 0; i < testMessages.length; i++) {
      const playerName = playerNames[i % playerNames.length];
      
      // Обрабатываем сообщение пользователя
      const result = await memoryManager.processUserMessageWithOptimizations(
        roomId,
        testMessages[i],
        playerName
      );
      
      console.log(`📝 Сообщение ${i + 1} обработано: ${result.message.content.substring(0, 50)}...`);
      
      // Добавляем ответ ИИ-мастера
      const aiResponse = `Мастер отвечает на действие игрока ${playerName}. Описание результата и развитие сюжета.`;
      await memoryManager.processAssistantResponseWithOptimizations(
        result.session.id,
        aiResponse,
        50
      );
      
      // Небольшая задержка для имитации реального времени
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Тестовые сообщения добавлены');

    // Тестируем построение оптимизированного контекста
    console.log('\n🧠 Тестирование ContextManager...');
    
    const optimizedContext = await memoryManager.buildOptimizedContext(roomId, {
      max_tokens: 50000,
      max_messages: 20
    });

    console.log(`📊 Оптимизированный контекст:`);
    console.log(`  - Сообщений включено: ${optimizedContext.prioritized_messages.length}`);
    console.log(`  - Сущностей включено: ${optimizedContext.prioritized_entities.length}`);
    console.log(`  - Общий размер: ${optimizedContext.total_tokens} токенов`);
    console.log(`  - Коэффициент сжатия: ${optimizedContext.optimization_stats.compression_ratio.toFixed(2)}`);
    console.log(`  - Краткая сводка: ${optimizedContext.context_summary}`);

    // Показываем топ-5 приоритизированных сообщений
    console.log('\n📋 Топ-5 приоритизированных сообщений:');
    optimizedContext.prioritized_messages.slice(0, 5).forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.priority_score.toFixed(2)}] ${msg.player_name}: ${msg.content.substring(0, 60)}...`);
    });

    // Тестируем кэширование
    console.log('\n🚀 Тестирование кэширования...');
    const startTime = Date.now();
    await memoryManager.buildOptimizedContext(roomId); // Должен загрузиться из кэша
    const cacheTime = Date.now() - startTime;
    console.log(`⚡ Загрузка из кэша заняла: ${cacheTime}ms`);

    // Статистика кэша
    const cacheStats = memoryManager.getContextCacheStats();
    console.log(`📈 Статистика кэша: ${cacheStats.active_entries} активных записей, ${cacheStats.memory_usage_mb.toFixed(2)} MB`);

    // Тестируем SummaryService
    console.log('\n📝 Тестирование SummaryService...');
    
    const session = await memoryManager.getActiveSession(roomId);
    if (session) {
      // Создаем сводку сообщений
      const summaryResult = await memoryManager.createSummary({
        session_id: session.id,
        summary_type: 'messages',
        title: 'Тестовая сводка приключения'
      });

      if (summaryResult.success && summaryResult.data) {
        console.log(`✅ Сводка создана: ${summaryResult.data.title}`);
        console.log(`📄 Содержание: ${summaryResult.data.content.substring(0, 200)}...`);
        console.log(`🔢 Размер: ${summaryResult.data.token_count} токенов`);
      }

      // Определяем сцены
      const scenes = await memoryManager.detectScenes(session.id);
      console.log(`🎬 Обнаружено сцен: ${scenes.length}`);
      
      scenes.forEach((scene, index) => {
        console.log(`  Сцена ${index + 1}: ${scene.title}`);
        console.log(`    Участники: ${scene.participants.join(', ')}`);
        console.log(`    События: ${scene.key_events.join(', ')}`);
      });

      // Статистика сжатия
      const compressionStats = await memoryManager.getCompressionStats(session.id);
      console.log(`📊 Статистика сжатия:`);
      console.log(`  - Всего сводок: ${compressionStats.total_summaries}`);
      console.log(`  - Сжатых сообщений: ${compressionStats.messages_summarized}`);
      console.log(`  - Коэффициент сжатия: ${compressionStats.compression_ratio.toFixed(2)}`);
      console.log(`  - Время обработки: ${compressionStats.processing_time_ms}ms`);
    }

    // Тестируем автоматическое создание сводки
    console.log('\n🤖 Тестирование автоматического создания сводки...');
    if (session) {
      await memoryManager.checkAutoSummary(session.id);
      
      const processingStatus = memoryManager.getSummaryProcessingStatus();
      console.log(`⚙️ Статус обработки: ${processingStatus.queue_size} задач в очереди`);
    }

    // Общая статистика системы памяти
    console.log('\n📈 Общая статистика системы памяти:');
    const stats = await memoryManager.getStats();
    console.log(`  - Всего сессий: ${stats.total_sessions}`);
    console.log(`  - Всего сообщений: ${stats.total_messages}`);
    console.log(`  - Всего сущностей: ${stats.total_entities}`);
    console.log(`  - Всего фактов: ${stats.total_facts}`);
    console.log(`  - Средняя длина сессии: ${stats.average_session_length} сообщений`);

    console.log('\n🎉 Все тесты ContextManager и SummaryService пройдены успешно!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    throw error;
  } finally {
    await memoryManager.close();
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  testContextManagerAndSummaryService()
    .then(() => {
      console.log('✅ Тестирование завершено успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Тестирование провалено:', error);
      process.exit(1);
    });
}

export { testContextManagerAndSummaryService };
