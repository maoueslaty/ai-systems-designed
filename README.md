# AI Systems, Designed

An animated, step-by-step field guide to AI systems engineering: tokenization, embeddings, attention, LLM inference, context engineering, RAG, tool use, MCP, agents, evals, LLMOps, security, and reference architectures on AWS.

Every lesson is a small isometric simulation: requests, tokens, vectors and tool calls flow through the system while the text walks through the problem, the fix and the trade-offs. The guide reads as a story in four acts and an epilogue, held together by one question: what does each design do to the cost of one unit of real work?

- **Act I–III:** how the machine works, building the system, running it for real
- **Act IV, the pattern catalog:** 26+ AI system design patterns (routing and cascades, fallbacks, token budgets, semantic caching, permission-aware retrieval, durable agents, task-token approvals, MCP gateways, delegated identity, injection containment, canary releases, disaggregated serving, voice and document pipelines…), each pushed through its failure modes with a "Break it" toggle and a naive-vs-pattern comparison
- **Epilogue:** a 12-lesson case study of a fictional US auto insurer, from WhatsApp intake to payment: legacy integration, access by design, guardrail layers, governance and cost per claim
- Every lesson has a quiz; animated lessons add a senior decision record, a field scenario and pattern card; calculators for cost, KV memory, context budgets, reliability and claims economics
- A filterable pattern catalog and a design-interview mode with graded decisions
- 21 chapters, 78 lessons, 58 animated (558 steps), 148 glossary terms
- Cloud diagrams use the official AWS Architecture Icons (the same set as draw.io's `mxgraph.aws4` library), inlined as vectors
- MCP content follows the 2026-07-28 specification; OWASP content follows the 2026 LLM Top 10
- Light and dark themes, keyboard navigation (← → R Space), Ctrl K search, progress saved locally

## Run it

```bash
npm install
npm run dev            # local dev server
npm run build          # content check + typecheck + production build
npm run check:content  # validates every scene (edges, flows, icons, spacing, quizzes, links)
python3 scripts/check_overlaps.py --width 1440 --height 900   # headless label-collision check (needs a running preview)
```

## How content works

Lessons are plain data in `src/content/lessons/chXX.ts`. A lesson has metrics, goals, steps and notes; each step has a scene made of nodes (cubes, cylinders, crowds, AWS services), edges, particle flows, chips and data cards. The engine in `src/engine/` projects them isometrically, keeps text at a constant on-screen size, and animates the camera between steps.

## Credits

Built by [Mohamed Achraf Oueslati](https://www.linkedin.com/in/mohamed-achref-oueslati-431539223). Lesson format inspired by [Designed to Scale](https://designed-to-scale.vercel.app/). AWS icons: official AWS Architecture Icons via the MIT-licensed [`aws-icons`](https://github.com/MKAbuMattar/aws-icons) package; Amazon Web Services, AWS and related marks are trademarks of Amazon.com, Inc. or its affiliates. Corrections welcome as issues.
