// frontend/src/components/DeckBuilder.jsx
import React, { useState, useMemo, useEffect } from 'react';
import Card from './Card';
import cardsData from '../cards.json';
import './DeckBuilder.css';
import { deckStorage } from '../services/deckStorage';

const DeckBuilder = ({ onStartGame }) => {
  const [selectedCards, setSelectedCards] = useState([]);
  const [filter, setFilter] = useState('all');
  const [alignmentFilter, setAlignmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [savedDecks, setSavedDecks] = useState([]);

  // Load decks when component mounts
  useEffect(() => {
    loadDecks();
  }, []);

  // Reset alignment filter when card type filter changes
  useEffect(() => {
    if (filter !== 'groups') {
      setAlignmentFilter('all');
    }
  }, [filter]);

  const loadDecks = async () => {
    const decks = await deckStorage.getDecks();
    setSavedDecks(decks);
  };

  // Get all unique alignments from group cards
  const availableAlignments = useMemo(() => {
    const alignments = new Set();
    cardsData.cards
      .filter(card => card.type === 'groups' && card.alignment)
      .forEach(card => {
        card.alignment.forEach(align => alignments.add(align));
      });
    return Array.from(alignments).sort();
  }, []);

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
      
      // Apply alignment filter if on groups
      if (filter === 'groups' && alignmentFilter !== 'all') {
        cards = cards.filter(card => 
          card.alignment && card.alignment.includes(alignmentFilter)
        );
      }
      
      return { [filter]: cards };
    }
    
    // Organize by type - NO LIMITS
    const organized = {
      illuminati: cards.filter(c => c.type === 'illuminati'),
      groups: cards.filter(c => c.type === 'groups'),
      resources: cards.filter(c => c.type === 'resources'),
      plots: cards.filter(c => c.type === 'plots')
    };
    
    // Apply alignment filter to groups if needed
    if (alignmentFilter !== 'all') {
      organized.groups = organized.groups.filter(card =>
        card.alignment && card.alignment.includes(alignmentFilter)
      );
    }
    
    return organized;
  }, [filter, alignmentFilter, searchTerm]);

  // Get card counts by type and alignment
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

  // Get alignment counts
  const alignmentCounts = useMemo(() => {
    const counts = { all: 0 };
    cardsData.cards
      .filter(card => card.type === 'groups')
      .forEach(card => {
        counts.all++;
        if (card.alignment) {
          card.alignment.forEach(align => {
            counts[align] = (counts[align] || 0) + 1;
          });
        }
      });
    return counts;
  }, []);

  const handleCardClick = (card) => {
    setSelectedCards([...selectedCards, card]);
  };

  const removeFromDeck = (index) => {
    setSelectedCards(selectedCards.filter((_, i) => i !== index));
  };

  const handleCardRightClick = (e, card) => {
    e.preventDefault();
    setSelectedCard(card);
  };

  // Save deck using storage service
  const saveDeck = async () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name');
      return;
    }

    if (selectedCards.length === 0) {
      alert('Cannot save an empty deck');
      return;
    }

    const deck = {
      name: deckName.trim(),
      description: deckDescription.trim(),
      cards: selectedCards,
      cardCount: selectedCards.length
    };

    try {
      await deckStorage.saveDeck(deck);
      await loadDecks(); // Refresh the deck list
      alert(`Deck "${deck.name}" saved successfully!`);
      setShowSaveModal(false);
      setDeckName('');
      setDeckDescription('');
    } catch (error) {
      console.error('Error saving deck:', error);
      alert('Error saving deck. Please try again.');
    }
  };

  // Load deck from saved list
  const loadDeck = (deck) => {
    setSelectedCards(deck.cards);
    setShowLoadModal(false);
    alert(`Deck "${deck.name}" loaded successfully!`);
  };

  // Delete a saved deck
  const deleteDeck = async (deckId) => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      try {
        await deckStorage.deleteDeck(deckId);
        await loadDecks(); // Refresh the deck list
      } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Error deleting deck. Please try again.');
      }
    }
  };

  const handleStartGame = () => {
    if (selectedCards.length === 0) {
      alert('Please add some cards to your deck before starting!');
      return;
    }
    
    // Check if deck has at least one Illuminati card
    const hasIlluminati = selectedCards.some(card => card.type === 'illuminati');
    if (!hasIlluminati) {
      const confirmed = window.confirm('Your deck has no Illuminati card. Are you sure you want to continue?');
      if (!confirmed) return;
    }
    
    // Recommend 45 cards but don't enforce it
    if (selectedCards.length < 30) {
      const confirmed = window.confirm(`Your deck has ${selectedCards.length} cards. A typical deck has 45 cards. Continue anyway?`);
      if (!confirmed) return;
    }
    
    onStartGame(selectedCards);
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

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          <button className="save-load-btn save-btn" onClick={() => setShowSaveModal(true)}>
            💾 Save Deck
          </button>
          <button className="save-load-btn load-btn" onClick={() => setShowLoadModal(true)}>
            📂 Load Deck
          </button>
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

            {/* Alignment Filter - Only show when Groups filter is active */}
            {filter === 'groups' && (
              <div className="alignment-filters">
                <div className="filter-label">Filter by Alignment:</div>
                <div className="filter-buttons">
                  <button 
                    className={alignmentFilter === 'all' ? 'active' : ''}
                    onClick={() => setAlignmentFilter('all')}
                  >
                    All ({alignmentCounts.all})
                  </button>
                  {availableAlignments.map(alignment => (
                    <button 
                      key={alignment}
                      className={alignmentFilter === alignment ? 'active' : ''}
                      onClick={() => setAlignmentFilter(alignment)}
                    >
                      {alignment} ({alignmentCounts[alignment] || 0})
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              <p>No cards found matching your filters</p>
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

        {/* Save Deck Modal */}
        {showSaveModal && (
          <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>💾 Save Deck</h3>
                <button onClick={() => setShowSaveModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="deck-name">Deck Name *</label>
                  <input
                    id="deck-name"
                    type="text"
                    placeholder="Enter deck name..."
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    maxLength={50}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="deck-description">Description (Optional)</label>
                  <textarea
                    id="deck-description"
                    placeholder="Add a description for your deck..."
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    maxLength={200}
                    rows={3}
                  />
                </div>
                <div className="deck-info-summary">
                  <p><strong>{selectedCards.length}</strong> cards in deck</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>
                  Cancel
                </button>
                <button className="btn-save" onClick={saveDeck}>
                  Save Deck
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Deck Modal */}
        {showLoadModal && (
          <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
            <div className="modal-content load-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📂 Load Deck</h3>
                <button onClick={() => setShowLoadModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                {savedDecks.length === 0 ? (
                  <div className="no-saved-decks">
                    <p>No saved decks found</p>
                    <p className="hint">Save your current deck to see it here</p>
                  </div>
                ) : (
                  <div className="saved-decks-list">
                    {[...savedDecks].reverse().map(deck => (
                      <div key={deck.id} className="saved-deck-item">
                        <div className="saved-deck-info">
                          <h4>{deck.name}</h4>
                          {deck.description && (
                            <p className="deck-description">{deck.description}</p>
                          )}
                          <div className="deck-meta">
                            <span className="deck-card-count">
                              🎴 {deck.cardCount} cards
                            </span>
                            <span className="deck-date">
                              📅 {formatDate(deck.savedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="saved-deck-actions">
                          <button 
                            className="btn-load-deck"
                            onClick={() => loadDeck(deck)}
                          >
                            Load
                          </button>
                          <button 
                            className="btn-delete-deck"
                            onClick={() => deleteDeck(deck.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckBuilder;