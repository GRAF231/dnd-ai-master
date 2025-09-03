import { BaseTool, ToolDefinition } from './BaseTool.js';
import { fileStorage } from './utils/FileStorage.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Интерфейс игровой заметки
 */
export interface GameNote {
  id: string;
  content: string;
  category: string;
  tags: string[];
  roomId: string;
  authorName: string;
  authorType: 'player' | 'dm' | 'system';
  created: string;
  lastUpdated: string;
  isPrivate: boolean; // Приватные заметки видны только автору
}

/**
 * Сервис управления игровыми заметками
 * Позволяет сохранять, искать и категоризировать заметки
 */
export class NotesManagerService implements BaseTool {
  
  getName(): string {
    return 'notes_manager';
  }

  getDescription(): string {
    return 'Сохранение и поиск игровых заметок';
  }

  /**
   * Сохраняет новую заметку
   */
  saveNote(data: {
    content: string;
    category: string;
    roomId: string;
    authorName: string;
    authorType?: 'player' | 'dm' | 'system';
    tags?: string[];
    isPrivate?: boolean;
  }): GameNote {
    const note: GameNote = {
      id: uuidv4(),
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      roomId: data.roomId,
      authorName: data.authorName,
      authorType: data.authorType || 'player',
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isPrivate: data.isPrivate || false
    };

    fileStorage.appendToArray(`notes_${data.roomId}`, note);
    return note;
  }

  /**
   * Поиск заметок по запросу
   */
  searchNotes(query: string, roomId: string, authorName?: string): GameNote[] {
    const notes = fileStorage.load<GameNote[]>(`notes_${roomId}`) || [];
    const lowerQuery = query.toLowerCase();
    
    return notes.filter(note => {
      // Проверяем права доступа к приватным заметкам
      if (note.isPrivate && authorName && note.authorName !== authorName) {
        return false;
      }
      
      // Поиск по содержимому, категории и тегам
      return (
        note.content.toLowerCase().includes(lowerQuery) ||
        note.category.toLowerCase().includes(lowerQuery) ||
        note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }

  /**
   * Получает заметки по категории
   */
  getNotesByCategory(category: string, roomId: string, authorName?: string): GameNote[] {
    const notes = fileStorage.load<GameNote[]>(`notes_${roomId}`) || [];
    
    return notes.filter(note => {
      // Проверяем права доступа к приватным заметкам
      if (note.isPrivate && authorName && note.authorName !== authorName) {
        return false;
      }
      
      return note.category.toLowerCase() === category.toLowerCase();
    }).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }

  /**
   * Получает все заметки в комнате
   */
  getAllNotes(roomId: string, authorName?: string): GameNote[] {
    const notes = fileStorage.load<GameNote[]>(`notes_${roomId}`) || [];
    
    return notes.filter(note => {
      // Проверяем права доступа к приватным заметкам
      if (note.isPrivate && authorName && note.authorName !== authorName) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }

  /**
   * Обновляет заметку
   */
  updateNote(noteId: string, roomId: string, updates: Partial<GameNote>, authorName?: string): boolean {
    const notes = fileStorage.load<GameNote[]>(`notes_${roomId}`) || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);
    
    if (noteIndex === -1) return false;
    
    const note = notes[noteIndex];
    
    // Проверяем права на редактирование (только автор или DM)
    if (authorName && note.authorName !== authorName && updates.authorType !== 'dm') {
      return false;
    }
    
    notes[noteIndex] = {
      ...note,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    fileStorage.save(`notes_${roomId}`, notes);
    return true;
  }

  /**
   * Удаляет заметку
   */
  deleteNote(noteId: string, roomId: string, authorName?: string): boolean {
    const notes = fileStorage.load<GameNote[]>(`notes_${roomId}`) || [];
    const note = notes.find(n => n.id === noteId);
    
    if (!note) return false;
    
    // Проверяем права на удаление (только автор или DM)
    if (authorName && note.authorName !== authorName && note.authorType !== 'dm') {
      return false;
    }
    
    return fileStorage.removeFromArray<GameNote>(
      `notes_${roomId}`,
      n => n.id === noteId
    );
  }

  /**
   * Получает список категорий заметок
   */
  getCategories(roomId: string): string[] {
    const notes = fileStorage.load<GameNote[]>(`notes_${roomId}`) || [];
    const categories = new Set(notes.map(note => note.category));
    return Array.from(categories).sort();
  }

  /**
   * Получает список тегов
   */
  getTags(roomId: string): string[] {
    const notes = fileStorage.load<GameNote[]>(`notes_${roomId}`) || [];
    const tags = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  validateArgs(args: any): boolean {
    if (args.action === 'save') {
      return !!(args.content && args.category && args.room_id && args.author_name);
    }
    if (args.action === 'search') {
      return !!(args.query && args.room_id);
    }
    if (args.action === 'get_by_category') {
      return !!(args.category && args.room_id);
    }
    if (args.action === 'get_all') {
      return !!args.room_id;
    }
    if (args.action === 'update') {
      return !!(args.note_id && args.room_id && args.updates);
    }
    if (args.action === 'delete') {
      return !!(args.note_id && args.room_id);
    }
    if (args.action === 'get_categories' || args.action === 'get_tags') {
      return !!args.room_id;
    }
    return false;
  }

  getToolDefinition(): ToolDefinition {
    return {
      type: "function",
      function: {
        name: "notes_manager",
        description: "Управление игровыми заметками. Позволяет сохранять, искать, категоризировать и управлять заметками",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["save", "search", "get_by_category", "get_all", "update", "delete", "get_categories", "get_tags"],
              description: "Действие с заметками"
            },
            content: {
              type: "string",
              description: "Содержимое заметки (для сохранения)"
            },
            category: {
              type: "string",
              description: "Категория заметки (например: 'персонажи', 'локации', 'квесты', 'сражения')"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Теги для заметки"
            },
            query: {
              type: "string",
              description: "Поисковый запрос"
            },
            note_id: {
              type: "string",
              description: "ID заметки (для обновления или удаления)"
            },
            room_id: {
              type: "string",
              description: "ID комнаты"
            },
            author_name: {
              type: "string",
              description: "Имя автора заметки"
            },
            author_type: {
              type: "string",
              enum: ["player", "dm", "system"],
              description: "Тип автора"
            },
            is_private: {
              type: "boolean",
              description: "Приватная ли заметка (видна только автору)"
            },
            updates: {
              type: "object",
              description: "Объект с обновлениями заметки"
            }
          },
          required: ["action", "room_id"]
        }
      }
    };
  }

  handleToolCall(args: any): string {
    try {
      switch (args.action) {
        case 'save': {
          const note = this.saveNote({
            content: args.content,
            category: args.category,
            roomId: args.room_id,
            authorName: args.author_name,
            authorType: args.author_type,
            tags: args.tags,
            isPrivate: args.is_private
          });
          
          const privacy = note.isPrivate ? ' 🔒 (приватная)' : '';
          const tagsText = note.tags.length > 0 ? ` | 🏷️ ${note.tags.join(', ')}` : '';
          
          return `📝 **Заметка сохранена!**${privacy}\n` +
                 `📂 Категория: ${note.category}${tagsText}\n` +
                 `👤 Автор: ${note.authorName}\n` +
                 `🆔 ID: ${note.id}`;
        }
        
        case 'search': {
          const notes = this.searchNotes(args.query, args.room_id, args.author_name);
          if (notes.length === 0) {
            return `🔍 Заметки по запросу "${args.query}" не найдены`;
          }
          
          let result = `🔍 **Найдено заметок: ${notes.length}**\n\n`;
          notes.slice(0, 10).forEach((note, index) => {
            const privacy = note.isPrivate ? ' 🔒' : '';
            const preview = note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content;
            result += `${index + 1}. **${note.category}**${privacy} (${note.authorName})\n`;
            result += `   ${preview}\n\n`;
          });
          
          if (notes.length > 10) {
            result += `... и еще ${notes.length - 10} заметок\n`;
          }
          
          return result;
        }
        
        case 'get_by_category': {
          const notes = this.getNotesByCategory(args.category, args.room_id, args.author_name);
          if (notes.length === 0) {
            return `📂 В категории "${args.category}" пока нет заметок`;
          }
          
          let result = `📂 **Заметки в категории "${args.category}": ${notes.length}**\n\n`;
          notes.slice(0, 10).forEach((note, index) => {
            const privacy = note.isPrivate ? ' 🔒' : '';
            const preview = note.content.length > 80 ? note.content.substring(0, 80) + '...' : note.content;
            result += `${index + 1}. ${note.authorName}${privacy}: ${preview}\n`;
          });
          
          return result;
        }
        
        case 'get_all': {
          const notes = this.getAllNotes(args.room_id, args.author_name);
          if (notes.length === 0) {
            return `📋 В комнате пока нет заметок`;
          }
          
          // Группируем по категориям
          const categorized: Record<string, GameNote[]> = {};
          notes.forEach(note => {
            if (!categorized[note.category]) {
              categorized[note.category] = [];
            }
            categorized[note.category].push(note);
          });
          
          let result = `📋 **Все заметки (${notes.length}):**\n\n`;
          Object.entries(categorized).forEach(([category, categoryNotes]) => {
            result += `📂 **${category}** (${categoryNotes.length})\n`;
            categoryNotes.slice(0, 3).forEach(note => {
              const privacy = note.isPrivate ? ' 🔒' : '';
              const preview = note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content;
              result += `   • ${note.authorName}${privacy}: ${preview}\n`;
            });
            if (categoryNotes.length > 3) {
              result += `   ... и еще ${categoryNotes.length - 3}\n`;
            }
            result += '\n';
          });
          
          return result;
        }
        
        case 'update': {
          const success = this.updateNote(args.note_id, args.room_id, args.updates, args.author_name);
          if (!success) {
            return `❌ Не удалось обновить заметку с ID ${args.note_id}`;
          }
          return `✅ Заметка успешно обновлена`;
        }
        
        case 'delete': {
          const success = this.deleteNote(args.note_id, args.room_id, args.author_name);
          if (!success) {
            return `❌ Не удалось удалить заметку с ID ${args.note_id}`;
          }
          return `✅ Заметка успешно удалена`;
        }
        
        case 'get_categories': {
          const categories = this.getCategories(args.room_id);
          if (categories.length === 0) {
            return `📂 Пока нет категорий заметок`;
          }
          return `📂 **Категории заметок:** ${categories.join(', ')}`;
        }
        
        case 'get_tags': {
          const tags = this.getTags(args.room_id);
          if (tags.length === 0) {
            return `🏷️ Пока нет тегов`;
          }
          return `🏷️ **Доступные теги:** ${tags.join(', ')}`;
        }
        
        default:
          return `❌ Неизвестное действие: ${args.action}`;
      }
    } catch (error) {
      return `❌ Ошибка работы с заметками: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }
}
