import React, { useState, useMemo } from 'react';
import Card from './Card';
import cardsData from '../cards.json';
import './DeckBuilder.css';

const DeckBuilder = ({ onStartGame }) => {
  const [selectedCards, setSelectedCards] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  // Organize cards by type in the order: illuminati, groups, resources, plots
  const organizedCards = useMemo(() => {
    let cards = cardsData.cards;
    
    // Search by name
    if (searchTerm) {
      cards = cards.filter(card => 
        card.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // If filter is active, only show that type
    if (filter !== 'all') {
      cards = cards.filter(card => card.type === filter);
      return { [filter]: cards };
    }
    
    // Organize by type
    const organized = {
      illuminati: cards.filter(c => c.type === 'illuminati'),
      groups: cards.filter(c => c.type === 'groups'),
      resources: cards.filter(c => c.type === 'resources'),
      plots: cards.filter(c => c.type === 'plots')
    };
    
    return organized;
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
    // Add card to deck (allow duplicates)
    setSelectedCards(prev => [...prev, card]);
  };

  const handleCardRightClick = (e, card) => {
    e.preventDefault();
    // Show preview on right-click
    setSelectedCard(card);
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

  const typeLabels = {
    illuminati: 'Illuminati',
    groups: 'Groups',
    resources: 'Resources',
    plots: 'Plots'
  };

  const typeColors = {
    illuminati: '#ffd700',
    groups: '#e24a4a',
    resources: '#8B4513',
    plots: '#4a90e2'
  };

  return (
    <div className="deck-builder">
      <div className="deck-builder-header">
        <div>
          <h1>Build Your Deck</h1>
          <p className="deck-instructions">
            <strong>Left-click</strong> to add • <strong>Right-click</strong> to preview • Multiple copies allowed
          </p>
        </div>
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
                className={filter === 'resources' ? 'active' : ''}
                onClick={() => setFilter('resources')}
              >
                Resources ({cardCounts.resources})
              </button>
              <button 
                className={filter === 'plots' ? 'active' : ''}
                onClick={() => setFilter('plots')}
              >
                Plots ({cardCounts.plots})
              </button>
            </div>
          </div>

          <div className="cards-organized">
            {Object.entries(organizedCards).map(([type, cards]) => (
              cards.length > 0 && (
                <div key={type} className="card-section">
                  <div 
                    className="section-header"
                    style={{ borderLeftColor: typeColors[type] }}
                  >
                    <h3>{typeLabels[type]}</h3>
                    <span className="card-count">{cards.length} cards</span>
                  </div>
                  <div className="cards-grid">
                    {cards.map(card => (
                      <div 
                        key={card.id}
                        onContextMenu={(e) => handleCardRightClick(e, card)}
                      >
                        <Card
                          card={card}
                          size="small"
                          onClick={() => handleCardClick(card)}
                          onDoubleClick={() => handleCardClick(card)}
                          draggable={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          {Object.values(organizedCards).every(arr => arr.length === 0) && (
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
              <p>Click cards to add them to your deck</p>
              <p className="deck-hint">💡 You can add multiple copies of the same card</p>
            </div>
          ) : (
            <>
              <div className="deck-cards">
                {selectedCards.map((card, index) => (
                  <div 
                    key={`deck-${index}`} 
                    className="deck-list-item"
                    onContextMenu={(e) => handleCardRightClick(e, card)}
                  >
                    <div className="deck-item-info">
                      <span className="card-name">{card.name}</span>
                      <span 
                        className="card-type-badge-small" 
                        style={{ background: typeColors[card.type] }}
                      >
                        {typeLabels[card.type]}
                      </span>
                    </div>
                    <button
                      className="remove-btn-list"
                      onClick={() => removeFromDeck(index)}
                      title="Remove from deck"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="deck-summary">
                <div className="type-counts">
                  {Object.keys(typeLabels).map(type => {
                    const count = selectedCards.filter(c => c.type === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="type-count" style={{ borderColor: typeColors[type] }}>
                        <span className="count">{count}</span>
                        <span className="label">{typeLabels[type]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <button className="clear-deck-btn" onClick={() => setSelectedCards([])}>
            Clear Deck
          </button>
        </div>

        {/* Card Preview */}
        {selectedCard && (
          <div className="card-preview" onClick={() => setSelectedCard(null)}>
            <div className="preview-content" onClick={(e) => e.stopPropagation()}>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckBuilder;
