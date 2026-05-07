# Attention Is All You Need

**Authors:** Vaswani et al. (Google Brain)  
**Year:** 2017  
**Link:** https://arxiv.org/abs/1706.03762

## One-line summary
Introduced the [[../Concepts/Transformer|Transformer]] architecture, replacing recurrent networks entirely with attention mechanisms for sequence modelling.

## The problem it solved
Prior to this, sequence models (like RNNs and LSTMs) processed tokens one at a time — slow to train and poor at long-range dependencies.

## Key idea — self-attention
Every token attends to every other token simultaneously. The model learns which tokens are relevant to each other, regardless of distance.

## Why it matters
This paper is the foundation of every modern LLM — GPT, Claude, Gemini, LLaMA. Without it, none of them exist.

## Key quote
> "Attention is all you need."

## Impact
- 100,000+ citations
- Sparked the modern AI era
- Enabled training at scales previously impossible

## Related
- [[../Concepts/Transformer]]
- [[../Concepts/Large Language Models]]
