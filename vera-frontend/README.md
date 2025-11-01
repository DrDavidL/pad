# VERA Frontend - iPhone Messages Interface

A React/Next.js frontend for the VERA P.A.D. Education Assistant that mimics an iPhone running the Messages app.

## Features

- **iPhone 14 Pro-style Device Frame** - Realistic device bezel with Dynamic Island, status bar, and home indicator
- **Three-Screen Authentication Flow**:
  1. Research ID entry and validation
  2. Disclaimer acknowledgment
  3. Chat interface with VERA
- **iMessage-style Chat UI** - Blue bubbles for user, gray bubbles for VERA
- **Real-time Streaming** - WebSocket connection for live LLM responses
- **Voice Input** - Web Speech API integration with microphone button
- **Text-to-Speech Playback** - Automatic audio playback of VERA's responses
- **Session Persistence** - JWT token stored in localStorage

## Prerequisites

- Node.js 25+ and npm
- Vera API backend running at http://localhost:8000
- Modern browser with Web Speech API support (Chrome, Edge)

## Installation

```bash
cd vera-frontend
npm install
```

## Configuration

The `.env.local` file contains the API endpoints:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1/chat/ws/chat
```

For production, update these to your deployed backend URLs.

## Running the Application

### Development Mode

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Usage Flow

1. **Enter Research ID**: Type a valid research ID (e.g., RID001-RID010)
2. **Acknowledge Disclaimer**: Read and accept the research disclaimer
3. **Chat with VERA**:
   - Type messages in the input field
   - Click the microphone button to use voice input
   - VERA responds with streaming text
   - Audio plays automatically for each response

## Project Structure

```
vera-frontend/
├── app/
│   ├── page.tsx              # Main app with auth flow logic
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles and animations
├── components/
│   ├── IPhoneFrame.tsx       # iPhone device frame wrapper
│   ├── ResearchIDScreen.tsx  # Research ID entry screen
│   ├── DisclaimerScreen.tsx  # Disclaimer acknowledgment screen
│   └── ChatInterface.tsx     # Messages-style chat interface
├── hooks/
│   └── useWebSocket.ts       # WebSocket connection hook
├── lib/
│   └── api.ts                # API client functions
├── types/
│   └── index.ts              # TypeScript type definitions
├── .env.local                # Environment variables
└── tailwind.config.ts        # Tailwind CSS configuration
```

## Key Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **WebSockets** - Real-time communication
- **Web Speech API** - Browser-native voice recognition

## API Integration

The frontend connects to the FastAPI backend via:

### REST Endpoints

- `POST /api/v1/auth/validate-research-id` - Validate research ID
- `POST /api/v1/auth/acknowledge-disclaimer` - Record disclaimer
- `POST /api/v1/auth/login` - Get JWT token
- `POST /api/v1/chat/history` - Load conversation history

### WebSocket Endpoint

- `ws://localhost:8000/api/v1/chat/ws/chat` - Real-time streaming chat

## Browser Compatibility

**Recommended**: Chrome or Edge (full Web Speech API support)

**Limited Support**: Safari, Firefox (no voice input)

## Styling

The app uses custom Tailwind colors matching iOS design:

- `imessage-blue` (#007AFF) - User message bubbles
- `imessage-gray` (#E9E9EB) - VERA message bubbles
- iPhone-style fonts and animations

## Troubleshooting

### API Connection Issues

Make sure the backend is running:
```bash
cd ../vera-api
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### WebSocket Not Connecting

Check CORS settings in backend and WebSocket URL in `.env.local`

### Voice Input Not Working

- Use Chrome or Edge browser
- Grant microphone permissions when prompted
- Check browser console for errors

## Development Notes

- Hot reload enabled in dev mode
- TypeScript strict mode enabled
- ESLint configured for Next.js
- Responsive iPhone frame scales on different screens

## Next Steps

- [ ] Add conversation list/history view
- [ ] Implement message editing/deletion
- [ ] Add typing indicator for user
- [ ] Support image/file uploads
- [ ] Add dark mode support
- [ ] Deploy to Vercel

## License

Research use only - Not for medical advice
