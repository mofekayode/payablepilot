"""Score each AP clerk listing by how much PayablePilot can replace.

Heuristic: detect task-mentions in the description against two taxonomies —
things the agent handles (invoice capture, PO matching, GL coding, vendor
reminders, etc.) and things it cannot (check printing, bank deposits, phone
calls, AR, payroll, etc.). Score = handled / (handled + not_handled).

Output goes to demo/src/lib/jobs-scored.json for the UI to render.
"""
import json
import re
from pathlib import Path

IN_PATH = Path("/Users/eyimofeblessing-kayode/code/payablepilot/JobListings/accounts-payable-clerk.json")
OUT_PATH = Path(
    "/Users/eyimofeblessing-kayode/code/payablepilot/AccountPayableAgent/demo/src/lib/jobs-scored.json"
)

HANDLED = {
    "Invoice processing / entry": [
        r"process(ing)? (of )?(vendor )?invoices?",
        r"invoice entry",
        r"enter(ing)? invoices?",
        r"invoice (receipt|review|coding)",
        r"booking invoices?",
        r"invoice (data )?entry",
        r"code? invoices?",
        r"invoice processing",
    ],
    "PO matching / 3-way match": [
        r"(3|three|two|2).?way match",
        r"\bpo match",
        r"purchase order match",
        r"match(ing)?.{0,30}(po\b|purchase order|invoice)",
        r"verify.{0,40}(po\b|purchase order)",
    ],
    "GL coding": [
        r"\bgl\b.?cod",
        r"general ledger",
        r"account cod",
        r"chart of accounts",
        r"expense coding",
        r"cost cod",
    ],
    "Discrepancy resolution": [
        r"discrepanc",
        r"resolve.{0,30}(invoice|payment|vendor)",
        r"invoice dispute",
        r"variance",
    ],
    "Duplicate detection": [
        r"duplicate",
        r"double.?paid",
        r"prevent.{0,20}(double|duplicate)",
    ],
    "Posts bills to QuickBooks / Xero": [
        r"(check|ach|wire) run",
        r"payment run",
        r"payment batch",
        r"weekly check",
        r"prepare payments",
        r"select invoices for payment",
        r"schedule payments",
        r"payment processing",
        r"post (bills?|invoices?)",
        r"(quickbooks|xero|qbo)",
    ],
    "Vendor statement reconciliation": [
        r"vendor statement",
        r"reconcil.{0,30}statement",
        r"statement reconciliation",
    ],
    "Vendor email / follow-up": [
        r"vendor inquir",
        r"respond.{0,30}vendor",
        r"vendor.{0,15}(email|correspondence|communicat)",
        r"communicate.{0,20}vendor",
        r"follow.?up.{0,20}vendor",
    ],
    "W-9 / 1099 tracking": [
        r"w-?9",
        r"1099",
        r"year.?end tax form",
    ],
    "AP aging / reporting": [
        r"aging report",
        r"ap aging",
        r"accounts payable aging",
        r"ap reporting",
    ],
    "Expense report coding": [
        r"expense report",
        r"expense reimburs",
        r"employee expense",
    ],
    "Credit card / receipt matching": [
        r"credit card reconcil",
        r"card transactions",
        r"missing receipt",
        r"receipt match",
        r"\bp.?card\b",
    ],
    "Month-end close (AP)": [
        r"month.?end",
        r"monthly close",
        r"closing entries",
        r"period.?end close",
    ],
    "Accruals": [r"accrual"],
    "Data entry into QuickBooks / Xero": [
        r"data entry",
        r"enter.{0,20}(quickbooks|sap|netsuite|oracle|dynamics|sage|xero|erp)",
        r"post.{0,20}(invoice|bill)",
    ],
}

NOT_HANDLED = {
    "Physical check printing / mailing": [
        r"print(ing)? checks?",
        r"check printing",
        r"physical checks?",
        r"mail checks?",
        r"cut checks?",
        r"stuff(ing)? checks?",
    ],
    "Wire transfer execution": [
        r"execute.{0,20}wire",
        r"initiate.{0,20}wire",
        r"send wire",
    ],
    "Cash handling / deposits": [
        r"cash deposit",
        r"bank deposit",
        r"handle cash",
        r"petty cash",
    ],
    "Phone calls with vendors": [
        r"phone call",
        r"answer (the )?phone",
        r"incoming calls",
        r"telephone",
        r"vendor calls",
    ],
    "In-person / on-site duties": [
        r"in.?person",
        r"\bon.?site\b",
        r"site visit",
        r"walk.?in",
    ],
    "Bank reconciliation": [
        r"bank reconcil",
        r"reconcile.{0,20}bank (account|statement)",
    ],
    "Payroll": [r"payroll"],
    "Tax filing / returns": [
        r"sales tax",
        r"tax filing",
        r"tax return",
        r"file.{0,20}tax",
    ],
    "AR / collections / customer billing": [
        r"accounts receivable",
        r"\ba/?r\b",
        r"collections",
        r"customer invoic",
        r"billing.{0,20}customer",
        r"customer payment",
    ],
    "Physical filing": [
        r"filing.{0,20}(paper|documents|invoices)",
        r"physical file",
        r"scan(ning)? (and )?filing",
    ],
    "Inventory": [r"inventory"],
    "HR duties": [
        r"human resources",
        r"\bhr\b.{0,20}(task|duties|admin)",
    ],
    "Office / admin support": [
        r"administrative support",
        r"office management",
        r"office admin",
        r"greet(ing)? visitors",
        r"mail sorting",
    ],
}


def compile_patterns(taxonomy):
    return {label: [re.compile(p, re.IGNORECASE) for p in patterns] for label, patterns in taxonomy.items()}


HANDLED_C = compile_patterns(HANDLED)
NOT_HANDLED_C = compile_patterns(NOT_HANDLED)


def categories_hit(text, compiled):
    hits = []
    for label, patterns in compiled.items():
        if any(p.search(text) for p in patterns):
            hits.append(label)
    return hits


def score_job(description):
    text = description or ""
    handled = categories_hit(text, HANDLED_C)
    not_handled = categories_hit(text, NOT_HANDLED_C)
    total = len(handled) + len(not_handled)
    if total == 0:
        return {"score": None, "handled": [], "notHandled": []}
    pct = round(100 * len(handled) / total)
    return {"score": pct, "handled": handled, "notHandled": not_handled}


def main():
    with IN_PATH.open() as f:
        jobs = json.load(f)

    out = []
    for j in jobs:
        desc = j.get("description") or ""
        scored = score_job(desc)
        out.append({
            "id": j.get("id"),
            "position": j.get("positionName"),
            "company": j.get("company"),
            "location": j.get("location"),
            "salary": j.get("salary"),
            "jobType": j.get("jobType"),
            "url": j.get("url"),
            "externalApplyLink": j.get("externalApplyLink"),
            "postedAt": j.get("postedAt"),
            "description": desc,
            **scored,
        })

    # sort by score descending, None last
    out.sort(key=lambda r: (-1 if r["score"] is None else -r["score"], r["company"] or ""))

    # Summary stats
    scored_only = [r for r in out if r["score"] is not None]
    if scored_only:
        avg = sum(r["score"] for r in scored_only) / len(scored_only)
        high = sum(1 for r in scored_only if r["score"] >= 70)
        mid = sum(1 for r in scored_only if 40 <= r["score"] < 70)
        low = sum(1 for r in scored_only if r["score"] < 40)
    else:
        avg, high, mid, low = 0, 0, 0, 0

    summary = {
        "total": len(out),
        "scored": len(scored_only),
        "avgScore": round(avg, 1),
        "highCoverage": high,  # >= 70%
        "midCoverage": mid,    # 40-69
        "lowCoverage": low,    # < 40
        "categoriesHandled": list(HANDLED.keys()),
        "categoriesNotHandled": list(NOT_HANDLED.keys()),
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as f:
        json.dump({"summary": summary, "jobs": out}, f, indent=1)

    print(f"Wrote {len(out)} jobs to {OUT_PATH}")
    print(f"Summary: avg={avg:.1f}%, high={high}, mid={mid}, low={low}")


if __name__ == "__main__":
    main()
