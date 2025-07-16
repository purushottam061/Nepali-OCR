// --- Global Variables ---
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const recognizeBtn = document.getElementById("recognizeBtn");
const clearBtn = document.getElementById("clearBtn");
const predictionResult = document.getElementById("predictionResult");
const loadingOverlay = document.getElementById("loadingOverlay");

let model; // To store the loaded TensorFlow.js model
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Define your class names in the correct order (matching your model's output)
// This should match the sorted list of directory names in your dataset
const classNames = [
  "character_10_yna",
  "character_11_taamatar",
  "character_12_thaa",
  "character_13_daa",
  "character_14_dhaa",
  "character_15_adna",
  "character_16_tabala",
  "character_17_tha",
  "character_18_da",
  "character_19_dha",
  "character_1_ka",
  "character_20_na",
  "character_21_pa",
  "character_22_pha",
  "character_23_ba",
  "character_24_bha",
  "character_25_ma",
  "character_26_yaw",
  "character_27_ra",
  "character_28_la",
  "character_29_waw",
  "character_2_kha",
  "character_30_motosaw",
  "character_31_petchiryakha",
  "character_32_patalosaw",
  "character_33_ha",
  "character_34_chhya",
  "character_35_tra",
  "character_36_gya",
  "character_3_ga",
  "character_4_gha",
  "character_5_kna",
  "character_6_cha",
  "character_7_chha",
  "character_8_ja",
  "character_9_jha",
  "digit_0",
  "digit_1",
  "digit_2",
  "digit_3",
  "digit_4",
  "digit_5",
  "digit_6",
  "digit_7",
  "digit_8",
  "digit_9",
];

// --- Canvas Setup and Drawing Logic ---

// Function to set canvas dimensions dynamically
function setCanvasDimensions() {
  const parent = canvas.parentElement;
  // Set canvas resolution for drawing (e.g., 300x300 or larger for better drawing quality)
  // This is the internal resolution, not the display size.
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;

  // Drawing style
  ctx.lineWidth = Math.min(canvas.width, canvas.height) / 15; // Make brush size responsive
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000"; // Black ink
  ctx.fillStyle = "#FFF"; // White background
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill canvas with white background
}

// Draw function
function draw(e) {
  if (!isDrawing) return;

  // Get coordinates relative to the canvas
  const rect = canvas.getBoundingClientRect();
  let currentX, currentY;

  if (e.touches) {
    // Touch event
    currentX = e.touches[0].clientX - rect.left;
    currentY = e.touches[0].clientY - rect.top;
  } else {
    // Mouse event
    currentX = e.clientX - rect.left;
    currentY = e.clientY - rect.top;
  }

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();
  [lastX, lastY] = [currentX, currentY];
}

// Event Listeners for Drawing
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  [lastX, lastY] = [
    e.clientX - canvas.getBoundingClientRect().left,
    e.clientY - canvas.getBoundingClientRect().top,
  ];
  predictionResult.textContent = "Drawing...";
  predictionResult.classList.remove(
    "bg-green-100",
    "text-green-800",
    "bg-red-100",
    "text-red-800"
  );
  predictionResult.classList.add("bg-blue-100", "text-blue-800");
});
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", () => (isDrawing = false));
canvas.addEventListener("mouseout", () => (isDrawing = false)); // Stop drawing if mouse leaves canvas

// Touch events for mobile
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault(); // Prevent scrolling when drawing
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    [lastX, lastY] = [
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top,
    ];
    predictionResult.textContent = "Drawing...";
    predictionResult.classList.remove(
      "bg-green-100",
      "text-green-800",
      "bg-red-100",
      "text-red-800"
    );
    predictionResult.classList.add("bg-blue-100", "text-blue-800");
  },
  { passive: false }
); // Use passive: false to allow preventDefault
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", () => (isDrawing = false));
canvas.addEventListener("touchcancel", () => (isDrawing = false));

// --- Clear Canvas Function ---
function clearCanvas() {
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill with white
  predictionResult.textContent = "Draw a character!";
  predictionResult.classList.remove(
    "bg-green-100",
    "text-green-800",
    "bg-red-100",
    "text-red-800"
  );
  predictionResult.classList.add("bg-blue-100", "text-blue-800");
}
clearBtn.addEventListener("click", clearCanvas);

// --- Model Loading and Prediction ---

// Load the TensorFlow.js model
async function loadModel() {
  loadingOverlay.classList.remove("hidden"); // Show loading overlay
  try {
    // 'model/' is the path to the directory containing model.json
    model = await tf.loadGraphModel("./model/model.json");
    console.log("Model loaded successfully!");
    loadingOverlay.classList.add("hidden"); // Hide loading overlay
    predictionResult.textContent = "Model Ready! Draw a character.";
    predictionResult.classList.remove("bg-blue-100");
    predictionResult.classList.add("bg-green-100", "text-green-800");
    return model;
  } catch (error) {
    console.error("Error loading model:", error);
    loadingOverlay.classList.add("hidden");
    predictionResult.textContent = "Error loading model. Check console.";
    predictionResult.classList.remove("bg-blue-100");
    predictionResult.classList.add("bg-red-100", "text-red-800");
  }
}

// Preprocess image from canvas for model input
function preprocessImage(imageData) {
  return tf.tidy(() => {
    // 1. Convert to grayscale (already done by canvas setup, but ensure 1 channel)
    // 2. Resize to 32x32
    let tensor = tf.browser
      .fromPixels(imageData, 1) // 1 for grayscale
      .resizeNearestNeighbor([32, 32])
      .toFloat();

    // 3. Invert colors if necessary (model was trained on black characters on white background)
    // Check if the majority of pixels are black (0) or white (255)
    // If the background is dark (average pixel value is low), assume it's inverted and invert it back
    // This is a heuristic, adjust if your model expects white on black.
    // Your training data was black characters on white background (0-255, 0=black, 255=white)
    // So, we want white background (high pixel value) and black character (low pixel value)
    // Canvas default is black stroke on white background, so it should be fine.
    // If your model was trained on white characters on black background, you'd invert here.
    // For this dataset, images are black characters on white background, so no inversion needed.

    // 4. Normalize to [0, 1] (already done by .toFloat() and division by 255 implicitly)
    tensor = tensor.div(255.0);

    // 5. Add batch dimension (1, 32, 32, 1)
    return tensor.expandDims(0);
  });
}

// Make prediction
async function predictCharacter() {
  if (!model) {
    predictionResult.textContent = "Model not loaded yet!";
    predictionResult.classList.remove("bg-blue-100");
    predictionResult.classList.add("bg-red-100", "text-red-800");
    return;
  }

  // Get image data from canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Preprocess the image
  const processedImage = preprocessImage(imageData);

  // Make prediction
  try {
    predictionResult.textContent = "Predicting...";
    predictionResult.classList.remove(
      "bg-green-100",
      "text-green-800",
      "bg-red-100",
      "text-red-800"
    );
    predictionResult.classList.add("bg-blue-100", "text-blue-800");

    const predictions = await model.predict(processedImage).data();
    const predictedClassIndex = predictions.indexOf(Math.max(...predictions));
    const predictedCharacter = classNames[predictedClassIndex];
    const confidence = predictions[predictedClassIndex] * 100;

    predictionResult.textContent = `Predicted: ${predictedCharacter
      .replace("character_", "")
      .replace("digit_", "")
      .replace("_", " ")} (${confidence.toFixed(2)}%)`;
    predictionResult.classList.remove("bg-blue-100", "text-blue-800");
    predictionResult.classList.add("bg-green-100", "text-green-800");

    // Clean up TensorFlow.js tensors
    processedImage.dispose();
    tf.dispose(predictions); // This disposes the underlying tensor data
  } catch (error) {
    console.error("Error during prediction:", error);
    predictionResult.textContent = "Prediction error. See console.";
    predictionResult.classList.remove("bg-blue-100");
    predictionResult.classList.add("bg-red-100", "text-red-800");
  }
}
recognizeBtn.addEventListener("click", predictCharacter);

// --- Initialize on Page Load ---
window.onload = () => {
  setCanvasDimensions(); // Set initial canvas size
  clearCanvas(); // Clear canvas to white
  loadModel(); // Start loading the model
};

// Adjust canvas size on window resize
window.addEventListener("resize", () => {
  setCanvasDimensions();
  clearCanvas(); // Clear canvas after resize to avoid distortion
});
