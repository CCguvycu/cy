# AI Image Generation

AI image generation models create images from text prompts (text-to-image) or modify existing images.

## How it works — diffusion models
1. Start with pure random noise
2. The model gradually "denoises" the image over many steps
3. The process is guided by the text prompt (via [[Embeddings]])
4. Result: a coherent image matching the description

## Major models
| Model | Made by | Access |
|-------|---------|--------|
| DALL·E 3 | OpenAI | ChatGPT, API |
| Midjourney v6 | Midjourney | Discord, web |
| Stable Diffusion | Stability AI | Open source, self-host |
| Imagen 3 | Google | Gemini |
| Firefly | Adobe | Adobe suite |

## Key prompt elements
```
[subject], [style], [lighting], [composition], [mood], [technical details]
```

Example:
```
A futuristic city at night, cyberpunk art style, neon lighting, 
wide angle, rainy atmosphere, hyper-detailed, 8K
```

## Useful style keywords
- `photorealistic`, `cinematic`, `editorial photography`
- `digital art`, `concept art`, `matte painting`
- `watercolour`, `oil painting`, `pencil sketch`
- `isometric`, `flat design`, `pixel art`
- `Studio Ghibli style`, `Blade Runner aesthetic`

## Negative prompts (Stable Diffusion)
Tell the model what to avoid:
```
ugly, blurry, low quality, extra limbs, watermark
```

## Related
- [[Tools/Midjourney]]
- [[Multimodal AI]]
- [[Embeddings]]
