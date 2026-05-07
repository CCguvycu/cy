# Prompt Engineering

Prompt engineering is the practice of designing inputs to get the best outputs from an LLM.

## Core techniques

### Zero-shot
Ask the model directly with no examples.
```
Summarise this article in 3 bullet points: [article]
```

### Few-shot
Give 2–3 examples before your actual request so the model learns the pattern.
```
Input: "I love this!" → Sentiment: Positive
Input: "This is terrible." → Sentiment: Negative
Input: "It was okay." → Sentiment:
```

### Chain of Thought (CoT)
Ask the model to reason step by step before giving an answer.
```
Think step by step. If there are 12 apples and you take 4...
```

### Role prompting
Give the model a persona to adopt.
```
You are an expert data scientist with 10 years of experience...
```

### XML tags (Claude-specific)
Structure complex prompts with tags for clarity.
```xml
<context>You are helping a beginner learn Python.</context>
<task>Explain list comprehensions with 2 examples.</task>
```

## Tips
- Be specific — vague prompts get vague answers
- State the format you want ("respond in JSON", "use bullet points")
- Break complex tasks into steps
- If output is wrong, ask the model to critique and redo it
- Temperature 0 for factual/deterministic tasks; higher for creative work

## Related
- [[Large Language Models]]
- [[Resources/AI/Prompts/_index|Prompt library]]
- [[Tools/Claude]]
