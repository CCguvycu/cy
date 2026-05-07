# Ollama

**Made by:** Ollama  
**Website:** https://ollama.com  
**Type:** Local LLM runner

## What it does
Ollama lets you run open-source LLMs locally on your own machine — no internet, no API costs, full privacy.

## Setup
```bash
# Install (Mac/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3

# Run it
ollama run llama3
```

## Popular models
| Model | Size | Best for |
|-------|------|---------|
| `llama3` | 8B | General use, fast |
| `llama3:70b` | 70B | Higher quality, needs GPU |
| `mistral` | 7B | Fast, good reasoning |
| `codellama` | 7–34B | Code generation |
| `phi3` | 3.8B | Lightweight, runs on CPU |
| `gemma2` | 9B | Google's open model |

## Use with Python
```python
import ollama

response = ollama.chat(model='llama3', messages=[
    {'role': 'user', 'content': 'Explain transformers in simple terms'}
])
print(response['message']['content'])
```

## Use cases
- Private document chat — your data never leaves your machine
- Offline coding assistant
- Experimenting with open-source models
- Running on a home server or NAS

## Hardware requirements
- 8B models: 8GB RAM (runs on CPU, GPU much faster)
- 70B models: 48GB+ VRAM (needs a serious GPU)

## Related
- [[Large Language Models]]
- [[Training & Fine-tuning]]
