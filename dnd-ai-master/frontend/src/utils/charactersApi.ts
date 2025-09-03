// API клиент для работы с персонажами
export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  hitPoints: {
    current: number;
    maximum: number;
    temporary: number;
  };
  armorClass: number;
  speed: number;
  proficiencyBonus: number;
  skills: Record<string, number>;
  savingThrows: Record<string, number>;
  roomId: string;
  playerName: string;
  created: string;
  lastUpdated: string;
}

export interface CreateCharacterData {
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
}

class CharactersApiClient {
  private baseUrl = '/api/characters';

  async createCharacter(data: CreateCharacterData): Promise<Character> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getCharacters(roomId: string): Promise<Character[]> {
    const response = await fetch(`${this.baseUrl}?roomId=${encodeURIComponent(roomId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getCharacter(id: string, roomId: string): Promise<Character> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}?roomId=${encodeURIComponent(roomId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updateCharacter(id: string, roomId: string, updates: Partial<Character>): Promise<Character> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId, updates }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const charactersApi = new CharactersApiClient();
