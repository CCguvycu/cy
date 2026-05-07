# Embeddings

Embeddings are numerical vector representations of data (text, images, audio) that capture semantic meaning.

## Intuition
Words or sentences with similar meanings end up close together in vector space.
- "king" − "man" + "woman" ≈ "queen"

## Uses
- **Semantic search** — find documents by meaning, not just keywords
- **RAG (Retrieval-Augmented Generation)** — retrieve relevant context before generation
- **Clustering** — group similar content automatically
- **Recommendation** — find similar items

## How they're created
Text → tokenise → pass through a model → extract the hidden-state vector → embedding

## Common embedding models
- `text-embedding-3-small` / `text-embedding-3-large` — OpenAI
- `embed-english-v3.0` — Cohere
- `all-MiniLM-L6-v2` — open-source (sentence-transformers)

## Related
- [[Large Language Models]]
- [[Tokens]]
