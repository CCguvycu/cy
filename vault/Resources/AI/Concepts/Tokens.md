# Tokens

Tokens are the basic units of text that LLMs read and produce. A token is roughly 3–4 characters or about ¾ of a word in English.

## Why tokens matter
- Models have a **context window** measured in tokens (e.g. 128k tokens ≈ ~100k words)
- API pricing is per token (input + output)
- Longer prompts consume more of the context window

## Tokenisation examples
| Text | Tokens |
|------|--------|
| "Hello" | 1 |
| "Artificial intelligence" | 3 |
| "ChatGPT" | 2 |
| "supercalifragilistic" | 6 |

## Related
- [[Large Language Models]]
- [[Embeddings]]
