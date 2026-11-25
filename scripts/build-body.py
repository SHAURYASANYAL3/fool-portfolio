#!/usr/bin/env python3
"""Builds the intro's figure layer from ONE full-body photo:  face.webm, face.mp4, face-track.json  (same file names the page already loads).

Why a still can stand in for the original's face video (see ../../hancore-study/STUDY.md):
  * glimpse.js only needs a looping clip (luminance becomes glyph brightness) plus frames of normalised landmarks to draw the wireframe.
  * Here the clip is made from the photo: person cut-out -> low-key grade with a rim light -> a 5 s seamless breathing/sway loop.
  * The 34 landmark slots are MediaPipe BlazePose's 33 body landmarks + hip-centre, moved with exactly the same motion, so the overlay follows the real pose.

Needs: opencv-python-headless numpy mediapipe==0.10.14 (bundled models, no downloads) and ffmpeg on PATH.
  python3 scripts/build-body.py --input photo.jpg --box 909,1500,2181,3999 --out .
  --box x0,y0,x1,y1  rough pixel box around the person in the source photo (pose + cut-out run inside it)
"""
import argparse, json, os, subprocess, sys, tempfile
import cv2, numpy as np
import mediapipe as mp

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--box", required=True, help="x0,y0,x1,y1 pixels around the person")
ap.add_argument("--out", default=".")
ap.add_argument("--width", type=int, default=360)
ap.add_argument("--height", type=int, default=800)
ap.add_argument("--fps", type=int, default=25)
ap.add_argument("--seconds", type=float, default=5.0)
ap.add_argument("--light", default="left", choices=["left", "right"], help="side the key/rim light comes from")
ap.add_argument("--rim", type=float, default=0.9, help="rim-light strength (keeps dark clothes readable)")
ap.add_argument("--contrast", type=float, default=1.45, help="gamma on the lit image; >1 crushes shadows (low-key)")
ap.add_argument("--source", default="own photo")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

# ---------- 1) crop the person and work at a fixed height ----------
im = cv2.imread(a.input)
if im is None: sys.exit("cannot read image")
x0, y0, x1, y1 = [int(v) for v in a.box.split(",")]
crop = im[y0:y1, x0:x1]
WH = 1400
work = cv2.resize(crop, (crop.shape[1] * WH // crop.shape[0], WH), interpolation=cv2.INTER_AREA)
h, w = work.shape[:2]

# ---------- 2) pose landmarks + soft silhouette ----------
pose = mp.solutions.pose.Pose(static_image_mode=True, model_complexity=1, enable_segmentation=True, min_detection_confidence=0.3)
res = pose.process(cv2.cvtColor(work, cv2.COLOR_BGR2RGB))
if res.pose_landmarks is None or res.segmentation_mask is None: sys.exit("no person found inside --box; widen it")
mask = cv2.resize(res.segmentation_mask, (w, h))
lms = [(l.x * w, l.y * h, l.visibility) for l in res.pose_landmarks.landmark]

# ---------- 3) refine the silhouette with GrabCut seeded by the mask (crisper hair / jacket edges) ----------
gc = np.full((h, w), cv2.GC_BGD, np.uint8)
gc[mask > 0.15] = cv2.GC_PR_BGD
gc[mask > 0.45] = cv2.GC_PR_FGD
gc[cv2.erode((mask > 0.9).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0] = cv2.GC_FGD
bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(work, gc, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
alpha = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
# keep the largest connected blob, fill pinholes, then blend with the soft model mask so edges stay natural
n, lab, st, _ = cv2.connectedComponentsWithStats((alpha > 0.5).astype(np.uint8))
if n > 1: alpha = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.float32)
alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
alpha = np.clip(0.65 * cv2.GaussianBlur(alpha, (0, 0), 2.2) + 0.35 * np.clip((mask - 0.2) / 0.6, 0, 1) * (cv2.dilate(alpha, np.ones((15, 15), np.uint8))), 0, 1)

# ---------- 4) tight crop around the matte, fitted to the output aspect ----------
ys, xs = np.where(alpha > 0.5)
bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
ow, oh = a.width, a.height
pad_y = 0.05 * (by1 - by0)
fh = (by1 - by0) + 2 * pad_y
fw = fh * ow / oh
cx = (bx0 + bx1) / 2
if fw < (bx1 - bx0) * 1.12: fw = (bx1 - bx0) * 1.12; fh = fw * oh / ow          # widen if the pose is wide
ox, oy = cx - fw / 2, by0 - pad_y
S = ow / fw
M0 = np.array([[S, 0, -ox * S], [0, S, -oy * S]], np.float32)
def to_out(img, interp=cv2.INTER_AREA):
    return cv2.warpAffine(img, M0, (ow, oh), flags=interp, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
gray = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(6, 12)).apply((gray * 255).astype(np.uint8)).astype(np.float32) / 255   # pull out face/shirt detail
g_o, a_o = to_out(gray), to_out(alpha)
pts = np.array([[x * S - ox * S, y * S - oy * S, v] for x, y, v in lms], np.float32)
pts = np.vstack([pts, [(pts[23, 0] + pts[24, 0]) / 2, (pts[23, 1] + pts[24, 1]) / 2, min(pts[23, 2], pts[24, 2])]])   # slot 34 = hip centre

# ---------- 5) low-key grade: directional key light, crushed shadows, rim light on the silhouette ----------
yy, xx = np.mgrid[0:oh, 0:ow].astype(np.float32)
xn, yn = xx / ow, yy / oh
side = (1 - xn) if a.light == "left" else xn
key = np.clip(0.18 + 1.0 * side ** 1.2, 0, 1.2) * (1.05 - 0.4 * yn)                # light falls off away from its side and toward the feet
lit = np.clip(g_o * 1.15, 0, 1) ** a.contrast * key
lit = np.clip((lit - 0.04) / 0.80, 0, 1)
inner = np.clip(a_o - cv2.GaussianBlur(a_o, (0, 0), 5.0), 0, 1)                       # band just inside the edge
inner = inner / max(inner.max(), 1e-3)
rim_dir = (0.25 + 0.75 * side ** 1.5)
face_boost = np.exp(-(((xn - pts[0, 0] / ow) ** 2) / 0.012 + ((yn - pts[0, 1] / oh) ** 2) / 0.004))   # extra light on the head (landmark 0 = nose)
base = np.clip(lit + 0.35 * face_boost * np.clip(g_o, 0, 1), 0, 1) * a_o
base = np.maximum(base, a.rim * inner * rim_dir)
base = np.clip(base, 0, 1)

# ---------- 6) seamless 5 s loop: breathing scale + sway, rim shimmer; landmarks ride the same transform ----------
N = int(round(a.seconds * a.fps))
tmp = tempfile.mkdtemp(prefix="bodybuild_")
foot = np.array([ow / 2, oh * 0.98], np.float32)
track = []
for i in range(N):
    t = i / N
    s = 1 + 0.006 * np.sin(2 * np.pi * t)                      # breathing
    dx = 2.6 * np.sin(2 * np.pi * t + 0.6)                     # weight shift
    dy = 0.0
    M = np.array([[s, 0, foot[0] - s * foot[0] + dx], [0, s, foot[1] - s * foot[1] + dy]], np.float32)
    frame = cv2.warpAffine(base, M, (ow, oh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    shimmer = 1 + 0.07 * np.sin(2 * np.pi * 2 * t)
    rim_f = cv2.warpAffine(a.rim * inner * rim_dir, M, (ow, oh), flags=cv2.INTER_LINEAR)
    frame = np.clip(np.maximum(frame, 0) + 0.12 * (shimmer - 1) * rim_f, 0, 1)
    cv2.imwrite(os.path.join(tmp, f"{i + 1:04d}.png"), (frame * 255).astype(np.uint8))
    p = pts[:, :2] @ M[:, :2].T + M[:, 2]
    track.append([[round(float(x / ow), 4), round(float(y / oh), 4)] if v > 0.5 and 0 <= x < ow and 0 <= y < oh else None for (x, y), v in zip(p, pts[:, 2])])

src = ["-framerate", str(a.fps), "-i", os.path.join(tmp, "%04d.png")]
subprocess.run(["ffmpeg", "-y", "-v", "error", *src, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-pix_fmt", "yuv420p", os.path.join(a.out, "face.webm")], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", *src, "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", os.path.join(a.out, "face.mp4")], check=True)

# extra keys are read by glimpse.js (see "figure mode"): block aspect, oval-mask scale, glyph size
meta = {"mode": "body", "aspect": round(ow / oh, 4), "mask": 1.35, "fontPx": 4.0}
json.dump({"source": a.source, "fps": a.fps, "crop": f"{a.box}", **meta, "frames": track}, open(os.path.join(a.out, "face-track.json"), "w"), separators=(",", ":"))
alive = [sum(p is not None for p in fr) for fr in track]
print(f"wrote face.webm face.mp4 face-track.json | {N} frames {ow}x{oh} @ {a.fps}fps | landmarks alive {min(alive)}..{max(alive)} of 34 | webm {os.path.getsize(os.path.join(a.out,'face.webm'))//1024} KB")
cv2.imwrite(os.path.join(a.out, "_preview_body.png"), np.hstack([(base * 255).astype(np.uint8), (a_o * 255).astype(np.uint8)]))
