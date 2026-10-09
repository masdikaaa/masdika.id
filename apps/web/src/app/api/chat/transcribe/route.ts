import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from '@/lib/get-ip';
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { isIpBlocked } from "@/lib/ip-check";
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from "uuid";
import * as os from 'os';

export const maxDuration = 60; // Max 60s for transcription

const openai = new OpenAI({ 
  apiKey: process.env.AI_API_KEY || process.env.GROQ_API_KEY,
  baseURL: process.env.AI_BASE_URL || process.env.GROQ_BASE_URL || undefined 
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // 1. IP Block Check
    if (await isIpBlocked(ip)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 2. Rate Limit (5 voice requests per minute)
    const allowed = await checkRateLimit('CHAT_VOICE_STT', ip, 5, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many voice requests. Please try again in a minute.' }, { status: 429 });
    }

    // 3. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // 4. Validate file
    if (file.size > 5 * 1024 * 1024) { // Max 5MB
      return NextResponse.json({ error: "Audio file too large. Max 5MB." }, { status: 413 });
    }

    // Groq's SDK requires a read stream, so we write to a temporary file first
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Attempt to guess extension based on mime type
    let ext = '.webm';
    if (file.type.includes('mp4')) ext = '.mp4';
    else if (file.type.includes('mpeg') || file.type.includes('mp3')) ext = '.mp3';
    else if (file.type.includes('wav')) ext = '.wav';
    else if (file.type.includes('ogg')) ext = '.ogg';
    
    const tempFilePath = path.join(os.tmpdir(), `stt_${uuidv4()}${ext}`);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      // 5. Send to AI Whisper (auto-detect language — supports 99+ languages)
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: process.env.AI_WHISPER_MODEL || "whisper-large-v3-turbo",
        // No language or prompt hint — let Whisper auto-detect any language
        response_format: "json",
      });

      // Cleanup
      fs.unlinkSync(tempFilePath);

      return NextResponse.json({ text: transcription.text });
    } catch (aiErr: any) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      console.error("AI Transcription Error:", aiErr);
      return NextResponse.json({ error: "Voice transcription failed." }, { status: 500 });
    }

  } catch (error) {
    console.error("Transcription API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
