// --- Global Variables ---
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const recognizeBtn = document.getElementById("recognizeBtn");
const clearBtn = document.getElementById("clearBtn");
const predictionResult = document.getElementById("predictionResult");
const loadingOverlay = document.getElementById("loadingOverlay");

// New: Preprocessed image preview canvas
const previewCanvas = document.getElementById("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");

let model; // To store the loaded TensorFlow.js model
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Define your class names in the correct order (matching your model's output)
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

function setCanvasDimensions() {
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;

  ctx.lineWidth = Math.min(canvas.width, canvas.height) / 15;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#FFF"; // white ink
  ctx.fillStyle = "#000"; // black background
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill canvas with white background

  // Clear preview canvas too
  previewCtx.fillStyle = "#000";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
}

function draw(e) {
  if (!isDrawing) return;

  const rect = canvas.getBoundingClientRect();
  let currentX, currentY;

  if (e.touches) {
    currentX = e.touches[0].clientX - rect.left;
    currentY = e.touches[0].clientY - rect.top;
  } else {
    currentX = e.clientX - rect.left;
    currentY = e.clientY - rect.top;
  }

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();
  [lastX, lastY] = [currentX, currentY];
}

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
canvas.addEventListener("mouseout", () => (isDrawing = false));

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
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
);
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", () => (isDrawing = false));
canvas.addEventListener("touchcancel", () => (isDrawing = false));

// --- Clear Canvas Function ---
function clearCanvas() {
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  predictionResult.textContent = "Draw a character!";
  predictionResult.classList.remove(
    "bg-green-100",
    "text-green-800",
    "bg-red-100",
    "text-red-800"
  );
  predictionResult.classList.add("bg-blue-100", "text-blue-800");
  // Clear preview canvas as well
  previewCtx.fillStyle = "#000";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
}
clearBtn.addEventListener("click", clearCanvas);

// --- Model Loading and Prediction ---

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

// Enhanced Preprocessing: Find bounding box, crop, resize, pad, normalize
function preprocessImage(sourceCanvas) {
  return tf.tidy(() => {
    const imageData = sourceCanvas
      .getContext("2d")
      .getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data; // RGBA pixel data

    // 1. Find bounding box of non-white pixels
    let minX = sourceCanvas.width,
      maxX = 0,
      minY = sourceCanvas.height,
      maxY = 0;
    let foundInk = false;

    for (let y = 0; y < sourceCanvas.height; y++) {
      for (let x = 0; x < sourceCanvas.width; x++) {
        // Check if pixel is not white (assuming black ink on white background)
        // We check the red channel, assuming R=G=B for grayscale/black ink
        const alpha = data[(y * sourceCanvas.width + x) * 4 + 3]; // Alpha channel
        const red = data[(y * sourceCanvas.width + x) * 4]; // Red channel

        // Consider it "ink" if it's not fully transparent AND not white
        // A pixel is "ink" if its red channel is significantly less than 255 (white)
        // and its alpha is not 0.
        if (alpha > 0 && red < 250) {
          // Using 250 as a threshold for "not white"
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          foundInk = true;
        }
      }
    }

    if (!foundInk) {
      console.warn("No ink detected on canvas.");
      // Return an empty/white tensor if no ink is found
      return tf.zeros([1, 32, 32, 1]);
    }

    // Add a small margin around the bounding box to ensure character isn't cut off
    const margin = 5; // Pixels
    minX = Math.max(0, minX - margin);
    maxX = Math.min(sourceCanvas.width - 1, maxX + margin);
    minY = Math.max(0, minY - margin);
    maxY = Math.min(sourceCanvas.height - 1, maxY + margin);

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Create a temporary canvas to draw the cropped character
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCtx.drawImage(
      sourceCanvas,
      minX,
      minY,
      width,
      height,
      0,
      0,
      width,
      height
    );

    // Get image data from the temporary cropped canvas
    const croppedImageData = tempCtx.getImageData(0, 0, width, height);

    // Convert to TensorFlow tensor, grayscale (1 channel), and resize to 32x32
    let tensor = tf.browser
      .fromPixels(croppedImageData, 1) // 1 for grayscale
      .resizeNearestNeighbor([32, 32])
      .toFloat();

    // Invert if necessary (dataset is black on white, so lower pixel values are character)
    // If the average pixel value is high after resize (mostly white), it's good.
    // If it's low (mostly black), it means the character might be white on black, so invert.
    // For this specific dataset, we want black characters (low values) on white background (high values).
    // The `fromPixels` will give 0-255. We want 0 for black, 255 for white.
    // If your drawing is white on black, you'd do: tensor = tf.sub(255.0, tensor);
    // Based on your canvas setup, it should be black on white, so no inversion needed here.

    // Normalize to [0, 1]
    tensor = tensor.div(255.0);

    // Add batch dimension (1, 32, 32, 1)
    const finalTensor = tensor.expandDims(0);

    // --- Display preprocessed image on previewCanvas ---
    // Convert the 32x32 grayscale tensor back to an image for display
    const previewImageTensor = tensor.mul(255).cast("int32"); // Scale back to 0-255
    tf.browser.toPixels(previewImageTensor, previewCanvas);

    return finalTensor;
  });
}

async function predictCharacter() {
  if (!model) {
    predictionResult.textContent = "Model not loaded yet!";
    predictionResult.classList.remove("bg-blue-100");
    predictionResult.classList.add("bg-red-100", "text-red-800");
    return;
  }

  // Preprocess the image from the main drawing canvas
  const processedImage = preprocessImage(canvas);

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
    // No need to dispose 'predictions' directly as .data() copies it to JS array.
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
  setCanvasDimensions();
  clearCanvas();
  loadModel();
};

// Adjust canvas size on window resize
window.addEventListener("resize", () => {
  setCanvasDimensions();
  clearCanvas();
});
