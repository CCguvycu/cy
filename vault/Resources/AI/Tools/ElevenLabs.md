# ElevenLabs

**Made by:** ElevenLabs  
**Website:** https://elevenlabs.io  
**Type:** AI voice generation (text-to-speech)

## What it does
ElevenLabs converts text to ultra-realistic speech. It can clone voices from a short audio sample and supports 30+ languages.

## Key features
| Feature | Description |
|---------|-------------|
| Text to Speech | Type text, get natural-sounding audio |
| Voice cloning | Clone any voice from 1–3 minutes of audio |
| Voice library | 1000+ pre-built voices |
| Speech to Speech | Change a voice while keeping the delivery |
| Dubbing | Auto-translate and dub video content |

## Use cases
- Voiceovers for YouTube / social content
- Audiobook narration
- Podcast production
- Video game characters
- Accessibility tools

## Pricing
- Free tier: 10,000 chars/month
- Starter: $5/mo — 30,000 chars
- Creator: $22/mo — 100,000 chars + voice cloning

## API usage (Python)
```python
from elevenlabs import generate, play

audio = generate(
    text="Hello, this is a test of ElevenLabs.",
    voice="Rachel",
    model="eleven_monolingual_v1"
)
play(audio)
```

## Related
- [[Multimodal AI]]
