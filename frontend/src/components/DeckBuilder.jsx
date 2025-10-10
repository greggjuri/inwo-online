import React, { useState, useMemo } from 'react';
import Card from './Card';
import cardsData from '../cards.json';
import './DeckBuilder.css';

const DeckBuilder = ({ onStartGame }) => {
  const [selectedCards, setSelectedCards] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  // Filter and search cards
  const filteredCards = useMemo(() => {
    let cards = cardsData.cards;
    
    // Filter by type
    if (filter !== 'all') {
      cards = cards.filter(card => card.type === filter);
    }
    
    // Search by name
    if (searchTerm) {
      cards = cards.filter(card => 
        card.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return cards;
  }, [filter, searchTerm]);

  // Get card counts by type
  const cardCounts = useMemo(() => {
    const counts = {
      all: cardsData.cards.length,
      illuminati: 0,
      groups: 0,
      plots: 0,
      resources: 0
    };
    
    cardsData.cards.forEach(card => {
      counts[card.type]++;
    });
    
    return counts;
  }, []);

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const handleCardDoubleClick = (card) => {
    // Add card to deck
    setSelectedCards(prev => [...prev, card]);
  };

  const removeFromDeck = (index) => {
    setSelectedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartGame = () => {
    if (selectedCards.length > 0) {
      onStartGame(selectedCards);
    } else {
      alert('Please select at least one card for your deck!');
    }
  };

  return (
    <div className="deck-builder">
      <div className="deck-builder-header">
        <h1>Build Your Deck</h1>
        <div className="header-actions">
          <button className="start-game-btn" onClick={handleStartGame}>
            Start Game ({selectedCards.length} cards)
          </button>
        </div>
      </div>

      <div className="deck-builder-content">
        {/* Card Collection */}
        <div className="card-collection">
          <div className="collection-controls">
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <div className="filter-buttons">
              <button 
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                All ({cardCounts.all})
              </button>
              <button 
                className={filter === 'illuminati' ? 'active' : ''}
                onClick={() => setFilter('illuminati')}
              >
                Illuminati ({cardCounts.illuminati})
              </button>
              <button 
                className={filter === 'groups' ? 'active' : ''}
                onClick={() => setFilter('groups')}
              >
                Groups ({cardCounts.groups})
              </button>
              <button 
                className={filter === 'plots' ? 'active' : ''}
                onClick={() => setFilter('plots')}
              >
                Plots ({cardCounts.plots})
              </button>
              <button 
                className={filter === 'resources' ? 'active' : ''}
                onClick={() => setFilter('resources')}
              >
                Resources ({cardCounts.resources})
              </button>
            </div>
          </div>

          <div className="cards-grid">
            {filteredCards.map(card => (
              <Card
                key={card.id}
                card={card}
                size="small"
                onClick={() => handleCardClick(card)}
                onDoubleClick={() => handleCardDoubleClick(card)}
              />
            ))}
          </div>

          {filteredCards.length === 0 && (
            <div className="no-cards">
              <p>No cards found matching "{searchTerm}"</p>
            </div>
          )}
        </div>

        {/* Selected Deck */}
        <div className="selected-deck">
          <h2>Your Deck ({selectedCards.length})</h2>
          
          {selectedCards.length === 0 ? (
            <div className="empty-deck">
              <p>Double-click cards to add them to your deck</p>
            </div>
          ) : (
            <div className="deck-cards">
              {selectedCards.map((card, index) => (
                <div key={`${card.id}-${index}`} className="deck-card-item">
                  <Card
                    card={card}
                    size="small"
                    onClick={() => setSelectedCard(card)}
                  />
                  <button
                    className="remove-btn"
                    onClick={() => removeFromDeck(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button className="clear-deck-btn" onClick={() => setSelectedCards([])}>
            Clear Deck
          </button>
        </div>

        {/* Card Preview */}
        {selectedCard && (
          <div className="card-preview">
            <div className="preview-header">
              <h3>{selectedCard.name}</h3>
              <button onClick={() => setSelectedCard(null)}>✕</button>
            </div>
            <Card
              card={selectedCard}
              size="large"
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckBuilder;