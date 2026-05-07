# AI Safety

AI safety is the field concerned with ensuring AI systems behave as intended and don't cause harm — especially as models become more capable.

## Key concepts

### Alignment
Making sure AI systems pursue goals that are actually beneficial to humans. A misaligned AI might technically do what you asked while violating the spirit of the request.

### RLHF (Reinforcement Learning from Human Feedback)
Training method where humans rate model outputs, and the model learns to produce higher-rated responses. Used by GPT-4, Claude, and others.

### Constitutional AI (Anthropic)
Claude's approach — the model is trained with a set of principles ("constitution") and learns to critique and revise its own outputs against those principles.

### Hallucination
When a model confidently generates false information. A core reliability problem in LLMs.

### Jailbreaking
Attempts to bypass a model's safety guidelines through clever prompting. An ongoing arms race between safety researchers and adversarial users.

### Catastrophic risk
Concern that sufficiently capable AI could pose existential or civilisational risks if not properly aligned. Debated heavily in the field.

## Key organisations
- **Anthropic** — safety-focused lab, makes Claude
- **OpenAI** — makes GPT series, has a safety team
- **DeepMind** — Google's AI lab, active safety research
- **ARC** (Alignment Research Center) — independent alignment research
- **MIRI** — Machine Intelligence Research Institute

## Further reading
- [[Papers/Attention Is All You Need]]
- [[Papers/Constitutional AI]]

## Related
- [[Training & Fine-tuning]]
- [[Large Language Models]]
