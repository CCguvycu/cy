# Stable Diffusion

**Made by:** Stability AI  
**Type:** Open-source image generation model  
**Access:** Self-hosted, or via services like DreamStudio, Automatic1111, ComfyUI

## Why it's different from Midjourney
Stable Diffusion is fully open-source — you can run it locally, fine-tune it, and customise it completely. Midjourney is a closed service.

## Ways to run it
| Interface | Notes |
|-----------|-------|
| **ComfyUI** | Node-based, powerful, steep learning curve |
| **Automatic1111** | Web UI, most popular, huge extension ecosystem |
| **InvokeAI** | Clean UI, good for beginners |
| **DreamStudio** | Stability AI's hosted version |

## Key concepts

### LoRA (Low-Rank Adaptation)
Small fine-tuned add-ons that steer the model toward a specific style, character, or subject. Download from CivitAI.

### ControlNet
Guides image composition using a reference image — pose, depth, edge map, etc.

### Inpainting
Edit specific parts of an existing image while keeping the rest unchanged.

### img2img
Use an existing image as the starting point rather than noise.

## Prompt tips
```
[positive prompt] --neg [negative prompt]
```
- High CFG scale (7–12) = follows prompt closely
- Low CFG scale (1–5) = more creative, less literal
- Steps 20–30 is usually enough

## Hardware
- Minimum: 4GB VRAM (NVIDIA GPU)
- Recommended: 8–12GB VRAM for fast generation

## Related
- [[AI Image Generation]]
- [[Tools/Midjourney]]
