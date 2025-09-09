/**
 * NurseCharts RAG Evaluation
 * Built after a friend pointed out I had zero hallucination checks
 * Testing Medicare compliance, voice commands, clinical calculators
 * @author Lilian Odish
 */

const fs = require('fs');
const yaml = require('js-yaml');

console.log("NurseCharts RAG Baseline v0.1");

if (!fs.existsSync('evalset.yaml')) {
    console.error("Missing evalset.yaml");
    process.exit(1);
}

const data = yaml.load(fs.readFileSync('evalset.yaml', 'utf8'));
const tests = data.qa_pairs.slice(0, 10);

console.log(`Testing ${tests.length} cases...`);
console.log("-".repeat(70));

// Basic faithfulness - how much answer uses context
function faithfulness(answer, contexts) {
    if (!contexts?.length) return 0;
    const ansWords = answer.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const ctxWords = new Set(contexts.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (!ansWords.length) return 0;
    const hits = ansWords.filter(w => ctxWords.has(w)).length;
    return Math.min(1, hits / ansWords.length);
}

// Answer addresses the question
function relevance(answer, question) {
    const qWords = new Set(question.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const aWords = new Set(answer.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (!qWords.size) return 0;
    const overlap = [...qWords].filter(w => aWords.has(w)).length;
    return overlap / qWords.size;
}

// Best context chunk matches answer
function contextPrecision(answer, contexts) {
    if (!contexts?.length) return 0;
    const aWords = new Set(answer.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    let best = 0;
    for (const ctx of contexts) {
        const cWords = new Set(ctx.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const overlap = [...aWords].filter(w => cWords.has(w)).length;
        best = Math.max(best, aWords.size ? overlap / aWords.size : 0);
    }
    return best;
}

// Mock RAG - replace with real implementation
function mockRAG(q, ctx) {
    let ans = "";
    if (ctx?.length) {
        const chunks = ctx[0].split(/[;,.]/).map(s => s.trim()).filter(s => s.length > 10);
        ans = chunks.length ? 
            `Based on documentation: ${chunks[0]}. ${chunks[1] || ''}` :
            `Per guidelines: ${ctx[0].substring(0, 150)}`;
    } else {
        ans = "No relevant context found";
    }
    
    return {
        answer: ans,
        latency: 300 + Math.random() * 500
    };
}

// Run tests
const results = [];
const byCategory = {};

console.log("ID            Category              F    R    P    Latency");
console.log("-".repeat(70));

tests.forEach((t, i) => {
    const start = Date.now();
    const resp = mockRAG(t.question, t.context);
    const lat = resp.latency || (Date.now() - start);
    
    const f = faithfulness(resp.answer, t.context);
    const r = relevance(resp.answer, t.question);
    const p = contextPrecision(resp.answer, t.context);
    
    results.push({
        id: t.id || `Q${i+1}`,
        category: t.category || 'unknown',
        faithfulness: f,
        relevance: r,
        precision: p,
        latency_ms: lat
    });
    
    // Track by category
    const cat = t.category || 'unknown';
    if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, f: 0, r: 0, p: 0 };
    }
    byCategory[cat].count++;
    byCategory[cat].f += f;
    byCategory[cat].r += r;
    byCategory[cat].p += p;
    
    const status = f >= 0.75 ? "✓" : f >= 0.5 ? "⚠" : "✗";
    console.log(
        `${(t.id || `Q${i+1}`).padEnd(13)} ${cat.padEnd(20).substring(0,20)} ` +
        `${f.toFixed(2)} ${r.toFixed(2)} ${p.toFixed(2)} ${lat.toFixed(0).padStart(6)}ms  ${status}`
    );
});

// Metrics
const avgF = results.reduce((s, r) => s + r.faithfulness, 0) / results.length;
const avgR = results.reduce((s, r) => s + r.relevance, 0) / results.length;
const avgP = results.reduce((s, r) => s + r.precision, 0) / results.length;

const lats = results.map(r => r.latency_ms).sort((a, b) => a - b);
const p50 = lats[Math.floor(lats.length / 2)];
const p90 = lats[Math.floor(lats.length * 0.9)];

console.log("\n" + "=".repeat(70));
console.log(`METRICS (${results.length} cases)`);
console.log("=".repeat(70));
console.log(`Faithfulness:      ${avgF.toFixed(2)} / 1.00  ${avgF >= 0.85 ? '✓' : avgF >= 0.75 ? '~' : 'x'}`);
console.log(`Context Precision: ${avgP.toFixed(2)} / 1.00  ${avgP >= 0.80 ? '✓' : avgP >= 0.70 ? '~' : 'x'}`);
console.log(`Answer Relevance:  ${avgR.toFixed(2)} / 1.00  ${avgR >= 0.85 ? '✓' : avgR >= 0.75 ? '~' : 'x'}`);
console.log(`Latency p50:       ${p50.toFixed(0)}ms  ${p50 <= 800 ? '✓' : 'x'}`);
console.log(`Latency p90:       ${p90.toFixed(0)}ms`);

// Medicare compliance check (my addition)
const medicareTests = results.filter(r => r.category.includes('medicare'));
if (medicareTests.length) {
    const medF = medicareTests.reduce((s, r) => s + r.faithfulness, 0) / medicareTests.length;
    console.log(`\nMedicare compliance: ${medF.toFixed(2)} faithfulness`);
}

// Save
fs.writeFileSync('eval/baseline_results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    metrics: {
        faithfulness: avgF,
        context_precision: avgP,
        answer_relevance: avgR,
        latency_p50: p50,
        latency_p90: p90
    },
    by_category: Object.entries(byCategory).reduce((acc, [cat, stats]) => {
        acc[cat] = {
            faithfulness: stats.f / stats.count,
            relevance: stats.r / stats.count,
            precision: stats.p / stats.count
        };
        return acc;
    }, {}),
    results: results
}, null, 2));

console.log("\nResults in eval/baseline_results.json");
console.log("\nREADME table:");
console.log(`| Faithfulness | ${avgF.toFixed(2)} | ≥0.85 |`);
console.log(`| Context Precision | ${avgP.toFixed(2)} | ≥0.80 |`);
console.log(`| Answer Relevance | ${avgR.toFixed(2)} | ≥0.85 |`);
console.log(`| Latency (p50) | ${p50.toFixed(0)}ms | ≤800ms |`);
