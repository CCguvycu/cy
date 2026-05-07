# RAG — Retrieval-Augmented Generation

RAG is a technique that gives an LLM access to external knowledge at inference time by retrieving relevant documents and injecting them into the prompt.

## The problem it solves
LLMs have a knowledge cutoff and can't access private data. RAG lets you query your own documents, databases, or live data without retraining the model.

## How it works
1. **Index** — chunk your documents and convert to [[Embeddings]] (vectors), store in a vector database
2. **Query** — convert the user's question to an embedding
3. **Retrieve** — find the most similar chunks in the vector DB
4. **Generate** — pass the retrieved chunks + question to the LLM as context

```
User question → embed → vector search → top K chunks → LLM prompt → answer
```

## Vector databases
| DB | Notes |
|----|-------|
| Pinecone | Managed, easy setup |
| Weaviate | Open source, self-hostable |
| Chroma | Lightweight, great for local dev |
| pgvector | Postgres extension — no extra infra |
| FAISS | Meta's library, in-memory |

## RAG vs fine-tuning
| | RAG | Fine-tuning |
|--|-----|-------------|
| Knowledge update | Easy — just re-index | Requires retraining |
| Cost | Low | High |
| Best for | Dynamic/private data | Style, tone, task specialisation |

## Related
- [[Embeddings]]
- [[Large Language Models]]
- [[Training & Fine-tuning]]
