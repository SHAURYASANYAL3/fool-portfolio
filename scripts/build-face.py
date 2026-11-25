#!/usr/bin/env python3
"""Builds the intro's face layer from any short video of a face:  face.webm, face.mp4, face-track.json

Reverse-engineered from hancore.dev (see ../../hancore-study/STUDY.md):
  * glimpse.js loadFace() fetches face.webm (vp9) or face.mp4 + face-track.json
  * makeCodeFace(): each video frame is shrunk to one pixel per glyph cell; luminance picks which glyph level to draw
  * makeTracking(): face-track.json = {fps, frames:[ [ [x,y]|null  x34 ] ... ]}  (normalised 0..1 in the cropped video, null = point lost)
    drawn as polylines, boxes and "['blob0:u'] ..." labels (a computer-vision debug look)
  * The original's data matches Shi-Tomasi corners on frame 0 + Lucas-Kanade optical flow (30-34 of 34 points alive, median step ~0.003).

Usage (Python with opencv-python-headless + numpy; ffmpeg on PATH):
  python3 scripts/build-face.py --input me.mov --out . --crop 540x740+469+90 --start 3 [--key 0x3b5d2d]

  --crop WxH+X+Y   crop of the source in pixels; keep roughly 0.73 aspect (the original is 430x590)
  --start/--seconds  pick a calm 5 s window; the page loops it
  --key COLOUR     remove a green/blue-screen backdrop by hue (not colour distance, which eats dark skin) and put the person on black.
                   Without it the backdrop's brightness is painted as code too.
Output goes next to index.html:  face.webm  face.mp4  face-track.json
"""
import argparse, colorsys, json, os, subprocess, sys, tempfile, glob
import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--out", default=".")
ap.add_argument("--crop", default=None)
ap.add_argument("--start", type=float, default=0.0)
ap.add_argument("--seconds", type=float, default=5.0)
ap.add_argument("--fps", type=int, default=25)
ap.add_argument("--width", type=int, default=430)
ap.add_argument("--points", type=int, default=34)
ap.add_argument("--key", default=None, help="backdrop colour, e.g. 0x3b5d2d")
ap.add_argument("--key-hue", type=int, default=22, help="+/- hue tolerance (OpenCV 0-180 scale)")
ap.add_argument("--key-sat", type=int, default=45, help="min saturation (0-255) for a pixel to count as backdrop")
ap.add_argument("--gamma", type=float, default=0.6, help="<1 lifts shadows (the code-portrait draws brightness, so dark skin vanishes); 1 = off")
ap.add_argument("--clahe", type=float, default=3.0, help="local contrast boost on lightness; 0 = off")
ap.add_argument("--key-val", type=int, default=55, help="min brightness (0-255) for backdrop pixels; keeps dark hair/beard that picks up green light")
ap.add_argument("--source", default="")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

crop = ""
if a.crop:
    w, rest = a.crop.split("x"); h, x, y = rest.replace("+", " ").split()
    crop = f"crop={w}:{h}:{x}:{y},"
tmp = tempfile.mkdtemp(prefix="facebuild_")

# 1) decode the chosen window to PNGs at the target size/fps
subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(a.start), "-i", a.input, "-t", str(a.seconds), "-an",
                "-vf", f"{crop}fps={a.fps},scale={a.width}:-2:flags=lanczos", os.path.join(tmp, "%04d.png")], check=True)
paths = sorted(glob.glob(os.path.join(tmp, "*.png")))
if not paths: sys.exit("no frames decoded")

# 2) optional backdrop removal by hue, feathered, composited on black
if a.key:
    r, g, b = [int(a.key.replace("0x", "").replace("#", "")[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    hue0 = int(colorsys.rgb_to_hsv(r, g, b)[0] * 180)
    for p in paths:
        im = cv2.imread(p)
        hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.int16)
        dh = np.abs(hsv[:, :, 0] - hue0); dh = np.minimum(dh, 180 - dh)
        back = ((dh <= a.key_hue) & (hsv[:, :, 1] >= a.key_sat) & (hsv[:, :, 2] >= a.key_val)).astype(np.uint8) * 255
        back = cv2.morphologyEx(back, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))          # drop speckles inside the subject
        back = cv2.morphologyEx(back, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
        keep = 1.0 - cv2.GaussianBlur(back, (0, 0), 1.6).astype(np.float32) / 255.0       # feathered subject matte
        # neutralise green spill on the edge pixels so the rim doesn't glow
        spill = im.copy(); spill[:, :, 1] = np.minimum(spill[:, :, 1], np.maximum(spill[:, :, 0], spill[:, :, 2]))
        out = (spill.astype(np.float32) * keep[:, :, None]).clip(0, 255).astype(np.uint8)
        cv2.imwrite(p, out)

# 2b) tone: lift shadows / even out one-sided light so the face reads when drawn as glyph brightness
if a.gamma != 1 or a.clahe > 0:
    lut = (255 * (np.arange(256) / 255.0) ** a.gamma).astype(np.uint8)
    cl = cv2.createCLAHE(clipLimit=a.clahe, tileGridSize=(4, 4)) if a.clahe > 0 else None
    for p in paths:
        im = cv2.imread(p)
        lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB)
        L = lab[:, :, 0]
        subject = L > 6                                   # keep the black backdrop black
        if cl is not None: L2 = cl.apply(L)
        else: L2 = L
        lab[:, :, 0] = np.where(subject, cv2.LUT(L2, lut), 0)
        cv2.imwrite(p, cv2.cvtColor(lab, cv2.COLOR_LAB2BGR))

# 3) encode: vp9 webm (preferred when canPlayType says yes) + h264 mp4 fallback
src = ["-framerate", str(a.fps), "-i", os.path.join(tmp, "%04d.png")]
subprocess.run(["ffmpeg", "-y", "-v", "error", *src, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-pix_fmt", "yuv420p", os.path.join(a.out, "face.webm")], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", *src, "-c:v", "libx264", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", os.path.join(a.out, "face.mp4")], check=True)

# 4) track on exactly what the browser will see (the encoded mp4)
cap = cv2.VideoCapture(os.path.join(a.out, "face.mp4"))
frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY))
H, W = frames[0].shape
corners = cv2.goodFeaturesToTrack(frames[0], maxCorners=a.points, qualityLevel=0.005, minDistance=max(8, W // 22), blockSize=7)
if corners is None: sys.exit("no trackable corners: is the face visible/lit? try a different --start or --crop")
pts = corners.reshape(-1, 2).astype(np.float32)
rng = np.random.default_rng(1)
while len(pts) < a.points:                      # keep the JSON shape the page expects (34 slots)
    pts = np.vstack([pts, pts[len(pts) % len(pts)] + rng.normal(0, 6, 2).astype(np.float32)])
alive = np.ones(len(pts), bool)
lk = dict(winSize=(21, 21), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))

def pack(p, ok):
    return [[round(float(x) / W, 4), round(float(y) / H, 4)] if k else None for (x, y), k in zip(p, ok)]

track = [pack(pts, alive)]
for prev, cur in zip(frames, frames[1:]):
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev, cur, pts, None, **lk)
    back, st2, _ = cv2.calcOpticalFlowPyrLK(cur, prev, nxt, None, **lk)        # forward-backward check drops drifting points
    good = (st.ravel() == 1) & (st2.ravel() == 1) & (np.abs(back - pts).max(axis=1) < 3.0)
    inside = (nxt[:, 0] >= 0) & (nxt[:, 0] < W) & (nxt[:, 1] >= 0) & (nxt[:, 1] < H)
    alive &= good & inside
    pts = np.where(alive[:, None], nxt, pts)
    track.append(pack(pts, alive))

json.dump({"source": a.source, "fps": a.fps, "crop": a.crop or "none", "frames": track}, open(os.path.join(a.out, "face-track.json"), "w"), separators=(",", ":"))
n = [sum(p is not None for p in fr) for fr in track]
print(f"wrote face.webm face.mp4 face-track.json | {len(track)} frames @ {a.fps}fps, {W}x{H}, points alive {min(n)}..{max(n)} of {a.points}, "
      f"webm {os.path.getsize(os.path.join(a.out, 'face.webm')) // 1024} KB")
