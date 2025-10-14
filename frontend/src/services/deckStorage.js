// Detect if we're in production (online) or development (local)
const isProduction = import.meta.env.VITE_SERVER_URL?.includes('railway.app');
const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const deckStorage = {
  // Get all saved decks
  async getDecks() {
    if (isProduction) {
      // Online version - fetch from server
      try {
        const response = await fetch(`${API_URL}/api/decks`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching decks from server:', error);
        return [];
      }
    } else {
      // Local dev - use browser localStorage
      try {
        const saved = localStorage.getItem('inwo-saved-decks');
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.error('Error loading decks from localStorage:', error);
        return [];
      }
    }
  },

  // Save a new deck
  async saveDeck(deck) {
    if (isProduction) {
      // Online version - save to server
      try {
        const response = await fetch(`${API_URL}/api/decks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deck)
        });
        return await response.json();
      } catch (error) {
        console.error('Error saving deck to server:', error);
        throw error;
      }
    } else {
      // Local dev - save to localStorage
      try {
        const decks = await this.getDecks();
        const newDeck = { 
          ...deck, 
          id: Date.now().toString(),
          savedAt: new Date().toISOString()
        };
        decks.push(newDeck);
        localStorage.setItem('inwo-saved-decks', JSON.stringify(decks));
        return newDeck;
      } catch (error) {
        console.error('Error saving deck to localStorage:', error);
        throw error;
      }
    }
  },

  // Delete a deck
  async deleteDeck(deckId) {
    if (isProduction) {
      // Online version - delete from server
      try {
        await fetch(`${API_URL}/api/decks/${deckId}`, { 
          method: 'DELETE' 
        });
      } catch (error) {
        console.error('Error deleting deck from server:', error);
        throw error;
      }
    } else {
      // Local dev - delete from localStorage
      try {
        const decks = await this.getDecks();
        const filtered = decks.filter(d => d.id !== deckId);
        localStorage.setItem('inwo-saved-decks', JSON.stringify(filtered));
      } catch (error) {
        console.error('Error deleting deck from localStorage:', error);
        throw error;
      }
    }
  }
};