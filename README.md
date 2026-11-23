# AI Systems, Designed

An animated, step-by-step field guide to AI systems engineering: tokenization, embeddings, attention, LLM inference, context engineering, RAG, tool use, MCP, agents, evals, LLMOps, security, and reference architectures on AWS.

Every lesson is a small isometric simulation: requests, tokens, vectors and tool calls flow through the system while the text walks through the problem, the fix and the trade-offs. Each lesson ends with **field notes**: key ideas, best practices, edge cases and notes from customer deployments (Forward Deployed Engineering).

- 15 chapters, 44 lessons, 15 fully animated (134 steps), 78 glossary terms
- Cloud diagrams use the official AWS Architecture Icons (the same set as draw.io's `mxgraph.aws4` library), inlined as vectors
- MCP content follows the 2026-07-28 specification; OWASP content follows the 2026 LLM Top 10
- Light and dark themes, keyboard navigation (← → R Space), Ctrl K search, progress saved locally

## Run it

```bash
npm install
npm run dev            # local dev server
npm run build          # content check + typecheck + production build
npm run check:content  # validates every scene (edges, flows, icons, spacing, glossary links)
```

## How content works

Lessons are plain data in `src/content/lessons/chXX.ts`. A lesson has metrics, goals, steps and notes; each step has a scene made of nodes (cubes, cylinders, crowds, AWS services), edges, particle flows, chips and data cards. The engine in `src/engine/` projects them isometrically, keeps text at a constant on-screen size, and animates the camera between steps.

## Credits

Built by [Mohamed Achraf Oueslati](https://www.linkedin.com/in/mohamed-achref-oueslati-431539223). Lesson format inspired by [Designed to Scale](https://designed-to-scale.vercel.app/). AWS icons: official AWS Architecture Icons via the MIT-licensed [`aws-icons`](https://github.com/MKAbuMattar/aws-icons) package; Amazon Web Services, AWS and related marks are trademarks of Amazon.com, Inc. or its affiliates. Corrections welcome as issues.
