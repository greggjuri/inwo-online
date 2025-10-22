// frontend/src/components/GameBoard.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import Card from './Card';
import Dice3D from './Dice';
import './Dice.css';
import './GameBoard.css';

const GameBoard = ({ roomId, playerName, playerDeck }) => {
// Board configuration constants
  const BOARD_CONFIG = {
    width: 2400,
    height: 1200,
    nwoZone: {
      width: 120,
      height: 167,
      gap: 20,
      colors: ['red', 'yellow', 'blue']
    },
    playerColors: [
      'rgba(59, 130, 246, 0.08)',   // blue
      'rgba(239, 68, 68, 0.08)',    // red
      'rgba(34, 197, 94, 0.08)',    // green
      'rgba(168, 85, 247, 0.08)'    // purple
    ],
    playerColorsBright: [
      'rgba(59, 130, 246, 0.3)',    // blue
      'rgba(239, 68, 68, 0.3)',     // red
      'rgba(34, 197, 94, 0.3)',     // green
      'rgba(168, 85, 247, 0.3)'     // purple
    ]
  };

// Calculate player zones for 2-4 players
  const getPlayerZones = (playerCount, myPlayerId, allPlayers) => {
    const myIndex = allPlayers.findIndex(p => p.id === myPlayerId);
    const zones = {};
    
    if (playerCount === 2) {
      // Side by side layout
      for (let i = 0; i < 2; i++) {
        const isMyZone = i === myIndex;
        zones[isMyZone ? 'myZone' : `player${i}`] = {
          x: i === 0 ? 0 : BOARD_CONFIG.width / 2,
          y: 0,
          width: BOARD_CONFIG.width / 2,
          height: BOARD_CONFIG.height,
          color: BOARD_CONFIG.playerColors[i],
          playerId: allPlayers[i].id,
          playerName: allPlayers[i].name,
          colorIndex: i
        };
      }
    } else if (playerCount === 3) {
      // Two on top, one on bottom (wider)
      const topWidth = BOARD_CONFIG.width / 2;
      const topHeight = BOARD_CONFIG.height / 2;
      const bottomHeight = BOARD_CONFIG.height / 2;
      
      for (let i = 0; i < 3; i++) {
        const isMyZone = i === myIndex;
        let zoneConfig;
        
        if (i < 2) {
          // Top two zones
          zoneConfig = {
            x: i === 0 ? 0 : topWidth,
            y: 0,
            width: topWidth,
            height: topHeight,
            color: BOARD_CONFIG.playerColors[i],
            playerId: allPlayers[i].id,
            playerName: allPlayers[i].name,
            colorIndex: i
          };
        } else {
          // Bottom zone (full width)
          zoneConfig = {
            x: 0,
            y: topHeight,
            width: BOARD_CONFIG.width,
            height: bottomHeight,
            color: BOARD_CONFIG.playerColors[i],
            playerId: allPlayers[i].id,
            playerName: allPlayers[i].name,
            colorIndex: i
          };
        }
        
        zones[isMyZone ? 'myZone' : `player${i}`] = zoneConfig;
      }
    } else if (playerCount === 4) {
      // Quadrant layout (2x2 grid)
      const quadWidth = BOARD_CONFIG.width / 2;
      const quadHeight = BOARD_CONFIG.height / 2;
      
      for (let i = 0; i < 4; i++) {
        const isMyZone = i === myIndex;
        const row = Math.floor(i / 2);
        const col = i % 2;
        
        zones[isMyZone ? 'myZone' : `player${i}`] = {
          x: col * quadWidth,
          y: row * quadHeight,
          width: quadWidth,
          height: quadHeight,
          color: BOARD_CONFIG.playerColors[i],
          playerId: allPlayers[i].id,
          playerName: allPlayers[i].name,
          colorIndex: i
        };
      }
    }
    
    return zones;
  };
  const { socket } = useSocket();
  const [players, setPlayers] = useState([]);
  const [gamePhase, setGamePhase] = useState('setup');
  const [hand, setHand] = useState([]);
  const [groupResourcePile, setGroupResourcePile] = useState([]);
  const [plotPile, setPlotPile] = useState([]);
  const [sharedPlayArea, setSharedPlayArea] = useState([]);
  const [diceResults, setDiceResults] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [setupReady, setSetupReady] = useState(false);
  const [showTopCards, setShowTopCards] = useState(null);
  const [opponentHandCounts, setOpponentHandCounts] = useState({
    illuminati: 0,
    groups: 0,
    resources: 0,
    plots: 0
  });
  const [nwoCards, setNwoCards] = useState({
  red: null,
  yellow: null,
  blue: null
  });
  const [playerZones, setPlayerZones] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(2); // Default to 2 players
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  const [groupResourceDiscard, setGroupResourceDiscard] = useState([]);
  const [plotDiscard, setPlotDiscard] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);  
  const [turnNumber, setTurnNumber] = useState(1);
  const cardsContainerRef = useRef(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Fullscreen toggle
      if (e.key === 'f' || e.key === 'F') {
        setIsFullscreenView(prev => !prev);
      }
      if (e.key === 'Escape' && isFullscreenView) {
        setIsFullscreenView(false);
      }
      // Zoom controls
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(prev => Math.min(prev + 0.1, 2));
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(prev => Math.max(prev - 0.1, 0.5));
      }
      if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreenView]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        setZoom(prev => Math.min(Math.max(0.5, prev + delta), 2));
      }
    };

    const playArea = document.querySelector('.shared-play-area');
    if (playArea) {
      playArea.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        playArea.removeEventListener('wheel', handleWheel);
      };
    }
  }, []); // Empty dependency array - only run once on mount
  
  useEffect(() => {
    if (!socket || !playerDeck || playerDeck.length === 0) return;

    socket.emit('join-room', { roomId, playerName });

    const illuminati = playerDeck.filter(c => c.type === 'illuminati');
    const groups = playerDeck.filter(c => c.type === 'groups');
    const resources = playerDeck.filter(c => c.type === 'resources');
    const plots = playerDeck.filter(c => c.type === 'plots');

    const shuffledPlots = [...plots].sort(() => Math.random() - 0.5);
    const initialHand = [...illuminati, ...groups, ...shuffledPlots.slice(0, 3)];
    
    setHand(initialHand);
    setPlotPile(shuffledPlots.slice(3));
    setGroupResourcePile([...groups, ...resources]);

    socket.on('room-joined', ({ players: roomPlayers }) => {
      setPlayers(roomPlayers);
      if (roomPlayers.length >= 2) {
        setPlayerZones(getPlayerZones(roomPlayers.length, socket.id, roomPlayers));
      }
    });

    socket.on('player-joined', ({ playerId, playerName: newPlayerName }) => {
      setPlayers(prev => {
        const exists = prev.find(p => p.id === playerId);
        if (exists) return prev;
        return [...prev, { id: playerId, name: newPlayerName }];
      });
      
      setPlayers(prev => {
        if (prev.length >= 2) {
          setPlayerZones(getPlayerZones(prev.length, socket.id, prev));
        }
        return prev;
      });
    });

    socket.on('card-moved', ({ playerId, card, to, position, rotation, tokens }) => {
      if (to === 'play-area') {
        setSharedPlayArea(prev => [...prev, { ...card, position, playerId, rotation: rotation || 0, tokens: tokens || 0 }]);
      }
    });

    socket.on('card-updated', ({ playerId, cardIndex, rotation, tokens }) => {
      setSharedPlayArea(prev => {
        const updated = [...prev];
        if (updated[cardIndex]) {
          updated[cardIndex] = {
            ...updated[cardIndex],
            rotation: rotation !== undefined ? rotation : updated[cardIndex].rotation || 0,
            tokens: tokens !== undefined ? tokens : updated[cardIndex].tokens || 0
          };
        }
        return updated;
      });
    });

    socket.on('card-position-updated', ({ playerId, cardIndex, position }) => {
      setSharedPlayArea(prev => {
        const updated = [...prev];
        if (updated[cardIndex]) {
          updated[cardIndex] = { ...updated[cardIndex], position };
        }
        return updated;
      });
    });

    socket.on('card-removed', ({ playerId, cardIndex }) => {
      setSharedPlayArea(prev => prev.filter((_, i) => i !== cardIndex));
    });

    socket.on('dice-rolled', ({ dice1, dice2 }) => {
      setDiceResults([dice1, dice2]);
    });

    socket.on('dice-closed', () => {
      setDiceResults(null);
    });

    socket.on('player-left', ({ playerId }) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    socket.on('opponent-hand-update', ({ playerId, handCounts }) => {
      if (playerId !== socket.id) {
        setOpponentHandCounts(handCounts);
      }
    });

    socket.on('show-card-to-all', ({ card }) => {
      setPreviewCard(card);
    });

    socket.on('game-started', ({ currentTurn: newCurrentTurn, startingPlayerName, turnNumber: newTurnNumber }) => {
      setCurrentTurn(newCurrentTurn);
      setTurnNumber(newTurnNumber);
      setGamePhase('playing');
      alert(`Game started! ${startingPlayerName} goes first!`);
    });

    socket.on('turn-changed', ({ currentTurn: newCurrentTurn }) => {
      setCurrentTurn(newCurrentTurn);
    });

    socket.on('turn-number-updated', ({ turnNumber: newTurnNumber }) => {
      setTurnNumber(newTurnNumber);
    });

    socket.on('nwo-played', ({ color, card }) => {
      setNwoCards(prev => ({ ...prev, [color]: card }));
    });

    socket.on('nwo-removed', ({ color }) => {
      setNwoCards(prev => ({ ...prev, [color]: null }));
    });

    return () => {
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('card-moved');
      socket.off('card-updated');
      socket.off('card-position-updated');
      socket.off('card-removed');
      socket.off('dice-rolled');
      socket.off('dice-closed');
      socket.off('player-left');
      socket.off('opponent-hand-update');
      socket.off('show-card-to-all');
      socket.off('game-started');
      socket.off('turn-changed');
      socket.off('turn-number-updated');
      socket.off('nwo-played');
      socket.off('nwo-removed');
    };
  }, [socket, roomId, playerName, playerDeck]);

  const groupedHand = useMemo(() => {
    const groups = { illuminati: [], groups: [], resources: [], plots: [] };
    hand.forEach((card, index) => {
      groups[card.type].push({ card, originalIndex: index });
    });
    return groups;
  }, [hand]);

  useEffect(() => {
    if (!socket) return;
    const counts = {
      illuminati: groupedHand.illuminati.length,
      groups: groupedHand.groups.length,
      resources: groupedHand.resources.length,
      plots: groupedHand.plots.length
    };
    socket.emit('hand-update', { roomId, handCounts: counts });
  }, [hand, socket, roomId, groupedHand]);

const handleSetupDone = () => {
  const myPlayedCards = sharedPlayArea.filter(c => c.playerId === socket.id);
  const hasIlluminati = myPlayedCards.some(c => c.type === 'illuminati');
  const hasGroup = myPlayedCards.some(c => c.type === 'groups');
  
  if (!hasIlluminati || !hasGroup) {
    alert('Please place 1 Illuminati card and 1 Group card on the play area before clicking Done.');
    return;
  }

  const playedCardIds = myPlayedCards.map(c => c.id);
  const remainingHand = hand.filter(c => !playedCardIds.includes(c.id));
  const remainingGroups = remainingHand.filter(c => c.type === 'groups');
  const resources = playerDeck.filter(c => c.type === 'resources');
  const groupResourceDeck = [...remainingGroups, ...resources].sort(() => Math.random() - 0.5);
  const drawn = groupResourceDeck.slice(0, 6);
  const remainingGroupResource = groupResourceDeck.slice(6);
  const plots = remainingHand.filter(c => c.type === 'plots');
    setHand([...plots, ...drawn]);
    setGroupResourcePile(remainingGroupResource);
    setSetupReady(true);
  
  // Notify server that this player is ready
  socket.emit('setup-done', { roomId });
};

const endTurn = () => {
  socket.emit('end-turn', { roomId });
};

  const drawFromGroupResource = () => {
    if (groupResourcePile.length === 0) return;
    setHand(prev => [...prev, groupResourcePile[0]]);
    setGroupResourcePile(prev => prev.slice(1));
  };

  const showTopGroupResource = () => {
    if (groupResourcePile.length === 0) return;
    const topCard = groupResourcePile[0];
    setPreviewCard(topCard);
    socket.emit('show-card-to-all', { roomId, card: topCard });
  };

  const drawFromPlots = () => {
    if (plotPile.length === 0) return;
    setHand(prev => [...prev, plotPile[0]]);
    setPlotPile(prev => prev.slice(1));
  };

  const drawFromPlotsBottom = () => {
    if (plotPile.length === 0) return;
    setHand(prev => [...prev, plotPile[plotPile.length - 1]]);
    setPlotPile(prev => prev.slice(0, -1));
  };

  const discardTopPlot = () => {
  if (plotPile.length === 0) return;
  const discarded = plotPile[0];
  setPlotDiscard(prev => [...prev, discarded]);
  setPlotPile(prev => prev.slice(1));
};

const discardTop2Plots = () => {
  if (plotPile.length === 0) return;
  const count = Math.min(2, plotPile.length);
  const discarded = plotPile.slice(0, count);
  setPlotDiscard(prev => [...prev, ...discarded]);
  setPlotPile(prev => prev.slice(count));
};

const discardTopPlotBlind = () => {
  if (plotPile.length === 0) return;
  setPlotDiscard(prev => [...prev, plotPile[0]]);
  setPlotPile(prev => prev.slice(1));
};

const discardTop2PlotsBlind = () => {
  if (plotPile.length === 0) return;
  const count = Math.min(2, plotPile.length);
  setPlotDiscard(prev => [...prev, ...plotPile.slice(0, count)]);
  setPlotPile(prev => prev.slice(count));
};
  const showTopPlot = () => {
    if (plotPile.length === 0) return;
    setShowTopCards([plotPile[0]]);
  };

  const showTopThreePlots = () => {
    if (plotPile.length === 0) return;
    setShowTopCards(plotPile.slice(0, Math.min(3, plotPile.length)));
  };

  const playCard = (card, originalIndex, position = null) => {
    setHand(prev => prev.filter((_, i) => i !== originalIndex));
    const finalPosition = position || { x: Math.random() * 500, y: Math.random() * 300 };
    const newCard = { ...card, position: finalPosition, rotation: 0, tokens: 0, playerId: socket.id };
    setSharedPlayArea(prev => [...prev, newCard]);
    socket.emit('move-card', { roomId, card, from: 'hand', to: 'play-area', position: finalPosition, rotation: 0, tokens: 0 });
  };

  const returnToHand = (card, index) => {
    setSharedPlayArea(prev => prev.filter((_, i) => i !== index));
    const { position, rotation, tokens, playerId, ...cleanCard } = card;
    setHand(prev => [...prev, cleanCard]);
    socket.emit('remove-card', { roomId, cardIndex: index });
  };

  const discardFromHand = (card, originalIndex) => {
    setHand(prev => prev.filter((_, i) => i !== originalIndex));
    const discardType = (card.type === 'groups' || card.type === 'resources') ? 'group-resource' : 'plot';
    if (discardType === 'group-resource') {
      setGroupResourceDiscard(prev => [...prev, card]);
    } else {
      setPlotDiscard(prev => [...prev, card]);
    }
  };

  const discardFromPlay = (card, index) => {
    setSharedPlayArea(prev => prev.filter((_, i) => i !== index));
    const { position, rotation, tokens, playerId, ...cleanCard } = card;
    const discardType = (cleanCard.type === 'groups' || cleanCard.type === 'resources') ? 'group-resource' : 'plot';
    if (discardType === 'group-resource') {
      setGroupResourceDiscard(prev => [...prev, cleanCard]);
    } else {
      setPlotDiscard(prev => [...prev, cleanCard]);
    }
    socket.emit('remove-card', { roomId, cardIndex: index });
  };

  const showTopDiscard = (discardType) => {
    const pile = discardType === 'group-resource' ? groupResourceDiscard : plotDiscard;
    if (pile.length === 0) return;
    const topCard = pile[pile.length - 1];
    setPreviewCard(topCard);
  };

  const handleCardRotate = (index) => {
    setSharedPlayArea(prev => {
      const updated = [...prev];
      const newRotation = ((updated[index].rotation || 0) + 90) % 360;
      updated[index] = { ...updated[index], rotation: newRotation };
      socket.emit('update-card', { roomId, cardIndex: index, rotation: newRotation });
      return updated;
    });
  };

  const handleTokenChange = (index, newTokenCount) => {
    setSharedPlayArea(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], tokens: newTokenCount };
      socket.emit('update-card', { roomId, cardIndex: index, tokens: newTokenCount });
      return updated;
    });
  };

  const handleDragStart = (e, card, originalIndex, source = 'play-area') => {
    if (source === 'play-area') {
      const containerRect = cardsContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      setDragOffset({ 
        x: mouseX - card.position.x, 
        y: mouseY - card.position.y 
      });
    }
    setDraggedCard({ card, index: originalIndex, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!draggedCard || !cardsContainerRef.current) return;

    const containerRect = cardsContainerRef.current.getBoundingClientRect();
    let x, y;
    
    if (draggedCard.source === 'hand') {
      x = e.clientX - containerRect.left - 60;
      y = e.clientY - containerRect.top - 83.5;
    } else {
      x = e.clientX - containerRect.left - dragOffset.x;
      y = e.clientY - containerRect.top - dragOffset.y;
    }
    
    x = Math.max(-50, Math.min(x, containerRect.width - 70));
    y = Math.max(-50, Math.min(y, containerRect.height - 117));

    if (draggedCard.source === 'hand') {
      playCard(draggedCard.card, draggedCard.index, { x, y });
    } else {
      setSharedPlayArea(prev => {
        const updated = [...prev];
        updated[draggedCard.index] = { ...updated[draggedCard.index], position: { x, y } };
        socket.emit('update-card-position', { roomId, cardIndex: draggedCard.index, position: { x, y } });
        return updated;
      });
    }
    setDraggedCard(null);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setIsDragOver(false);
  };

  const roll2D6 = () => {
    socket.emit('roll-dice', { roomId, sides: 6 });
  };

  const closeDice = () => {
    socket.emit('close-dice', { roomId });
    setDiceResults(null);
  };

const handleRightClick = (e, card, index = null, source = 'hand') => {
  e.preventDefault();
  
  const showContextMenu = () => {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.zIndex = '10000';
    
    const createSubmenu = (items, parentBtn) => {
      const submenu = document.createElement('div');
      submenu.className = 'context-submenu';
      submenu.style.display = 'none'; // Hidden by default
      
      items.forEach(item => {
        const btn = document.createElement('button');
        btn.textContent = item.text;
        btn.onclick = (e) => {
          e.stopPropagation();
          item.action();
          document.body.removeChild(menu);
        };
        submenu.appendChild(btn);
      });
      
      // Click handler for parent to toggle submenu
      parentBtn.onclick = (e) => {
        e.stopPropagation();
        
        // Close all other submenus
        menu.querySelectorAll('.context-submenu').forEach(sub => {
          if (sub !== submenu) {
            sub.style.display = 'none';
          }
        });
        
        // Toggle this submenu
        submenu.style.display = submenu.style.display === 'none' ? 'flex' : 'none';
      };
      
      return submenu;
    };
    
    if (source === 'group-resource-pile') {
      // Group/Resource pile menu
      const drawBtn = document.createElement('button');
      drawBtn.textContent = '📥 Draw';
      drawBtn.className = 'menu-parent';
      const drawSubmenu = createSubmenu([
        { text: '📥 Draw 1', action: drawFromGroupResource }
      ], drawBtn);
      drawBtn.appendChild(drawSubmenu);
      menu.appendChild(drawBtn);
      
      const showBtn = document.createElement('button');
      showBtn.textContent = '👁️ Show';
      showBtn.className = 'menu-parent';
      const showSubmenu = createSubmenu([
        { 
          text: '👁️ Show 1 (self)', 
          action: () => {
            if (groupResourcePile.length > 0) {
              setPreviewCard(groupResourcePile[0]);
            }
          }
        }
      ], showBtn);
      showBtn.appendChild(showSubmenu);
      menu.appendChild(showBtn);
      
    } else if (source === 'plot-pile') {
      // Plot pile menu
      const drawBtn = document.createElement('button');
      drawBtn.textContent = '📥 Draw';
      drawBtn.className = 'menu-parent';
      const drawSubmenu = createSubmenu([
        { text: '📥 Top', action: drawFromPlots },
        { text: '📥 Bottom', action: drawFromPlotsBottom }
      ], drawBtn);
      drawBtn.appendChild(drawSubmenu);
      menu.appendChild(drawBtn);
      
      const showBtn = document.createElement('button');
      showBtn.textContent = '👁️ Show';
      showBtn.className = 'menu-parent';
      const showSubmenu = createSubmenu([
        { text: '👁️ Show top (self)', action: showTopPlot },
        { text: '👁️ Show top 3 (self)', action: showTopThreePlots }
      ], showBtn);
      showBtn.appendChild(showSubmenu);
      menu.appendChild(showBtn);
      
      const discardBtn = document.createElement('button');
      discardBtn.textContent = '🗑️ Discard';
      discardBtn.className = 'menu-parent';
      const discardSubmenu = createSubmenu([
        { 
          text: '🗑️ Discard top', 
          action: () => {
            if (plotPile.length > 0) {
              setPreviewCard(plotPile[0]);
              setTimeout(() => {
                discardTopPlot();
                setPreviewCard(null);
              }, 1500);
            }
          }
        },
        { 
          text: '🗑️ Discard top 2', 
          action: () => {
            if (plotPile.length > 0) {
              const cardsToShow = plotPile.slice(0, Math.min(2, plotPile.length));
              setShowTopCards(cardsToShow);
              setTimeout(() => {
                discardTop2Plots();
                setShowTopCards(null);
              }, 2000);
            }
          }
        },
        { text: '🗑️ Discard top blind', action: discardTopPlotBlind },
        { text: '🗑️ Discard top 2 blind', action: discardTop2PlotsBlind }
      ], discardBtn);
      discardBtn.appendChild(discardSubmenu);
      menu.appendChild(discardBtn);
      
    } else {
      // Original card menu
      const previewBtn = document.createElement('button');
      previewBtn.textContent = '👁️ Preview';
      previewBtn.onclick = () => {
        setPreviewCard(card);
        document.body.removeChild(menu);
      };
      menu.appendChild(previewBtn);
      
      if (source === 'hand') {
        const discardBtn = document.createElement('button');
        discardBtn.textContent = '🗑️ Discard';
        discardBtn.onclick = () => {
          discardFromHand(card, index);
          document.body.removeChild(menu);
        };
        menu.appendChild(discardBtn);
      } else if (source === 'play-area') {
        const discardBtn = document.createElement('button');
        discardBtn.textContent = '🗑️ Discard';
        discardBtn.onclick = () => {
          discardFromPlay(card, index);
          document.body.removeChild(menu);
        };
        menu.appendChild(discardBtn);
        
        const returnBtn = document.createElement('button');
        returnBtn.textContent = '↩️ Return to Hand';
        returnBtn.onclick = () => {
          returnToHand(card, index);
          document.body.removeChild(menu);
        };
        menu.appendChild(returnBtn);
      }
    }
    
    document.body.appendChild(menu);
    
    // Position the menu
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let left = e.clientX;
    let top = e.clientY - menuRect.height; // Position so click is at the bottom of menu
    
    // Adjust horizontal position if menu would overflow right edge
    if (left + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 10;
    }
    
    // Ensure menu doesn't go left of viewport
    if (left < 10) {
      left = 10;
    }
    
    // Ensure menu doesn't go above viewport (if menu is taller than available space)
    if (top < 10) {
      top = 10;
    }
    
    // If menu would still overflow bottom (shouldn't happen with bottom positioning, but just in case)
    if (top + menuRect.height > viewportHeight) {
      top = viewportHeight - menuRect.height - 10;
    }
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
  };
  
  showContextMenu();
};

  const closePreview = () => {
    setPreviewCard(null);
  };

  const handleNWODrop = (e, color) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (!draggedCard || draggedCard.source !== 'hand') return;
  
  const card = draggedCard.card;
  
  setNwoCards(prev => ({ ...prev, [color]: card }));
  setHand(prev => prev.filter((_, i) => i !== draggedCard.index));
  
  socket.emit('play-nwo', { roomId, color, card });
  setDraggedCard(null);
};

const removeNWO = (color) => {
  if (!nwoCards[color]) return;
  
  const card = nwoCards[color];
  setNwoCards(prev => ({ ...prev, [color]: null }));
  setHand(prev => [...prev, card]);
  
  socket.emit('remove-nwo', { roomId, color });
};

  return (
    <div className={`game-board-container ${isFullscreenView ? 'fullscreen-mode' : ''}`}>
      {!isFullscreenView && (
        <div className="game-header">
        <div className="room-info">
          <h2>{roomId}</h2>
    <div className="players">
      {players.map((player, index) => {
        const isCurrentTurn = currentTurn === player.id;
        const isMe = player.id === socket?.id;
        const colorNames = ['blue', 'red', 'green', 'purple'];
        const playerColor = colorNames[index] || 'blue';
        return (
          <span 
            key={player.id} 
            className={`player-badge ${isCurrentTurn ? 'current-turn' : ''} player-${playerColor}`}
          >
            {player.name}{isMe ? ' (You)' : ''}
          </span>
        );
      })}
    </div>
          {gamePhase === 'playing' && (
            <>
              <button className="dice-button" onClick={roll2D6}>🎲 2D6</button>
              <button className="view-board-button" onClick={() => setIsFullscreenView(true)}>
                👁️ View Board
              </button>
              {/* ADD THESE ZOOM CONTROLS: */}
              <div className="zoom-controls">
                <button className="zoom-button" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}>
                  🔍−
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button className="zoom-button" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}>
                  🔍+
                </button>
                <button className="zoom-button" onClick={() => setZoom(1)}>
                  ⊙
                </button>
              </div>
              {currentTurn === socket?.id && (
                <button className="knock-button" onClick={endTurn}>
                  👊 KNOCK
                </button>
              )}
            </>
          )}
          {gamePhase === 'setup' && (
            <button className="setup-done-button" onClick={handleSetupDone}>✓ Done</button>
          )}
        </div>

                <div className="room-info">
                  {gamePhase === 'playing' && (
                    <div className="turn-counter">
                      <span className="turn-icon">🔄</span>
                      <span className="turn-text">Turn {turnNumber}</span>
                    </div>
                  )}
                 {(opponentHandCounts.illuminati + opponentHandCounts.groups + opponentHandCounts.resources + opponentHandCounts.plots) > 0 && (
                    <div className="opponent-hand-info">
              <span style={{ fontWeight: 'bold' }}>Opp:</span>
              {opponentHandCounts.illuminati > 0 && (
                <div className="hand-type-count">
                  <span className="icon">👁️</span>
                  <span className="count">{opponentHandCounts.illuminati}</span>
                </div>
              )}
              {opponentHandCounts.groups > 0 && (
                <div className="hand-type-count">
                  <span className="icon">👥</span>
                  <span className="count">{opponentHandCounts.groups}</span>
                </div>
              )}
              {opponentHandCounts.resources > 0 && (
                <div className="hand-type-count">
                  <span className="icon">💎</span>
                  <span className="count">{opponentHandCounts.resources}</span>
                </div>
              )}
              {opponentHandCounts.plots > 0 && (
                <div className="hand-type-count">
                  <span className="icon">📋</span>
                  <span className="count">{opponentHandCounts.plots}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {!isFullscreenView && gamePhase === 'setup' && (
        <div className="setup-instructions">
          <p>📋 Place 1 Illuminati card and 1 Group card on the play area, then click "Done"</p>
        </div>
      )}

      {diceResults && (
        <div className="dice-popup-overlay" onClick={closeDice}>
          <div className="dice-container">
            <Dice3D value={diceResults[0]} />
            <Dice3D value={diceResults[1]} />
          </div>
          <div className="dice-popup-hint">Click anywhere to close</div>
        </div>
      )}

      {previewCard && (
        <div className="card-preview-overlay" onClick={closePreview}>
          <div className="card-preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewCard.name}</h3>
              <button className="preview-close" onClick={closePreview}>✕</button>
            </div>
            <Card card={previewCard} size="large" draggable={false} />
          </div>
        </div>
      )}

      {showTopCards && (
        <div className="card-preview-overlay" onClick={() => setShowTopCards(null)}>
          <div className="card-preview-content show-multiple" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>Top {showTopCards.length} Card{showTopCards.length > 1 ? 's' : ''} (Private View)</h3>
              <button className="preview-close" onClick={() => setShowTopCards(null)}>✕</button>
            </div>
            <div className="multiple-cards-display">
              {showTopCards.map((card, index) => (
                <div key={`top-${index}`} className="preview-card-item">
                  <Card card={card} size="large" draggable={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="play-area">
        <div className={`shared-play-area ${isDragOver ? 'drag-over' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* Find and REPLACE: <div className="cards-container" ref={cardsContainerRef}> */}
      <div 
        className="cards-container" 
        ref={cardsContainerRef}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease'
        }}
      >
        {/* Player Zones */}
        {playerZones && (
          <>
            {Object.entries(playerZones).map(([key, zone]) => (
              <div 
                key={key}
                className={`player-zone ${key === 'myZone' ? 'my-zone' : ''}`}
                style={{
                  left: zone.x + 'px',
                  top: zone.y + 'px',
                  width: zone.width + 'px',
                  height: zone.height + 'px',
                  backgroundColor: zone.color,
                  borderColor: BOARD_CONFIG.playerColorsBright[zone.colorIndex]
                }}
              >
                <div className="zone-label">{zone.playerName}</div>
              </div>
            ))}
          </>
        )}

        {/* NWO Zone */}
        <div className="nwo-zone">
          {BOARD_CONFIG.nwoZone.colors.map(color => (
            <div 
              key={color}
              className={`nwo-slot ${color} ${nwoCards[color] ? 'filled' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => handleNWODrop(e, color)}
            >
              {nwoCards[color] ? (
                <div className="nwo-card-wrapper">
                  <Card 
                    card={nwoCards[color]} 
                    size="small" 
                    draggable={false}
                    onDoubleClick={() => removeNWO(color)}
                  />
                </div>
              ) : (
                <>
                  <span>NWO</span>
                  <span className="nwo-slot-label">{color}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Existing played cards - KEEP AS IS */}
        {sharedPlayArea.map((card, index) => {
          const isDragging = draggedCard && draggedCard.index === index && draggedCard.source === 'play-area';
          return (
            <div key={`play-${index}`} className={`played-card ${isDragging ? 'dragging-card' : ''}`} style={{ left: card.position.x + 'px', top: card.position.y + 'px' }} onContextMenu={(e) => handleRightClick(e, card, index, 'play-area')}>
              <Card card={card} size="small" rotation={card.rotation || 0} tokens={card.tokens || 0} onRotate={() => handleCardRotate(index)} onTokenChange={(tokens) => handleTokenChange(index, tokens)} onDoubleClick={() => returnToHand(card, index)} draggable={true} onDragStart={(e) => handleDragStart(e, card, index, 'play-area')} onDragEnd={handleDragEnd} />
            </div>
          );
        })}
        
        {/* Keep existing empty-area div */}
      </div>
          {sharedPlayArea.length === 0 && (
            <div className="empty-area">
              <div className="empty-area-icon">🎯</div>
              <p>{gamePhase === 'setup' ? 'Place your Illuminati and 1 Group card here' : 'Click or drag cards from your hand to play them here'}</p>
            </div>
          )}
        </div>
      </div>

      {isFullscreenView && (
        <button className="exit-fullscreen-button" onClick={() => setIsFullscreenView(false)}>
          ✕ Exit View
        </button>
      )}

      {!isFullscreenView && (
        <div className="hand">
        {gamePhase === 'playing' && (
          <div className="draw-piles">
            <div className="pile-section">
              <div 
                className="draw-pile" 
                onContextMenu={(e) => groupResourcePile.length > 0 && handleRightClick(e, null, null, 'group-resource-pile')}
                title="Right-click for options"
              >
                <div className="card-back">
                  <img src={`${import.meta.env.BASE_URL}cards/group-back.webp`} alt="Groups/Resources" className="card-back-image" />
                  <div className="pile-count">{groupResourcePile.length}</div>
                </div>
              </div>
            </div>

            <div className="pile-section">
              <div 
                className="draw-pile"
                onContextMenu={(e) => plotPile.length > 0 && handleRightClick(e, null, null, 'plot-pile')}
                title="Right-click for options"
              >
                <div className="card-back">
                  <img src={`${import.meta.env.BASE_URL}cards/plot-back.webp`} alt="Plots" className="card-back-image" />
                  <div className="pile-count">{plotPile.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="hand-section">
          <div className="hand-cards">
            {groupedHand.illuminati.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.illuminati.map(({ card, originalIndex }) => (
                  <div key={`hand-illuminati-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card, originalIndex, 'hand')}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
                  </div>
                ))}
              </div>
            )}
            
            {groupedHand.groups.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.groups.map(({ card, originalIndex }) => (
                  <div key={`hand-groups-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card, originalIndex, 'hand')}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
                  </div>
                ))}
              </div>
            )}
            
            {groupedHand.resources.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.resources.map(({ card, originalIndex }) => (
                  <div key={`hand-resources-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card, originalIndex, 'hand')}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
                  </div>
                ))}
              </div>
            )}
            
            {groupedHand.plots.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.plots.map(({ card, originalIndex }) => (
                  <div key={`hand-plots-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card, originalIndex, 'hand')}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
                  </div>
                ))}
              </div>
            )}
            
            {hand.length === 0 && (
              <div className="empty-hand">
                <div className="empty-hand-icon">🎴</div>
                <p>Your hand is empty</p>
              </div>
            )}
          </div>
        </div>

        {gamePhase === 'playing' && (
          <div className="discard-piles">
            <div className="pile-section">
              <div className="discard-pile" onClick={() => showTopDiscard('group-resource')}>
                <div className="card-back">
                 <img src={`${import.meta.env.BASE_URL}cards/group-back.webp`} alt="Groups/Resources Discard" className="card-back-image" />
                  <div className="pile-count">{groupResourceDiscard.length}</div>
                </div>
              </div>
            </div>

            <div className="pile-section">
              <div className="discard-pile" onClick={() => showTopDiscard('plot')}>
                <div className="card-back">
                  <img src={`${import.meta.env.BASE_URL}cards/plot-back.webp`} alt="Plots Discard" className="card-back-image" />
                  <div className="pile-count">{plotDiscard.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default GameBoard;
