# INWO Online

![React](https://img.shields.io/badge/React-18.2+-61DAFB?style=flat&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=flat&logo=node.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat&logo=vite&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6+-010101?style=flat&logo=socket.io&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18+-000000?style=flat&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Animations-1572B6?style=flat&logo=css3&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-010101?style=flat&logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-Active-success)

A browser-based multiplayer implementation of Steve Jackson Games' **Illuminati: New World Order** card game. Play with friends in real-time through an intuitive, drag-and-drop interface.

## 🎮 About the Game

INWO (Illuminati: New World Order) is a collectible card game where players take on the role of shadowy Illuminati organizations trying to control the world through a network of Groups, Resources, and Plots.

**Want to learn how to play?** Visit the official game page at [Steve Jackson Games - INWO](https://www.sjgames.com/inwo/) for complete rules and strategy guides.

## ✨ Features

### Deck Building
- **Visual Deck Builder**: Browse all available cards with search and filter functionality
- **Save/Load Decks**: Save your custom decks locally (development) or to the server (production)
- **Flexible Deck Rules**: Build decks with any number of cards (recommended 45), with warnings for missing Illuminati cards
- **Card Types**: Support for Illuminati, Groups, Resources, and Plots
- **Card Preview**: Right-click any card to see it full-size

### Gameplay
- **Real-time Multiplayer**: 2-player games with WebSocket synchronization
- **Shared Play Area**: Large, interactive board where both players can see all played cards
- **Drag & Drop Interface**: Easily play cards from your hand to the board
- **Card Manipulation**: 
  - Rotate cards 90° (tap/tapped mechanic)
  - Add/remove tokens for tracking card states
  - Move cards freely around the play area
  - Return cards to hand or discard
- **Right-Click Context Menus**: Access all card actions quickly
- **Deck Management**:
  - Draw from plot deck (top or bottom)
  - Draw from group/resource pile
  - Show cards to all players
  - Discard mechanics (visible or blind)
- **Turn System**: 
  - Clear turn indicators showing whose turn it is
  - Turn counter to track game progress
  - "Knock" system for ending turns
- **Dice Rolling**: Built-in 2D6 dice roller with 3D visual effects
- **Fullscreen Board View**: Maximize play area by pressing **F** or clicking "View Board"

### User Experience
- **Illuminati-Themed UI**: Dark, conspiracy-themed interface with gradients and animations
- **Keyboard Shortcuts**: 
  - `F` - Toggle fullscreen board view
  - `Esc` - Exit fullscreen
- **Hand Organization**: Cards automatically organized by type (Illuminati, Groups, Resources, Plots)
- **Opponent Hand Tracking**: See counts of card types in opponent's hand
- **Responsive Design**: Optimized for desktop play with large monitor support

### Technical Features
- **WebSocket Communication**: Real-time game state synchronization via Socket.io
- **Room-Based System**: Create or join games using unique room codes
- **Automatic Setup Phase**: Shuffle and deal initial hands, transition to play phase
- **Persistent Decks**: Save/load functionality with local and server storage
- **Modern React Architecture**: Built with React 18, Vite, and modern JavaScript

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/greggjuri/inwo-online
cd inwo-online
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

### Running Locally

1. **Start the backend server** (in the `backend` directory)
```bash
npm run dev
# Server runs on http://localhost:3001
```

2. **Start the frontend** (in the `frontend` directory)
```bash
npm run dev
# Client runs on http://localhost:5173
```

3. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Create a room and invite a friend!

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

**Backend:**
```bash
cd backend
npm start
```

## 🎯 How to Play

1. **Join or Create a Room**
   - Enter your name and a room code
   - Share the room code with your opponent

2. **Build Your Deck**
   - Browse available cards
   - Click to add cards to your deck
   - Right-click to preview cards
   - Save your deck for future games

3. **Setup Phase**
   - Place your Illuminati card on the board
   - Place your opening Group card on the board
   - Click "Done" when ready (both players must be ready)

4. **Play Phase**
   - Drag cards from your hand to the play area
   - Right-click cards for context menu actions:
     - Rotate cards (tap/untap)
     - Add/remove tokens
     - Return to hand
     - Discard
   - Right-click deck piles to:
     - Draw cards
     - Show cards to all players
     - Discard cards
   - Click "Knock" to end your turn
   - Roll dice when needed

5. **Board Management**
   - Press **F** for fullscreen board view
   - Drag cards to reposition them
   - Use context menus for all card actions

## 📁 Project Structure

```
inwo-online/
├── backend/
│   ├── server.js          # Express + Socket.io server
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── public/
│   │   └── cards/         # Card images (groups, resources, plots, illuminati)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Card.jsx           # Card display component
│   │   │   ├── DeckBuilder.jsx    # Deck building interface
│   │   │   ├── GameBoard.jsx      # Main game board
│   │   │   ├── Lobby.jsx          # Room creation/joining
│   │   │   └── Dice.jsx           # 3D dice roller
│   │   ├── contexts/
│   │   │   └── SocketContext.jsx  # WebSocket state management
│   │   ├── services/
│   │   │   └── deckStorage.js     # Deck save/load logic
│   │   ├── cards.json             # Card database
│   │   ├── App.jsx                # Main app component
│   │   └── main.jsx               # Entry point
│   └── package.json       # Frontend dependencies
└── LICENSE                # MIT License
```

## 🛠️ Technologies Used

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Socket.io Client** - Real-time communication
- **CSS3** - Animations and styling

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **Socket.io** - WebSocket server
- **CORS** - Cross-origin resource sharing

## 🎨 Card Assets

This implementation requires card images from INWO. Card images should be placed in:
- `frontend/public/cards/groups/`
- `frontend/public/cards/resources/`
- `frontend/public/cards/plots/`
- `frontend/public/cards/illuminati/`

All card images should be in `.webp` format for optimal performance.

## 🔧 Configuration

### Environment Variables

**Frontend** (`.env.production`):
```env
VITE_SERVER_URL=your-server-url
```

**Backend**:
```env
CLIENT_URL=your-client-url
PORT=3001
```

## 🎮 Game Features Checklist

- ✅ Deck building with save/load
- ✅ Real-time multiplayer (2 players)
- ✅ Drag and drop card playing
- ✅ Card rotation (tap/untap)
- ✅ Token management
- ✅ Context menu actions
- ✅ Plot deck management
- ✅ Group/Resource pile management
- ✅ Discard piles
- ✅ Turn system with knock mechanic
- ✅ Dice roller (2D6)
- ✅ Fullscreen board view
- ✅ Hand organization
- ✅ Opponent hand tracking
- ✅ Card preview system
- ✅ Setup phase
- ✅ Room-based multiplayer

## 🤝 Contributing

Contributions are welcome! This is a fan-made project to play INWO online with friends.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is a fan-made project and is not affiliated with or endorsed by Steve Jackson Games. INWO is a trademark of Steve Jackson Games, and the game rules and card designs are their property. This implementation is for personal, non-commercial use only.

To learn more about the official game and purchase physical cards, visit [Steve Jackson Games](https://www.sjgames.com/inwo/).

## 🎯 Future Enhancements

Potential features for future development:
- [ ] Multiple game format support (2-4+ players)
- [ ] Spectator mode
- [ ] Chat system
- [ ] Game replay/history
- [ ] Advanced deck statistics
- [ ] Tournament mode
- [ ] Mobile/tablet optimization
- [ ] Custom card sets
- [ ] Automated victory condition checking

## 💬 Support

For game rules and strategy, visit the [official INWO page](https://www.sjgames.com/inwo/).

For technical issues with this implementation, please open an issue on the project repository.

---

**Enjoy your games of INWO!** 👁️‍🗨️