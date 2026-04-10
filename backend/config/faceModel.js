// DeepFace service health check (replaces old face-api model loading)
const DEEPFACE_URL = process.env.DEEPFACE_URL || "http://localhost:8001";

export const loadModels = async () => {
  try {
    console.log("Checking FaceNet service at:", DEEPFACE_URL);
    const response = await fetch(`${DEEPFACE_URL}/health`);
    if (!response.ok)
      throw new Error(`FaceNet service returned ${response.status}`);
    const data = await response.json();
    console.log(
      `FaceNet service is ready! Model: ${data.model}, Dimensions: ${data.dimensions}`,
    );
  } catch (err) {
    console.warn(
      "FaceNet service is not running yet. Face recognition will fail until it starts.",
    );
    console.warn(
      "  Start it with: cd backend/deepface_service && py deepface_service.py",
    );
  }
};

/**
 * Send an image buffer to DeepFace and get back a 512-dim embedding.
 * @param {Buffer} imageBuffer - raw image bytes (jpeg/png)
 * @returns {Promise<number[]>} - 512-dimensional face embedding
 */
export const extractEmbedding = async (imageBuffer) => {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: "image/jpeg" });
  formData.append("image", blob, "face.jpg");

  const response = await fetch(`${DEEPFACE_URL}/extract-embedding`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg =
      data.detail || data.error || "DeepFace embedding extraction failed";
    const error = new Error(errorMsg);
    error.statusCode = response.status;
    throw error;
  }

  return data.embedding;
};
