# Transformer

The Transformer is the neural network architecture behind virtually all modern LLMs. Introduced in the 2017 paper *"Attention Is All You Need"*.

## Core idea — self-attention
Each token looks at every other token in the context and decides how much to "attend" to it. This captures long-range dependencies efficiently.

## Components
- **Multi-head attention** — multiple attention patterns in parallel
- **Feed-forward layers** — process each token independently
- **Layer normalisation** — stabilises training
- **Positional encoding** — injects token order information

## Why it replaced RNNs
- Parallelisable — processes all tokens simultaneously (faster training)
- Handles long-range dependencies better

## Related
- [[Neural Networks]]
- [[Large Language Models]]
- [[Embeddings]]
