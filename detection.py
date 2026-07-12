"""
Standalone copy of run_tracking() / inventory_count() from model.py, with a
progress_callback hook added so the Streamlit UI can show live progress.
 
Logic is otherwise identical to model.py — kept as a separate file only
because importing model.py directly currently crashes (see README).
"""
 
from collections import defaultdict
from ultralytics import YOLO
 
 
def run_tracking(video_path: str, weights_path: str = "final_best.pt",
                  conf: float = 0.75, progress_callback=None):
    """
    Runs YOLO + ByteTrack over a video and returns {class_name: set(track_ids)}.
    progress_callback(frame_index) is called after every processed frame, if given.
    """
    model = YOLO(weights_path)
    unique_objects = defaultdict(set)
 
    results = model.track(
        source=video_path,
        tracker="bytetrack.yaml",
        persist=True,
        stream=True,
        save=False,
        conf=conf,
    )
 
    frame_idx = 0
    for result in results:
        frame_idx += 1
        if progress_callback:
            progress_callback(frame_idx)
 
        if result.boxes.id is None:
            continue
        ids = result.boxes.id.cpu().numpy().astype(int)
        classes = result.boxes.cls.cpu().numpy().astype(int)
        for obj_id, cls in zip(ids, classes):
            unique_objects[model.names[cls]].add(obj_id)
 
    return unique_objects
 
 
def inventory_count(unique_objects: dict) -> dict:
    grand_total = 0
    inventory = {}
    for cls_name, ids in unique_objects.items():
        inventory[cls_name] = len(ids)
        grand_total += len(ids)
    inventory["grand_total"] = grand_total
    return inventory
 
 
def get_video_frame_count(video_path: str) -> int:
    """Best-effort total frame count, used only to drive the progress bar."""
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        return total if total > 0 else 0
    except Exception:
        return 0
 