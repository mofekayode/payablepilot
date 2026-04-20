import asyncio, json, os, sys, time
from pathlib import Path
from anthropic import AsyncAnthropic

API_KEY = os.environ["ANTHROPIC_API_KEY"]
MODEL = "claude-sonnet-4-6"
CONCURRENCY = 12
MAX_RETRIES = 4

client = AsyncAnthropic(api_key=API_KEY)

SYSTEM_PROMPT = """You are scoring Indeed job listings for automation-opportunity assessment.

For each job description, score it on 5 criteria (0-2 each, max 10):

1. AUTOMATION_FEASIBILITY: Are 80%+ of tasks rule-based and repetitive? (2=yes, 1=mixed, 0=mostly judgment-based)
2. NO_PHONE_REQUIRED: Is the role text/email/system-based with no phone duties? (2=no calls mentioned, 1=calls mentioned but secondary, 0=calls are primary)
3. SYSTEM_SPECIFICITY: Does it mention 2+ named software tools with APIs? (2=yes multiple, 1=one tool, 0=none or just MS Office)
4. WORKFLOW_REPEATABILITY: Would this exact workflow exist at 100 other companies? (2=yes nearly identical, 1=somewhat, 0=unique role)
5. SALARY_ANCHOR: Is the pay $50K+/yr or $25+/hr? (2=yes, 1=$35-50K range, 0=under $35K)

Also extract:
- company_size: "small" (<50), "mid" (50-200), "large" (200+), or "unknown"
- remote_status: "remote", "hybrid", "in-person", or "unknown"
- industry: best guess sector (e.g., "Healthcare", "SaaS", "Manufacturing", "Finance", "Logistics")
- tools_mentioned: list of specific named software (SAP, Salesforce, NetSuite, QuickBooks, Oracle, Workday, ServiceNow, Jira, etc.). Exclude generic "MS Office / Excel / Word" unless that is the only tool.
- core_tasks: list of the actual daily tasks described in the listing (5-10 short bullets)
- role_title: exact title from the listing
- salary_range: as listed (or "not listed")

Call the score_job tool exactly once with your evaluation. Be strict and calibrated — do not inflate scores."""

TOOL = {
    "name": "score_job",
    "description": "Record scoring and extracted fields for a single job listing.",
    "input_schema": {
        "type": "object",
        "properties": {
            "automation_feasibility": {"type": "integer", "minimum": 0, "maximum": 2},
            "no_phone_required": {"type": "integer", "minimum": 0, "maximum": 2},
            "system_specificity": {"type": "integer", "minimum": 0, "maximum": 2},
            "workflow_repeatability": {"type": "integer", "minimum": 0, "maximum": 2},
            "salary_anchor": {"type": "integer", "minimum": 0, "maximum": 2},
            "total_score": {"type": "integer", "minimum": 0, "maximum": 10},
            "score_rationale": {"type": "string", "description": "1-2 sentence justification for the scores."},
            "company_size": {"type": "string", "enum": ["small", "mid", "large", "unknown"]},
            "remote_status": {"type": "string", "enum": ["remote", "hybrid", "in-person", "unknown"]},
            "industry": {"type": "string"},
            "tools_mentioned": {"type": "array", "items": {"type": "string"}},
            "core_tasks": {"type": "array", "items": {"type": "string"}},
            "role_title": {"type": "string"},
            "salary_range": {"type": "string"},
        },
        "required": [
            "automation_feasibility", "no_phone_required", "system_specificity",
            "workflow_repeatability", "salary_anchor", "total_score", "score_rationale",
            "company_size", "remote_status", "industry", "tools_mentioned",
            "core_tasks", "role_title", "salary_range",
        ],
    },
}


def build_user_content(job: dict) -> str:
    desc = (job.get("description") or "")[:8000]
    return (
        f"Title: {job.get('positionName','')}\n"
        f"Company: {job.get('company','')}\n"
        f"Location: {job.get('location','')}\n"
        f"Salary (as listed): {job.get('salary') or 'not listed'}\n"
        f"Job Type: {job.get('jobType','')}\n"
        f"Company reviews count: {job.get('reviewsCount','')}\n"
        f"Company rating: {job.get('rating','')}\n\n"
        f"Description:\n{desc}"
    )


async def score_one(job: dict, sem: asyncio.Semaphore, idx: int):
    content = build_user_content(job)
    async with sem:
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.messages.create(
                    model=MODEL,
                    max_tokens=1500,
                    system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
                    tools=[TOOL],
                    tool_choice={"type": "tool", "name": "score_job"},
                    messages=[{"role": "user", "content": content}],
                )
                for block in resp.content:
                    if block.type == "tool_use" and block.name == "score_job":
                        usage = resp.usage
                        return idx, block.input, {
                            "input_tokens": usage.input_tokens,
                            "cache_read": getattr(usage, "cache_read_input_tokens", 0) or 0,
                            "cache_create": getattr(usage, "cache_creation_input_tokens", 0) or 0,
                            "output_tokens": usage.output_tokens,
                        }
                return idx, None, None
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[{idx}] FAIL after retries: {e}", file=sys.stderr)
                    return idx, None, None
                await asyncio.sleep(2 ** attempt)


async def process_file(path: Path):
    data = json.loads(path.read_text())
    sem = asyncio.Semaphore(CONCURRENCY)
    t0 = time.time()
    tasks = [score_one(job, sem, i) for i, job in enumerate(data)]
    totals = {"input_tokens": 0, "cache_read": 0, "cache_create": 0, "output_tokens": 0}
    ok = 0
    for coro in asyncio.as_completed(tasks):
        idx, enrichment, usage = await coro
        if enrichment:
            data[idx]["enrichment"] = enrichment
            ok += 1
        if usage:
            for k in totals:
                totals[k] += usage[k]
        if ok % 10 == 0 and ok:
            print(f"  [{path.name}] {ok}/{len(data)} done", flush=True)
    dur = time.time() - t0
    path.write_text(json.dumps(data, indent=2))
    print(f"DONE {path.name}: {ok}/{len(data)} enriched in {dur:.1f}s  tokens: {totals}")


async def main():
    folder = Path("/Users/eyimofeblessing-kayode/Desktop/AgencyAI/JobListings")
    files = sorted(p for p in folder.glob("*.json") if ".enriched" not in p.name)
    for p in files:
        await process_file(p)


if __name__ == "__main__":
    asyncio.run(main())
