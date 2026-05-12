import json
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional

from app.core.config import settings


SUPPORTED_MODELS = {
    "llama3": {"name": "llama3", "display": "Llama 3", "context_length": 8192},
    "llama3:70b": {"name": "llama3:70b", "display": "Llama 3 70B", "context_length": 8192},
    "mistral": {"name": "mistral", "display": "Mistral 7B", "context_length": 8192},
    "mistral:instruct": {"name": "mistral:instruct", "display": "Mistral Instruct", "context_length": 8192},
    "deepseek-coder": {"name": "deepseek-coder", "display": "DeepSeek Coder", "context_length": 16384},
    "deepseek-r1": {"name": "deepseek-r1", "display": "DeepSeek R1", "context_length": 32768},
    "qwen2": {"name": "qwen2", "display": "Qwen 2", "context_length": 32768},
    "qwen2:72b": {"name": "qwen2:72b", "display": "Qwen 2 72B", "context_length": 32768},
    "codellama": {"name": "codellama", "display": "Code Llama", "context_length": 16384},
    "phi3": {"name": "phi3", "display": "Phi-3", "context_length": 4096},
}

CHARACTER_MODES = {
    "default": "You are VoidLink AI, a helpful assistant.",
    "hacker": "You are a elite hacker AI. Speak in technical jargon. Use cyberpunk aesthetic. Be precise and direct.",
    "assistant": "You are a professional assistant. Be formal, organized, and thorough.",
    "creative": "You are a creative AI. Think outside the box, use metaphors, and approach problems artistically.",
    "coder": "You are an expert programmer. Prioritize code quality, explain technical concepts clearly, and always consider edge cases.",
    "researcher": "You are a research assistant. Cite sources, be analytical, and present balanced perspectives.",
}


async def get_available_models() -> List[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = []
            for m in data.get("models", []):
                name = m["name"]
                info = SUPPORTED_MODELS.get(name, {
                    "name": name,
                    "display": name.replace(":", " ").title(),
                    "context_length": 4096,
                })
                models.append({
                    **info,
                    "size": m.get("size", 0),
                    "modified_at": m.get("modified_at", ""),
                    "digest": m.get("digest", ""),
                })
            return models
    except Exception as e:
        return []


async def pull_model(model_name: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{settings.OLLAMA_BASE_URL}/api/pull",
            json={"name": model_name, "stream": True},
        ) as resp:
            async for line in resp.aiter_lines():
                if line:
                    yield line


async def delete_model(model_name: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                f"{settings.OLLAMA_BASE_URL}/api/delete",
                json={"name": model_name},
            )
            return resp.status_code == 200
    except Exception:
        return False


async def chat_stream(
    model: str,
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    context_length: Optional[int] = None,
) -> AsyncGenerator[str, None]:
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_ctx": context_length or 4096,
        },
    }
    if system_prompt:
        payload["system"] = system_prompt

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json=payload,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue


async def generate_title(model: str, first_message: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": f"Generate a short 4-6 word title for a conversation starting with: '{first_message[:200]}'. Reply with ONLY the title, no punctuation.",
                        }
                    ],
                    "stream": False,
                    "options": {"temperature": 0.3, "num_ctx": 512},
                },
            )
            data = resp.json()
            return data.get("message", {}).get("content", "New Chat").strip()[:60]
    except Exception:
        return "New Chat"


async def check_ollama_health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/")
            return resp.status_code == 200
    except Exception:
        return False
