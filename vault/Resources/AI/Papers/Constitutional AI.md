# Constitutional AI: Harmlessness from AI Feedback

**Authors:** Bai et al. (Anthropic)  
**Year:** 2022  
**Link:** https://arxiv.org/abs/2212.08073

## One-line summary
A method to train harmless AI assistants using AI-generated feedback guided by a set of written principles — a "constitution" — rather than relying entirely on human labellers.

## The problem it solved
RLHF requires huge amounts of human feedback to make models safe. Human labellers are slow, expensive, and inconsistent.

## Key idea
1. Write a set of principles (the "constitution") — e.g. "be helpful, harmless, honest"
2. Have the AI critique its own outputs against those principles
3. Have the AI revise its outputs based on the critique
4. Use AI-generated preference data to train a reward model
5. Fine-tune with RL against that reward model

## Why it matters
This is the core technique behind Claude. It makes safety training more scalable and transparent — the principles are explicit and human-readable.

## Related
- [[../Concepts/AI Safety]]
- [[../Concepts/Training & Fine-tuning]]
- [[../Tools/Claude]]
