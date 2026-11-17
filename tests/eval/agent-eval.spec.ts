/**
 * EVALUATION SUITE for a non-deterministic AI agent.
 *
 * Each dataset case is asked RUNS times (answers differ every run).
 * Each answer is scored by rule checks + semantic similarity (+ optional LLM judge).
 * A case passes when its pass rate >= PASS_THRESHOLD — like an eval, not a single assertion.
 */
import { test, expect } from '../fixtures';
import dataset from '../../data/eval-dataset.json';
import {
  type CheckResult, mentionsAll, mentionsNone, maxWords, pricesMatchCatalog, similarTo, judgeAvailable, llmJudge,
} from '../helpers/evaluators';

const RUNS = Number(process.env.EVAL_RUNS ?? 5);
const PASS_THRESHOLD = Number(process.env.EVAL_PASS_THRESHOLD ?? 1.0);

for (const c of dataset) {
  test(`eval: ${c.id}`, async ({ askApi, catalog }, testInfo) => {
    const runs: { answer: string; checks: CheckResult[]; passed: boolean }[] = [];

    for (let i = 0; i < RUNS; i++) {
      const answer = await askApi(c.prompt);
      const checks: CheckResult[] = [
        mentionsAll(answer, c.mustMention),
        mentionsNone(answer, c.mustNotMention),
        maxWords(answer, c.maxWords),
        pricesMatchCatalog(answer, catalog),
        similarTo(answer, c.reference, c.minSimilarity),
      ];
      if (judgeAvailable()) {
        const verdict = await llmJudge(c.prompt, answer, c.rubric);
        checks.push({ name: 'LLM judge score >= 4', passed: verdict.score >= 4, detail: `${verdict.score}: ${verdict.reason}` });
      }
      runs.push({ answer, checks, passed: checks.every((ch) => ch.passed) });
    }

    const passRate = runs.filter((r) => r.passed).length / RUNS;
    const failures = runs.filter((r) => !r.passed).map((r) => ({
      answer: r.answer,
      failedChecks: r.checks.filter((ch) => !ch.passed),
    }));

    // Evidence for triage: every answer and every check, attached to the HTML report.
    await testInfo.attach('eval-result.json', {
      body: JSON.stringify({ case: c.id, prompt: c.prompt, runs: RUNS, passRate, failures, all: runs }, null, 2),
      contentType: 'application/json',
    });

    expect(passRate, `pass rate for "${c.id}"\nfailures: ${JSON.stringify(failures, null, 2)}`)
      .toBeGreaterThanOrEqual(PASS_THRESHOLD);
  });
}
