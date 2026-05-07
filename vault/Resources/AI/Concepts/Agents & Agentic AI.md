# Agents & Agentic AI

An AI agent is an LLM that can take actions autonomously — using tools, browsing the web, writing and running code, and calling external APIs to complete multi-step goals.

## What makes something an agent?
1. **Goal** — given a high-level objective, not just a single question
2. **Tools** — can call functions, APIs, or run code
3. **Memory** — retains context across steps
4. **Planning** — breaks the goal into sub-tasks
5. **Iteration** — checks results and adjusts

## Core agent patterns

### ReAct (Reason + Act)
The model alternates between reasoning ("I need to find X") and acting (calling a tool), then observing the result.

### Tool use / function calling
The model can call predefined functions:
```json
{"tool": "web_search", "query": "latest Claude model"}
```

### Multi-agent systems
Multiple specialised agents collaborate — one researches, one writes, one reviews.

## Popular frameworks
| Framework | Notes |
|-----------|-------|
| LangChain | Mature, huge ecosystem |
| LlamaIndex | Great for RAG + agents |
| CrewAI | Multi-agent workflows |
| AutoGen (Microsoft) | Multi-agent conversations |
| Claude Agent SDK | Anthropic's native agent framework |

## Examples in the wild
- **Cursor** — coding agent that edits files and runs tests
- **Devin** — autonomous software engineer
- **ChatGPT with tools** — web browse, code interpreter, DALL·E

## Related
- [[Large Language Models]]
- [[RAG]]
- [[Tools/Cursor]]
