import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(req: Request) {
    try {
        const { text, voiceId } = await req.json();

        if (!process.env.ELEVENLABS_API_KEY) {
            return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY in .env.local" }, { status: 500 });
        }

        // Initialize the client
        const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

        // Request the audio stream
        const audioStream = await client.textToSpeech.convert(voiceId, {
            text: text,
            modelId: "eleven_turbo_v2_5", // Recommended for fast, conversational AI
            outputFormat: "mp3_44100_128",
        });

        // Convert the ReadableStream to a Buffer for the browser
        const chunks: Uint8Array[] = [];
        const reader = audioStream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
        } finally {
            reader.releaseLock();
        }
        const buffer = Buffer.concat(chunks);

        // Return the raw audio file
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": buffer.length.toString(),
            },
        });

    } catch (error: any) {
        // 🔥 THIS IS THE MAGIC LINE: It prints the REAL error to your VS Code terminal
        console.error("🔥 ElevenLabs Server Error:", error?.body || error.message || error);

        return NextResponse.json(
            {
                error: "Failed to generate speech",
                details: error?.body || error.message
            },
            { status: 500 }
        );
    }
}