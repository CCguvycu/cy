# Training & Fine-tuning

## Pre-training
The base model is trained on a huge corpus (web, books, code) to predict the next token. This gives it broad world knowledge.

## Fine-tuning
After pre-training, the model is trained further on a smaller, curated dataset to specialise its behaviour.

### Types
| Type | Description |
|------|-------------|
| **Supervised fine-tuning (SFT)** | Train on (prompt, ideal response) pairs |
| **RLHF** | Reinforcement Learning from Human Feedback — align outputs with human preference |
| **LoRA / QLoRA** | Parameter-efficient fine-tuning — only trains small adapter layers |

## RAG vs fine-tuning
- **RAG** — inject knowledge at inference time via retrieval; no retraining needed
- **Fine-tuning** — bake knowledge/style into the weights; requires training

Use RAG for dynamic/changing knowledge; fine-tuning for consistent style or specialised tasks.

## Related
- [[Large Language Models]]
- [[Neural Networks]]
