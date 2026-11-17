# Testing a Non-Deterministic AI Chatbot with Playwright + TypeScript

A demo project showing how to automate tests for an **AI assistant whose answers change from run to run**.
The app is a small trip assistant for a fictional resort ("Starlight Valley"): guests sign in and ask
about tickets, park hours, hotels, and policies.

You can't assert `expect(answer).toBe("...")` when the wording changes every time. Instead, this suite checks
**what must be true** about every answer.

## What it demonstrates

| Technique | Where |
|---|---|
| **Rule-based assertions**: required facts, forbidden content, word limits | `tests/helpers/evaluators.ts` |
| **Business-rule validation**: every price the bot says must exist in the catalog API | `pricesMatchCatalog()` |
| **Semantic assertion**: meaning close to a reference answer (cosine similarity) | `semanticSimilarity()` |
| **LLM-as-judge** (optional): a model scores each answer against a rubric | `llmJudge()` |
| **Eval dataset + repeated runs + pass-rate threshold** | `data/eval-dataset.json`, `tests/eval/agent-eval.spec.ts` |
| **Gherkin → Playwright**: each `test.step` mirrors a Gherkin step | `features/*.feature`, `tests/e2e/guest-journey.spec.ts` |
| **Page Object Model** | `tests/pages/ChatPage.ts` |
| **Custom fixtures** (logged-in page, catalog, API client) | `tests/fixtures.ts` |
| **Auth setup once + `storageState` reuse** | `tests/auth.setup.ts` |
| **UI vs API validation**: UI shows exactly what the API returned | `tests/e2e/ui-vs-api.spec.ts` |
| **Request interception & mocks**: forced errors, slow responses | `tests/e2e/mocked-api.spec.ts` |
| **CI**: Jenkins + GitHub Actions, JUnit + HTML reports | `Jenkinsfile`, `.github/workflows/` |

## Run it

```bash
npm install
npx playwright install chromium
npm test                 # all tests (starts the app automatically)
npm run test:e2e         # browser journeys only
npm run test:eval        # AI evaluation suite only
npm run report           # open the HTML report (eval results are attached to each test)
```

Try the app yourself: `npm start`, open http://localhost:3000, and sign in with **demo / demo123**.

### See the evals catch bad answers

```bash
npm run test:faults      # the mock agent "hallucinates" 30% of the time
```

The agent starts inventing prices (e.g. `$219` instead of `$239`) and fake coupon codes (`MAGIC50`). The eval
suite fails with the exact bad answers and failed checks attached, which is the evidence you need to triage.

### Run against a real LLM (optional)

```bash
AGENT_MODE=llm ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=<model-id> npm test
```

The **tests don't change**. Because they check rules and meaning, not exact text, they work on the mock agent
and on a real model. Setting `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` also turns on the LLM-as-judge check.

Tuning: `EVAL_RUNS` (default 5) and `EVAL_PASS_THRESHOLD` (default 1.0). With a real LLM, a threshold such as
0.9 over 10 runs is more realistic.

## Design notes

- **Why repeated runs?** One passing answer proves little when output is random. Running each prompt N times and
  requiring a pass rate turns a flaky single assertion into a measurable quality signal.
- **Why several kinds of check?** Rules catch factual and safety errors cheaply and deterministically. Semantic
  similarity catches answers that are "technically correct but off-topic". The LLM judge covers nuance that rules
  can't express. Cheap checks run on every commit; the judge can run nightly.
- **Source of truth.** Prices are never hard-coded in tests. They come from `/api/catalog`, so a price change
  doesn't break the suite, but a hallucinated price does.
- **Mocks for UI behavior.** UI tests that need exact text (error states, loading, rendering) mock the agent with
  `page.route`, so they stay deterministic.
- **Limitation.** The offline semantic similarity is a word-overlap approximation. In production I'd swap it for
  embedding similarity, or add eval tools such as Promptfoo or LangSmith.
