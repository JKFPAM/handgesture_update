// Get HTML elements and create global variables
const videoElement = document.createElement('video');
videoElement.style.display = "none"; // Hide video element for the camera
document.body.appendChild(videoElement);

// Access the video element from the HTML
const videoOverlay = document.getElementById('videoOverlay');
// videoOverlay.src = 'Denk_Interactive_Animation-HD.mp4';  // Ensure correct video path
videoOverlay.pause();  // Pause the video initially
videoOverlay.loop = false;  // Disable built-in loop (we'll manually handle looping)

// Variable to track if the video has started
let videoStarted = false;

// Timer variables to track palm staying in the circle
let palmInsideStartTime = null;  // Time when the palm entered the circle
const palmInsideDelay = 2000;    // 2 seconds (2000 ms) delay before starting video

// Create the foreground and background canvases
const backgroundCanvas = document.createElement('canvas');
backgroundCanvas.style.position = 'absolute';
backgroundCanvas.style.top = '0';
backgroundCanvas.style.left = '0';
backgroundCanvas.style.zIndex = '0'; // Background canvas for metaball effect
document.body.appendChild(backgroundCanvas);
const backgroundCtx = backgroundCanvas.getContext('2d');
backgroundCanvas.color = 'white';

const canvasElement = document.createElement('canvas');
canvasElement.style.position = 'absolute';
canvasElement.style.top = '0';
canvasElement.style.left = '0';
canvasElement.style.zIndex = '1'; // Foreground canvas for hand skeleton, lines, and text
document.body.appendChild(canvasElement);
const canvasCtx = canvasElement.getContext('2d');






// Circle properties
const circle = {
    x: window.innerWidth / 2,  // Center x
    y: window.innerHeight / 2, // Center y
    radius: 100,               // Radius of the circle
};

function drawCircle(ctx, circle) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.lineWidth = 0.0001;
    ctx.stroke();
}

const MAX_PARTICLES = 50; // Limite de 50 particules maximum
const SHRINK_RATE = 0.75; // Réduire la taille des particules plus rapidement

// Particle system array
let particles = []; // To store particles

function isHandClosed(landmarks) {
    const palm = landmarks[9]; // Palm center
    const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]]; // Fingertips

    // Calculate the distance between each fingertip and the palm
    for (let tip of tips) {
        const distance = Math.sqrt(Math.pow(tip.x - palm.x, 2) + Math.pow(tip.y - palm.y, 2));
        if (distance > closeThreshold) {
            return false; // If any fingertip is far from the palm, the hand is not closed
        }
    }
    return true; // All fingertips are close to the palm, hand is closed
}

// Function to check if the palm is inside the circle
function isPalmInCircle(palm) {
    const palmX = palm.x * canvasElement.width;
    const palmY = palm.y * canvasElement.height;

    const distance = Math.sqrt(Math.pow(palmX - circle.x, 2) + Math.pow(palmY - circle.y, 2));
    return distance <= circle.radius;
}

let leftPalmInsideStartTime = null;
let rightPalmInsideStartTime = null;

function checkAndStartVideo(palm, isLeftHand) {
    if (isPalmInCircle(palm)) {
        if (isLeftHand) {
            // Left hand inside the circle, start or maintain the timer
            if (!leftPalmInsideStartTime) leftPalmInsideStartTime = Date.now();
        } else {
            // Right hand inside the circle, start or maintain the timer
            if (!rightPalmInsideStartTime) rightPalmInsideStartTime = Date.now();
        }

        // Check if either hand has been inside the circle for the required delay
        const leftHandMetDelay = leftPalmInsideStartTime && (Date.now() - leftPalmInsideStartTime >= palmInsideDelay);
        const rightHandMetDelay = rightPalmInsideStartTime && (Date.now() - rightPalmInsideStartTime >= palmInsideDelay);

        if ((leftHandMetDelay || rightHandMetDelay) && !videoStarted) {
            videoOverlay.play();
            videoStarted = true;
            circle.color = 'green';  // Indicate that a hand has triggered the video start
        }
    } else {
        // Reset the timer for the hand that is outside the circle
        if (isLeftHand) leftPalmInsideStartTime = null;
        else rightPalmInsideStartTime = null;

        // If both hands are outside, set the circle color back to red
        if (!leftPalmInsideStartTime && !rightPalmInsideStartTime) circle.color = 'red';
    }
}


// Function to resize canvases and adjust video size
function resizeCanvases() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    backgroundCanvas.width = width;
    backgroundCanvas.height = height;
    canvasElement.width = width;
    canvasElement.height = height;

    // Update the circle position in case of resize
    circle.x = width / 2;
    circle.y = height / 2;
}

// Call resize function on page load
resizeCanvases();
window.addEventListener('resize', resizeCanvases);

// Arrays for left and right hands
const baseLeftTexts = ["Protein", "Omega-3", "Antioxidants", "Fiber", "Vitamin D", "Magnesium"];
const baseRightTexts = ["Protein", "Omega-3", "Antioxidants", "Fiber", "Vitamin D", "Magnesium"];
let leftTexts = [...baseLeftTexts]; // Text for left fingers
let rightTexts = [...baseRightTexts];


let leftFingers = [null, null, null, null, null, null]; // Stores landmarks for each finger + wrist
let rightFingers = [null, null, null, null, null, null]; // Stores landmarks for each finger + wrist (right hand)
// let leftTexts = ["Protein", "Omega-3", "Antioxidants", "Fiber", "Vitamin D", "Magnesium"]; // Text for left fingers
// let rightTexts = ["Protein", "Omega-3", "Antioxidants", "Fiber", "Vitamin D", "Magnesium"]; // Text for right fingers
let leftLineLength = [0, 0, 0, 0, 0, 0]; // Line length for animation (left hand)
let rightLineLength = [0, 0, 0, 0, 0, 0]; // Line length for animation (right hand)
let leftDelayCounter = [0, 0, 0, 0, 0, 0]; // Delay before line starts growing (left hand)
let rightDelayCounter = [0, 0, 0, 0, 0, 0]; // Delay before line starts growing (right hand)

// Variables to control text and line visibility
let leftHandVisible = false;
let rightHandVisible = false;
const animationSpeed = 0.05; // Speed at which the line grows and shrinks
const delayThreshold = 30; // Number of frames to wait before line starts growing
const closeThreshold = 0.1; // Threshold for detecting closed hand
let leftHandWasVisible = false;
let rightHandWasVisible = false;

function updateTextsWithPercentage() {
    leftTexts = baseLeftTexts.map(text => `${text} ${Math.floor(Math.random() * 100)}%`);
    rightTexts = baseRightTexts.map(text => `${text} ${Math.floor(Math.random() * 100)}%`);
}


let leftHandFlickerStart = null;
let rightHandFlickerStart = null;
const flickerDuration = 1500; // Flicker for 1.5 seconds

function startFlicker(hand) {
    // Start flickering for left or right hand
    if (hand === "left") leftHandFlickerStart = Date.now();
    if (hand === "right") rightHandFlickerStart = Date.now();
}

function shouldFlicker(hand) {
    // Determine if we are still in the flicker period
    const now = Date.now();
    if (hand === "left" && leftHandFlickerStart) {
        return now - leftHandFlickerStart < flickerDuration;
    }
    if (hand === "right" && rightHandFlickerStart) {
        return now - rightHandFlickerStart < flickerDuration;
    }
    return false;
}
// Particle class with larger size for optimization
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius =  150; // Taille initiale réduite
        this.speedX = Math.random() * 0.1 - 0.05;
        this.speedY = Math.random() * 0.1 - 0.05;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.radius *= SHRINK_RATE; // Réduire la taille plus rapidement
    }
}

// Function to create particles at the center of the hand (landmark 9)
function createParticles(x, y) {
    if (videoOverlay.paused && particles.length < MAX_PARTICLES) {
        particles.push(new Particle(x, y));
    }
}

// Function to update particles
function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();

        // Remove particles that are too small
        if (particles[i].radius <= 20) {
            particles.splice(i, 1);
            i--;
        }
    }
}

// Function to render particles as metaballs on the background canvas
function renderMetaballs() {
    const imageData = backgroundCtx.createImageData(backgroundCanvas.width, backgroundCanvas.height);
    const data = imageData.data;

    // Loop over each pixel
    for (let y = 0; y < backgroundCanvas.height; y++) {
        for (let x = 0; x < backgroundCanvas.width; x++) {
            let influenceSum = 0;

            // Sum the influence of each particle at this pixel
            for (const particle of particles) {
                const dx = x - particle.x;
                const dy = y - particle.y;
                const distanceSquared = dx * dx + dy * dy;
                influenceSum += particle.radius * particle.radius / distanceSquared;
            }

            const index = (y * backgroundCanvas.width + x) * 4;
            if (influenceSum > 2.5) {
                const intensity = Math.min(255, influenceSum * 100);
                data[index] = 204;      // Red
                data[index + 1] = 255;  // Green
                data[index + 2] = 0;    // Blue
                data[index + 3] = intensity; // Alpha for transparency
            }
        }
    }

    // Put the image data onto the background canvas
    backgroundCtx.putImageData(imageData, 0, 0);
}

// Function to draw text at finger landmarks
function drawTextAtLandmark(ctx, text, landmark, offsetX, offsetY) {
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;

    // Draw the text at the given offset from the landmark
    ctx.font = "20px Arial";
    ctx.fillStyle = "#000000"; // Text color
    ctx.fillText(text, x + offsetX, y + offsetY);
}

// Event listener to reset video when it ends
videoOverlay.addEventListener('ended', function() {
    videoOverlay.pause(); // Pause the video
    videoOverlay.currentTime = 0; // Reset to the first frame
    videoStarted = false; // Reset flag so video can restart
});

// Function to handle results from hand detection
function onResults(results) {
    // Clear both canvases before drawing
    backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Detect hands and update hand skeleton and line animations
    if (results.multiHandLandmarks && results.multiHandedness) {
        leftHandVisible = false;
        rightHandVisible = false;

        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];

            const palm = landmarks[9]; // Use palm center (landmark 9) instead of wrist
            const fingerIndexes = [4, 8, 12, 16, 20, 0]; // Thumb, index, middle, ring, pinky, wrist

            checkAndStartVideo(palm, !isRightHand);


            if (!isRightHand) {
                leftHandVisible = true;

                // If the left hand reappears, start flickering
                if (!leftHandWasVisible) {
                    startFlicker("left");
                }

                // Flicker the percentages during the flicker period, then stop
                if (shouldFlicker("left")) {
                    updateTextsWithPercentage();
                }

                // Check if the palm is inside the circle
                if (isPalmInCircle(palm)) {
                    if (!palmInsideStartTime) {
                        palmInsideStartTime = Date.now(); // Start the timer when the palm enters the circle
                    } else if (Date.now() - palmInsideStartTime >= palmInsideDelay) {
                        circle.color = 'green';  // Change to green if palm is inside for 2 seconds
                        if (!videoStarted) {
                            videoOverlay.play();
                            videoStarted = true;  // Ensure video only starts once
                        }
                    }
                } else {
                    circle.color = 'red';    // Change to red if palm is outside
                    palmInsideStartTime = null;  // Reset the timer if the palm leaves the circle
                }

                // Only create particles if the hand is open
                if (!isHandClosed(landmarks)) {
                    createParticles(palm.x * backgroundCanvas.width, palm.y * backgroundCanvas.height);
                }

                // Draw the left hand skeleton and text at each finger tip and wrist
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#666666', lineWidth: 0.00001 });
                drawLandmarks(canvasCtx, landmarks, {
                    color: 'rgb(0, 0, 0)',
                    fillColor: 'rgb(0, 0, 0)',
                    radius: (x) => lerp(x.from.z, -0.15, .1, 10, 1)
                });
                for (let i = 0; i < fingerIndexes.length; i++) {
                    const landmark = landmarks[fingerIndexes[i]];
                    drawTextAtLandmark(canvasCtx, leftTexts[i], landmark, 10, 10);
                }
            } else {
                rightHandVisible = true;

                // If the right hand reappears, start flickering
                if (!rightHandWasVisible) {
                    startFlicker("right");
                }

                // Flicker the percentages during the flicker period, then stop
                if (shouldFlicker("right")) {
                    updateTextsWithPercentage();
                }

                // Check if the palm is inside the circle
                if (isPalmInCircle(palm)) {
                    if (!palmInsideStartTime) {
                        palmInsideStartTime = Date.now();
                    } else if (Date.now() - palmInsideStartTime >= palmInsideDelay) {
                        circle.color = 'green';  // Change to green if palm is inside for 2 seconds
                        if (!videoStarted) {
                            videoOverlay.play();
                            videoStarted = true;
                        }
                    }
                } else {
                    circle.color = 'red';    // Change to red if palm is outside
                    palmInsideStartTime = null;  // Reset the timer
                }

                // Only create particles if the hand is open
                if (!isHandClosed(landmarks)) {
                    createParticles(palm.x * backgroundCanvas.width, palm.y * backgroundCanvas.height);
                }

                // Draw the right hand skeleton and text at each finger tip and wrist
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#666666', lineWidth: 0.00001 });
                drawLandmarks(canvasCtx, landmarks, {
                    color: 'rgb(0, 0, 0)',
                    fillColor: 'rgb(0, 0, 0)',
                    radius: (x) => lerp(x.from.z, -0.15, .1, 10, 1)
                });
                for (let i = 0; i < fingerIndexes.length; i++) {
                    const landmark = landmarks[fingerIndexes[i]];
                    drawTextAtLandmark(canvasCtx, rightTexts[i], landmark, 10, 10);
                }
            }
        }
    }

    // Update previous visibility states for the next frame
    leftHandWasVisible = leftHandVisible;
    rightHandWasVisible = rightHandVisible;

    // Animate lines, update particles, and render circle
    for (let f = 0; f < 6; f++) {
        // Left hand line animation
        if (leftFingers[f]) {
            if (leftHandVisible && leftDelayCounter[f] < delayThreshold) {
                leftDelayCounter[f]++;
            }
            if (leftHandVisible && leftDelayCounter[f] >= delayThreshold) {
                if (leftLineLength[f] < 1) leftLineLength[f] += animationSpeed;
            } else if (leftLineLength[f] > 0) {
                leftLineLength[f] -= animationSpeed;
                leftDelayCounter[f] = 0;
            }
            if (leftLineLength[f] > 0) {
                const offsetX = f === 5 ? 60 : 40;
                const offsetY = f === 5 ? 80 : -20;
                drawTextAndLine(canvasCtx, leftTexts[f], leftFingers[f], offsetX, offsetY, leftLineLength[f]);
            }
        }

        // Right hand line animation
        if (rightFingers[f]) {
            if (rightHandVisible && rightDelayCounter[f] < delayThreshold) {
                rightDelayCounter[f]++;
            }
            if (rightHandVisible && rightDelayCounter[f] >= delayThreshold) {
                if (rightLineLength[f] < 1) rightLineLength[f] += animationSpeed;
            } else if (rightLineLength[f] > 0) {
                rightLineLength[f] -= animationSpeed;
                rightDelayCounter[f] = 0;
            }
            if (rightLineLength[f] > 0) {
                const offsetX = f === 5 ? 60 : 40;
                const offsetY = f === 5 ? 80 : -20;
                drawTextAndLine(canvasCtx, rightTexts[f], rightFingers[f], offsetX, offsetY, rightLineLength[f]);
            }
        }
    }

    // Draw the circle, update particles, and render metaballs
    drawCircle(canvasCtx, circle);
    updateParticles();
    renderMetaballs();
    canvasCtx.restore();
}


// Add event listener for window resizing
window.addEventListener('resize', resizeCanvases);

// Initialize MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.3/${file}`;
  }
});

hands.setOptions({
  selfieMode: true,
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Initialize Camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});
camera.start();
