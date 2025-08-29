# NurseCharts — Architecture Teardown (Maintenance-Mode)

**Problem →** Hospice documentation is time-intensive and cognitively heavy.  
**Goal →** Convert voice + EMR paste into Medicare-compliant notes with QA signals and copy-to-EMR output.  
**Status →** Maintenance-mode; applying learnings to team workflows (agentic pipelines + evals).

![Architecture](./nursecharts-architecture.png)

## Architecture at a glance
1. **Voice Input (Mic/Upload)** → nurse speaks or uploads audio; optional typed notes.
2. **Deepgram STT** → transcript with timestamps.
3. **Stage 1: PHI Scrub + Intake** → local-first minimization; EMR paste support.
4. **Stage 2: Extract & Normalize** → vitals, ADLs, meds, symptoms; standardized terms.
5. **Stage 3–4: Clinical Reasoning + Note Generation** → decline trajectory, interventions, caregiver education → draft narrative.
6. **Stage 5: QA & Compliance → Outputs** → LCD/CoP checks, consistency passes, copy-to-EMR; also export education topics, interventions, and risk flags.

## Tech Stack (representative)
- Next.js + TypeScript (UI), Deepgram (STT), prompt-engineered generation
- Local-first PHI minimization; ephemeral processing where possible
- Clipboard-friendly output for HospiceMD

## Limits & Lessons
- **Limits:** Not a medical device; outputs require clinician review; model hallucinations mitigated but possible.
- **Privacy:** Do not store PHI; minimize scope; prefer browser-side processing.
- **Operational:** Fast to demo; real-world requires evals + governance + change management.

## Next
- Publish eval harness (20 realistic cases; faithfulness/context precision charts)
- Agentic workflow prototype for one RFP section (security) with LangGraph diagram
- Weekly public updates: *artifact → limits → next steps*
