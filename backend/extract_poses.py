#!/usr/bin/env python3
"""
Download a YouTube video with yt-dlp and extract per-frame pose landmarks
using MediaPipe. Outputs a JSON file compatible with the DanceMatch level format.

Usage:
    python extract_poses.py <youtube_url> <output_json_path> [fps]

Progress is reported to stdout as:
    PROGRESS:<0-100>
    STATUS:<message>
"""

import sys
import os

# Must be set before mediapipe is imported
os.environ['MEDIAPIPE_DISABLE_GPU'] = '1'

import json
import re
import subprocess
import tempfile
import shutil

PYTHON_BIN = sys.executable
NODE_BIN   = shutil.which('node') or 'node'

# Optional cookies.txt path — place a Netscape-format cookies file here
# to avoid YouTube rate limits. Export from Chrome via the
# "Get cookies.txt LOCALLY" extension, save as cookies.txt in the backend folder.
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(SCRIPT_DIR, 'cookies.txt')


def get_video_id(url):
    patterns = [
        r'(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})',
        r'(?:embed/)([A-Za-z0-9_-]{11})',
        r'(?:shorts/)([A-Za-z0-9_-]{11})',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def download_video(url, output_path):
    """Download best quality mp4 at max 720p using yt-dlp via Python 3.10."""
    python = PYTHON_BIN

    cmd = [
        python, '-m', 'yt_dlp',
        '--js-runtimes', f'node:{NODE_BIN}',
        '-f', 'best[height<=720][ext=mp4]/best[height<=720]/best',
        '--merge-output-format', 'mp4',
        '-o', output_path,
        '--no-playlist',
        '--retries', '3',
        '--fragment-retries', '3',
        '--retry-sleep', 'linear=1::2',
    ]

    # Use cookies file if available (bypasses YouTube rate limiting)
    if os.path.exists(COOKIES_FILE):
        cmd += ['--cookies', COOKIES_FILE]

    cmd.append(url)

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        stderr = result.stderr.strip()
        if '429' in stderr:
            raise RuntimeError(
                'YouTube is rate-limiting this machine (HTTP 429). '
                'Fix: install the "Get cookies.txt LOCALLY" Chrome extension, '
                'go to youtube.com, export cookies, and save the file as '
                'backend/cookies.txt next to server.js.'
            )
        raise RuntimeError(f'yt-dlp error: {stderr}')


MODEL_PATH = os.path.join(SCRIPT_DIR, 'pose_landmarker_lite.task')
MODEL_URL  = (
    'https://storage.googleapis.com/mediapipe-models/'
    'pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
)


def ensure_model():
    if not os.path.exists(MODEL_PATH):
        import urllib.request
        print('STATUS:Downloading pose model (~5 MB, one-time)...', flush=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)


def extract_poses(video_path, target_fps=10):
    import cv2
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    ensure_model()

    base_options = mp_python.BaseOptions(
        model_asset_path=MODEL_PATH,
        delegate=mp_python.BaseOptions.Delegate.CPU,
    )
    options = mp_vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=mp_vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError('Could not open video file')

    video_fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration     = total_frames / video_fps
    frame_interval = max(1, round(video_fps / target_fps))

    frames = []
    frame_idx    = 0
    last_progress = -1

    with mp_vision.PoseLandmarker.create_from_options(options) as landmarker:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                timestamp_ms = int((frame_idx / video_fps) * 1000)
                rgb      = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result   = landmarker.detect_for_video(mp_image, timestamp_ms)

                if result.pose_landmarks:
                    landmarks = [
                        {
                            'x': lm.x,
                            'y': lm.y,
                            'z': lm.z,
                            'visibility': lm.visibility if lm.visibility is not None else 1.0,
                        }
                        for lm in result.pose_landmarks[0]
                    ]
                    frames.append({
                        'timestamp': round(frame_idx / video_fps, 3),
                        'landmarks': landmarks,
                    })

                progress = int((frame_idx / max(total_frames, 1)) * 100)
                if progress != last_progress:
                    print(f'PROGRESS:{progress}', flush=True)
                    last_progress = progress

            frame_idx += 1

    cap.release()
    return frames, round(duration, 3)


def main():
    if len(sys.argv) < 3:
        print('Usage: extract_poses.py <youtube_url> <output_json_path> [fps]', file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]
    output_path = sys.argv[2]
    fps = int(sys.argv[3]) if len(sys.argv) > 3 else 10

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    is_local = os.path.isfile(url)  # url is actually a local file path in upload mode
    is_youtube = not is_local and url.startswith('http')

    if is_youtube:
        video_id = get_video_id(url)
        if not video_id:
            print('STATUS:ERROR: Invalid YouTube URL', flush=True)
            sys.exit(1)
    else:
        video_id = None

    print('PROGRESS:0', flush=True)

    tmp_path = None
    try:
        if is_local:
            # Uploaded file — skip download entirely
            print('STATUS:Extracting poses...', flush=True)
            video_file = url
            cleanup_tmp = False
        else:
            # YouTube URL — download first
            print('STATUS:Downloading video...', flush=True)
            tmp_fd, tmp_path = tempfile.mkstemp(suffix='.mp4')
            os.close(tmp_fd)
            download_video(url, tmp_path)
            video_file = tmp_path
            cleanup_tmp = True
            print('STATUS:Extracting poses...', flush=True)

        frames, duration = extract_poses(video_file, fps)

        if not frames:
            print('STATUS:ERROR: No poses detected in video', flush=True)
            sys.exit(1)

        result = {
            'type': 'upload' if is_local else 'youtube',
            'duration': duration,
            'fps': fps,
            'frames': frames,
        }
        if is_youtube:
            result['videoId'] = video_id
            result['youtubeUrl'] = url

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f)

        print('PROGRESS:100', flush=True)
        print('STATUS:Done', flush=True)

    except Exception as e:
        msg = str(e).encode('ascii', errors='replace').decode('ascii')
        print(f'STATUS:ERROR: {msg}', flush=True)
        sys.exit(1)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == '__main__':
    main()
