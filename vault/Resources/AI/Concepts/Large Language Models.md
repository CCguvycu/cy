# Large Language Models (LLMs)

LLMs are neural networks trained on massive text datasets to predict and generate human-like text.

## How they work
1. Text is broken into [[Tokens]]
2. Tokens are converted to [[Embeddings]] (vectors)
3. A [[Transformer]] architecture processes relationships between tokens
4. The model predicts the most likely next token

## Key properties
- **Parameters** — the learnable weights in the model; more = generally more capable
- **Context window** — how many tokens the model can "see" at once
- **Temperature** — controls randomness in output (0 = deterministic, 1+ = creative)
- **Hallucination** — when the model confidently generates false information

## Notable LLMs
| Model | Company | Notes |
|-------|---------|-------|
| GPT-4o | OpenAI | Multimodal (text + image) |
| Claude 3.5 / 4 | Anthropic | Strong reasoning, long context |
| Gemini | Google | Integrated with Google ecosystem |
| Llama 3 | Meta | Open-weights, self-hostable |
| Mistral | Mistral AI | Efficient open-weights models |

## Related
- [[Tokens]]
- [[Embeddings]]
- [[Training & Fine-tuning]]
- [[Transformer]]
