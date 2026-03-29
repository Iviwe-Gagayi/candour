Candour 
Live Multimodal Copilot & Communication Mirror

Candour is a real time AI assistant that bridges the gap between digital communication and human emotion. It provides live facial expression and vocal tone analysis during video calls and practice scenarios, alongside a "Tone Mirror" for text-based messaging to ensure your professional presence is always on point.

**How to Run (Development)**
This project consists of a browser extension and a Next.js web application for the rehearsal mode.

1. Environment Setup
Create a .env.local file in the root directory with the following keys:

Code snippet
ANTHROPIC_API_KEY=your_anthropic_key
ELEVENLABS_API_KEY=your_elevenlabs_key
NEXT_PUBLIC_USE_ELEVENLABS=true
NEXT_PUBLIC_HUME_API_KEY=your_hume_key

2. Start the Local Server (For Rehearsal Mode & API Proxies)
To run the Next.js application that handles the Rehearsal UI and ElevenLabs TTS proxy:

npm install
npm run dev
The rehearsal environment will be available at localhost:3000.

Features

1. Interactive Rehearsal Studio
Custom Scenarios: Define the role, personality, and background context of the person you are speaking to.

Context Ingestion: Upload PDF, Word, or Excel documents to feed Claude background information for the roleplay.

Multimodal Feedback: Tracks both facial expressions and vocal prosody in real-time, displaying specific behavioral insights and tracking filler words.

Realistic Voice Responses: Uses ElevenLabs' conversational models to generate ultra-realistic audio responses based on Claude's output.

Technical Challenges & Solutions
1. Synchronizing Web Streams for Hume's WebSocket
Hume's Expression Measurement API requires strict data formatting. When feeding continuous microphone data via MediaRecorder, Chrome encapsulates both video and audio tracks which caused the WebSocket to instantly close (Code 1000) or throw NotSupportedError.
Solution: We isolated the microphone into a dedicated, audio-only MediaStream and utilized discrete, chunked recording intervals. By instantiating a new MediaRecorder every 3 seconds, we ensured every payload contained a valid WebM header, preventing silent data drops on Hume's servers.

2. Bypassing Chrome's Autoplay Policy for TTS
Chrome strictly blocks AudioContext from playing audio unprompted, which muted the ElevenLabs responses when transitioning from the Setup to Rehearsal page.
Solution: We implemented a global singleton pattern for the AudioContext. By initializing it globally and explicitly calling await sharedAudioContext.resume() before decoding the buffer, we successfully bypassed the restriction while keeping the API keys securely proxied through the Next.js backend.

Tech Stack
Frameworks: Next.js (Web), Plasmo (Browser Extension)

Frontend: React, Tailwind CSS, TypeScript

AI Models: Hume AI (EVI & Face Measurement), Claude 3.5 Sonnet (Linguistic Tone & Roleplay)

Audio Processing: ElevenLabs (TTS), Web Speech API (Fallback), native WebRTC / MediaRecorder
