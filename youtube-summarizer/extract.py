import os
import sys
import json
import subprocess
import tempfile
import re
from pathlib import Path
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound


def extract_video_id(url: str) -> str:
    patterns = [r"(?:v=|youtu\.be/|embed/|shorts/)([a-zA-Z0-9_-]{11})"]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from: {url}")


def get_video_title(video_id: str) -> str:
    """Fetch video title using yt-dlp"""
    url = f"https://www.youtube.com/watch?v={video_id}"
    result = subprocess.run(
        ["yt-dlp", "--get-title", url],
        capture_output=True, text=True
    )
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip()
    return None


def slugify(text: str, max_length: int = 50) -> str:
    """Convert text to a filename-safe slug"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    text = text.strip('-')
    if len(text) > max_length:
        text = text[:max_length].rsplit('-', 1)[0]
    return text


def categorize_video(title: str) -> str:
    """Auto-categorize video based on title keywords"""
    title_lower = title.lower()

    categories = {
        'setup': ['setup', 'install', 'getting started', 'tutorial', 'how to set', 'configure', 'installation'],
        'features': ['features', 'capabilities', 'what can', 'demo', 'showcase', 'overview'],
        'workflows': ['workflow', 'automation', 'use case', 'productivity', 'tips', 'tricks'],
        'coding': ['code', 'coding', 'vibe', 'programming', 'developer', 'build', 'app'],
        'advanced': ['advanced', 'deep dive', 'masterclass', 'expert', 'pro tips'],
        'comparison': ['vs', 'versus', 'compare', 'comparison', 'better than'],
        'news': ['update', 'news', 'announcement', 'release', 'new version'],
    }

    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in title_lower:
                return category

    return 'general'


def get_transcript(video_id: str) -> list:
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        transcript_list = [{"start": snippet.start, "text": snippet.text} for snippet in transcript]
        print(f"    ✓ Transcript fetched ({len(transcript_list)} segments)")
        return transcript_list
    except (TranscriptsDisabled, NoTranscriptFound):
        print("    ✗ No transcript available for this video.")
        return []
    except Exception as e:
        print(f"    ✗ Error fetching transcript: {e}")
        return []


def format_transcript(transcript: list, video_id: str, title: str) -> str:
    lines = [
        f"Title: {title}",
        f"Video ID: {video_id}",
        f"YouTube URL: https://www.youtube.com/watch?v={video_id}",
        f"Timestamped link format: https://youtu.be/{video_id}?t=SECONDS",
        "---\n"
    ]
    for entry in transcript:
        t = int(entry["start"])
        mins, secs = divmod(t, 60)
        hrs, mins = divmod(mins, 60)
        ts = f"[{hrs}:{mins:02d}:{secs:02d}]" if hrs else f"[{mins}:{secs:02d}]"
        link = f"https://youtu.be/{video_id}?t={int(entry['start'])}"
        lines.append(f"{ts}({link}) {entry['text']}")
    return "\n".join(lines)


def extract_screenshots(video_id: str, output_dir: str, interval: int = 60):
    url = f"https://www.youtube.com/watch?v={video_id}"
    os.makedirs(output_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "video.mp4")

        print("    Downloading video (low resolution)...")
        result = subprocess.run(
            ["yt-dlp", "-f", "best[height<=480]", "-o", video_path, url],
            capture_output=True, text=True
        )

        if not os.path.exists(video_path):
            print("    ✗ Could not download video. Skipping screenshots.")
            return 0

        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", video_path],
            capture_output=True, text=True
        )
        duration = float(json.loads(probe.stdout)["format"]["duration"])
        timestamps = list(range(0, int(duration), interval))

        print(f"    Extracting {len(timestamps)} screenshots...")
        count = 0
        for ts in timestamps:
            mins, secs = divmod(ts, 60)
            frame_name = f"frame_{ts:05d}s_{mins:02d}m{secs:02d}s.jpg"
            frame_path = os.path.join(output_dir, frame_name)
            subprocess.run(
                ["ffmpeg", "-ss", str(ts), "-i", video_path,
                 "-vframes", "1", "-q:v", "3", frame_path, "-y"],
                capture_output=True
            )
            if os.path.exists(frame_path):
                count += 1

        print(f"    ✓ {count} screenshots saved")
        return count


def process_video(url: str, base_dir: str, skip_screenshots: bool = False, interval: int = 60):
    """Process a single video and return metadata"""
    print(f"\n  📹 Processing: {url}")

    video_id = extract_video_id(url)
    print(f"    Video ID: {video_id}")

    # Get video title
    title = get_video_title(video_id)
    if not title:
        print("    ✗ Could not fetch title")
        return None

    slug = slugify(title)
    category = categorize_video(title)
    print(f"    Title: {title}")
    print(f"    Category: {category}")

    # Create video folder
    video_dir = os.path.join(base_dir, "videos", category, slug)
    os.makedirs(video_dir, exist_ok=True)

    # Fetch transcript
    print("    📝 Fetching transcript...")
    transcript = get_transcript(video_id)
    if not transcript:
        return None

    # Save transcript
    transcript_text = format_transcript(transcript, video_id, title)
    transcript_file = os.path.join(video_dir, "transcript.txt")
    with open(transcript_file, "w") as f:
        f.write(transcript_text)
    print(f"    ✓ Transcript saved")

    # Screenshots
    screenshots_dir = None
    if not skip_screenshots:
        print("    🖼  Extracting screenshots...")
        screenshots_dir = os.path.join(video_dir, "screenshots")
        extract_screenshots(video_id, screenshots_dir, interval)

    # Save metadata
    metadata = {
        "video_id": video_id,
        "title": title,
        "slug": slug,
        "category": category,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "transcript_file": transcript_file,
        "screenshots_dir": screenshots_dir
    }

    metadata_file = os.path.join(video_dir, "metadata.json")
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata


def main():
    if len(sys.argv) < 2:
        print("""
YouTube Video Extractor - Batch Processing

Usage:
  python3 extract.py <url1> [url2] [url3] [options]

Options:
  --no-screenshots    Skip screenshot extraction (faster)
  --interval N        Screenshot interval in seconds (default: 60)

Examples:
  python3 extract.py "https://youtube.com/watch?v=VIDEO1"
  python3 extract.py "URL1" "URL2" "URL3" --no-screenshots
  python3 extract.py "URL1" "URL2" --interval 30
        """)
        sys.exit(1)

    # Parse arguments
    urls = []
    skip_screenshots = "--no-screenshots" in sys.argv
    interval = 60

    for i, arg in enumerate(sys.argv[1:], 1):
        if arg.startswith("http"):
            urls.append(arg)
        elif arg == "--interval" and i + 1 < len(sys.argv):
            interval = int(sys.argv[i + 1])

    if not urls:
        print("Error: No valid URLs provided")
        sys.exit(1)

    if len(urls) > 3:
        print("Warning: Processing only first 3 URLs")
        urls = urls[:3]

    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Ensure folder structure exists
    os.makedirs(os.path.join(base_dir, "videos"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "summaries"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "guides"), exist_ok=True)

    print(f"\n🎬 Processing {len(urls)} video(s)...")
    print("=" * 60)

    results = []
    for url in urls:
        try:
            metadata = process_video(url, base_dir, skip_screenshots, interval)
            if metadata:
                results.append(metadata)
        except Exception as e:
            print(f"    ✗ Error processing {url}: {e}")

    # Print summary
    print("\n" + "=" * 60)
    print(f"✅ Completed! Processed {len(results)}/{len(urls)} videos\n")

    print("📁 Folder Structure:")
    print("youtube-summarizer/")
    print("├── videos/")

    # Group by category
    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(r)

    for cat, vids in categories.items():
        print(f"│   └── {cat}/")
        for v in vids:
            print(f"│       └── {v['slug']}/")
            print(f"│           ├── transcript.txt")
            print(f"│           ├── metadata.json")
            if v.get("screenshots_dir"):
                print(f"│           └── screenshots/")

    print("├── summaries/")
    print("└── guides/")

    # Print Claude command
    print("\n" + "=" * 60)
    print("📋 To summarize all videos, run:\n")

    transcript_paths = [r["transcript_file"] for r in results]
    print(f'claude "Read these transcripts and create summaries:')
    for p in transcript_paths:
        rel_path = os.path.relpath(p, base_dir)
        print(f'  - {rel_path}')
    print('Save each summary to summaries/<slug>.md"')
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
