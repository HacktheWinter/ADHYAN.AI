"""
FaceNet Microservice for Adhyan.ai
Extracts 512-dim face embeddings using InceptionResnetV1 (FaceNet/VGGFace2).
Face detection via MTCNN.
Runs as a FastAPI server on port 8001.

Endpoints:
  GET  /health             - Service health check
  POST /extract-embedding  - Extract embedding from uploaded image file
  POST /api/embed          - Extract embedding from uploaded image file OR base64 JSON
"""

import io
import base64
import logging
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import torch

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("facenet_service")

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Adhyan FaceNet Service", version="2.0.0")

# ── CORS (allow Node backend to call this service) ───────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Device ───────────────────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info("Using device: %s", device)

# ── Models (loaded once at module level) ─────────────────────────────────────
mtcnn = None
facenet = None

EMBEDDING_DIM = 512  # InceptionResnetV1 produces 512-dim embeddings


@app.on_event("startup")
async def load_models():
    """Pre-load MTCNN (face detection) and FaceNet (embeddings) on startup."""
    global mtcnn, facenet
    logger.info("Loading MTCNN face detector...")
    mtcnn = MTCNN(
        image_size=160,
        margin=20,
        keep_all=True,          # detect ALL faces so we can enforce single-face
        device=device,
        post_process=True,      # normalise pixel values
    )

    logger.info("Loading InceptionResnetV1 (vggface2) for embeddings...")
    facenet = InceptionResnetV1(pretrained="vggface2").eval().to(device)

    logger.info("FaceNet models loaded successfully! (512-dim embeddings)")


# ── Helpers ──────────────────────────────────────────────────────────────────
def _read_image(file_bytes: bytes) -> Image.Image:
    """Convert raw file bytes to a PIL RGB image."""
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")


def _extract_single_embedding(pil_image: Image.Image) -> list:
    """
    Detect exactly one face in pil_image and return its 512-dim embedding.
    Raises HTTPException on failure.
    """
    if mtcnn is None or facenet is None:
        raise HTTPException(status_code=503, detail="Models are still loading. Try again shortly.")

    # Detect faces → returns tensor of shape (N, 3, 160, 160) or None
    faces, probs = mtcnn(pil_image, return_prob=True)

    if faces is None or len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected in the image.")

    if len(faces) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"Expected exactly 1 face but found {len(faces)}. Use an image with a single face.",
        )

    # Extract embedding (512-dim)
    face_tensor = faces[0].unsqueeze(0).to(device)  # (1, 3, 160, 160)
    with torch.no_grad():
        embedding = facenet(face_tensor).cpu().numpy().flatten().tolist()

    return embedding


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    ready = mtcnn is not None and facenet is not None
    return {
        "status": "ok" if ready else "loading",
        "model": "FaceNet-VGGFace2",
        "dimensions": EMBEDDING_DIM,
    }


@app.post("/extract-embedding")
async def extract_embedding(image: UploadFile = File(...)):
    """
    Accept a single face image as a file upload, detect exactly one face,
    and return its 512-dim embedding.
    """
    try:
        file_bytes = await image.read()
        pil_image = _read_image(file_bytes)
        embedding = _extract_single_embedding(pil_image)

        return JSONResponse(content={
            "success": True,
            "embedding": embedding,
            "face_count": 1,
            "dimensions": len(embedding),
        })

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error extracting embedding")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(exc)}")


@app.post("/api/embed")
async def api_embed(request: Request, image: UploadFile = File(None)):
    """
    Flexible embedding endpoint.
    
    Accepts EITHER:
      - A file upload (multipart/form-data with 'image' field)
      - A JSON body with { "image": "<base64-encoded-image>" }
    
    Returns the 512-dim embedding.
    """
    try:
        file_bytes = None

        # Option 1: File upload (multipart)
        if image is not None:
            file_bytes = await image.read()
        else:
            # Option 2: JSON body with base64 image
            try:
                body = await request.json()
                base64_str = body.get("image", "")
                if not base64_str:
                    raise HTTPException(
                        status_code=400,
                        detail="No image provided. Send a file upload or JSON with 'image' as base64.",
                    )

                # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
                if "," in base64_str:
                    base64_str = base64_str.split(",", 1)[1]

                file_bytes = base64.b64decode(base64_str)
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid request. Send multipart file or JSON with base64 'image'.",
                )

        if not file_bytes:
            raise HTTPException(status_code=400, detail="No image data received.")

        pil_image = _read_image(file_bytes)
        embedding = _extract_single_embedding(pil_image)

        return JSONResponse(content={
            "success": True,
            "embedding": embedding,
            "face_count": 1,
            "dimensions": len(embedding),
        })

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /api/embed")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(exc)}")


# ── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
