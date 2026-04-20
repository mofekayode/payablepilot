import json, re, subprocess, sys, os
from pathlib import Path
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

YTDLP = os.path.expanduser("~/Library/Python/3.9/bin/yt-dlp")
URLS = [
    "https://www.youtube.com/watch?v=7p_nIJY5_oU",
    "https://www.youtube.com/watch?v=6sFBmLwZlz8",
    "https://www.youtube.com/watch?v=CjcTT4H0cKA",
    "https://www.youtube.com/watch?v=qzcyzi1f3tA",
    "https://www.youtube.com/watch?v=w-j599WHQkU",
    "https://www.youtube.com/watch?v=u9O6ab541Dk",
]

def vid_of(url):
    return re.search(r"[?&]v=([^&]+)", url).group(1)

def get_metadata(url):
    r = subprocess.run(
        [YTDLP, "--skip-download", "--dump-json", "--no-warnings", url],
        capture_output=True, text=True, check=True,
    )
    return json.loads(r.stdout)

def clean_text(t: str) -> str:
    t = re.sub(r"\[[^\]]+\]", " ", t)       # strip [Music], [Applause]
    t = re.sub(r"\s+", " ", t)
    return t.strip()

def get_transcript(video_id):
    api = YouTubeTranscriptApi()
    try:
        fetched = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
    except Exception as e:
        return None, f"_(no transcript: {type(e).__name__})_"
    text = TextFormatter().format_transcript(fetched)
    return clean_text(text), None

def main():
    out = [
        "# Accounts Payable Clerk — Video Research Notes",
        "",
        "Source material compiled from YouTube videos. Each section includes the video title, link, channel, and full transcript cleaned to plain prose.",
        "",
    ]
    for url in URLS:
        vid = vid_of(url)
        print(f"fetching {vid}...", file=sys.stderr)
        md = get_metadata(url)
        title = md.get("title", "(unknown title)")
        uploader = md.get("uploader") or md.get("channel") or ""
        duration = md.get("duration")
        dur_str = f"{duration//60}m{duration%60}s" if duration else "?"
        transcript, err = get_transcript(vid)
        body = transcript if transcript else err
        out += [
            f"## {title}",
            "",
            f"- **Channel:** {uploader}",
            f"- **URL:** {url}",
            f"- **Duration:** {dur_str}",
            "",
            "### Transcript",
            "",
            body,
            "",
            "---",
            "",
        ]
    Path("/Users/eyimofeblessing-kayode/Desktop/AgencyAI/accounts_payable_clerk_video_notes.md").write_text("\n".join(out))
    print("done", file=sys.stderr)

if __name__ == "__main__":
    main()
