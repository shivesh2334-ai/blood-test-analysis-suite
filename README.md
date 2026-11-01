# MedLab Blood Test Analysis Suite

Live: https://blood-test-analysis-suite.vercel.app/

Adapted from https://github.com/shivesh2334-ai/4Blood-trst-rag-ds, commit e87a41223ea4b130e4054de358bfd2477e69ccf2. The original seven source files and license are preserved under `legacy-streamlit/` and at the root.

## Active application

- All ten focus panels retained: anemia, renal, liver, thyroid, lipids, diabetes, vitamin D, B12, cancer and rheumatoid arthritis.
- Image OCR (JPG/JPEG/PNG), direct text extraction from PDFs, scanned-PDF OCR and text paste/import. Pinned browser libraries: Tesseract.js 7.0.0 / core 7.0.0 and PDF.js 6.4.299. Libraries/models load on demand from public CDNs; report content stays in the browser.
- Every populated manual or parsed row enters the same review/analysis dataset. Switching focus adds relevant fields without losing earlier values. More than 80 original parameters, coagulation, immunology, new markers and custom tests are supported.
- Correct/delete values, units and reference intervals. Parsed values require explicit verification; unresolved lines require acknowledgment. Original lines, provenance and bounded/qualitative values remain visible. Duplicates are retained and excluded from ambiguous cross-test rules.
- Unit-aware critical alerts; category analysis, supported pattern recognition, differential considerations, next-step/follow-up suggestions. Missing/unknown results are not marked normal. No automatic prescription or probability claim.
- Source-linked RAG insights and knowledge search: a local TF-IDF vector index with cosine similarity retrieves curated clinical passages, then produces an extractive source-grounded answer. This replaces the original FAISS/MiniLM runtime in the browser, preserving knowledge retrieval without requiring a server or key. It is not a generative LLM. Original FAISS/MiniLM implementation remains runnable separately with Streamlit.
- Screening/Standard/Comprehensive/Academic depth, in-memory report history, full JSON export and print/PDF.

## Clinical boundaries

Report-specific intervals override optional adult seed intervals. The original seed catalog is retained with corrected vitamin D, one-sided HDL/eGFR limits. These seeds are illustrative and require verification. Units are normalized only for explicitly supported conversions. Unsupported units can still be compared against supplied report intervals, but are excluded from numerical pattern rules. Lp(a) mass/molar units are not interconverted.

Adult diagnostic rules are disabled for children and pregnancy. GFR categories do not establish CKD chronicity. Tumor markers do not diagnose/exclude cancer; RF/anti-CCP do not independently establish RA. Source links and concise paraphrases are in `knowledge.js`; reviewed 1 November 2026. Clinical rule outputs require clinician validation.

## Vercel

Static framework, no install/build command, output `.`. No patient backend, API keys or permanent storage. CSP permits only the pinned dependency host and OCR language-model host in addition to self/blob requirements. OCR downloads require internet connectivity; English language only. File limits: 20 MB, 20 PDF pages, 25 megapixels per OCR canvas. For an incomplete text layer choose Force OCR.

## Validation

`node --test tests/engine.test.cjs`

Regression coverage includes parsing aliases, duplicates, unknown lines, bounded and qualitative results, unit normalization, cross-panel inclusion, critical alerts, kidney staging, absent FT4, age/pregnancy restrictions and source retrieval. Browser verification additionally covers upload/OCR, PDF extraction, review and report generation.

## Original Streamlit workflow

`pip install -r legacy-streamlit/requirements.txt` then `streamlit run legacy-streamlit/app.py` from that directory with system Tesseract/Poppler and sufficient model memory. The original code is preserved unchanged for compatibility/reference; use the active web interface for corrected interpretation rules.
