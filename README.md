# Blood Test Analysis Suite

Adapted from https://github.com/shivesh2334-ai/4Blood-trst-rag-ds (MIT). All seven original source files are preserved under `legacy-streamlit/`; original license retained at root.

The Vercel-compatible static interface asks for analysis type before displaying relevant laboratory input fields: anemia, renal, liver, thyroid, lipid, diabetes, vitamin D, vitamin B12, cancer and rheumatoid arthritis.

Enter laboratory values, exact units and optional paired report-specific reference limits. Blank tests are excluded. Results are compared only against supplied intervals, with no diagnosis, automatic unit conversion or treatment recommendation. Reports export to JSON or print/PDF. Changing inputs invalidates the displayed analysis. Values stay in memory only; no backend or persistence.

Cancer and rheumatoid arthritis context is based on NCI tumor marker guidance and NICE NG100, linked in the interface. This is a laboratory comparison tool, not a validated clinical diagnostic system.

## Deployment
Import this repository into Vercel. Framework: Other. No install/build commands; output directory `.`. No API keys required. The original Streamlit OCR/RAG implementation is archived, not exposed as a functioning Vercel backend. Run the legacy app separately with Streamlit and its own dependencies if needed.

## Local check
`python -m http.server 8000` from repository root. Visit http://localhost:8000.
