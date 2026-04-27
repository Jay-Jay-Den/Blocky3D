/**
 * With codesandbox we import our functions from the files they live in
 * rather than import that file in the HTML file like we usually do
 *
 * ALSO NOTE that there is NO main function being called.
 * index.js IS your main function and the code written in it is run
 * on page load.
 */
import "./styles.css";
import { initShaders } from "../lib/cuon-utils";
import { Matrix4, Vector3 } from "../lib/cuon-matrix-cse160";

// Vertex shader program
const VSHADER_SOURCE = `
  attribute vec3 aPosition;
  uniform mat4 uModelMatrix;
  uniform mat4 uGlobalRotation;
  void main() {
    gl_Position = uGlobalRotation * uModelMatrix * vec4(aPosition, 1.0);
  }
  `;

// Fragment shader program
const FSHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
  `;

// Retrieve <canvas> element
var canvas = document.getElementById("webgl");

// Get the rendering context for WebGL
var gl = canvas.getContext("webgl");
if (!gl) {
  console.log("Failed to get the rendering context for WebGL");
}

// Initialize shaders
if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
  console.log("Failed to intialize shaders.");
}

gl.enable(gl.DEPTH_TEST);

// Set clear color
gl.clearColor(0.2, 0.2, 0.2, 1.0);

// ---- Globals / UI state ----
let gAnimalGlobalRotation = 0;
let gFrontShoulder = 15;
let gFrontKnee = -25;
let gFrontAnkle = 10;

let gAnimationOn = false;
let g_time = 0;
let g_animTime = 0;

// ---- Locations ----
const aPositionLoc = gl.getAttribLocation(gl.program, "aPosition");
const uModelMatrixLoc = gl.getUniformLocation(gl.program, "uModelMatrix");
const uGlobalRotationLoc = gl.getUniformLocation(gl.program, "uGlobalRotation");
const uColorLoc = gl.getUniformLocation(gl.program, "uColor");

if (aPositionLoc < 0) console.error("Could not find aPosition");
if (!uModelMatrixLoc) console.error("Could not find uModelMatrix");
if (!uGlobalRotationLoc) console.error("Could not find uGlobalRotation");
if (!uColorLoc) console.error("Could not find uColor");

// ---- Cube buffer (one-time) ----
// Unit cube centered at origin, made of 12 triangles (36 verts)
const CUBE_VERTS = new Float32Array([
  // Front (z+)
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
  -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  // Back (z-)
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
  0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  // Left (x-)
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
  // Right (x+)
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
  0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  // Top (y+)
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  // Bottom (y-)
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,
  -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5
]);

const cubeBuf = gl.createBuffer();
if (!cubeBuf) console.error("Failed to create cube buffer");

gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.STATIC_DRAW);

gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPositionLoc);

// ---- Helpers ----
function setGlobalRotationUniform() {
  const R = new Matrix4();
  // Slight X tilt so it reads as 3D even with orthographic clip-space
  R.rotate(-20, 1, 0, 0);
  R.rotate(gAnimalGlobalRotation, 0, 1, 0);
  gl.uniformMatrix4fv(uGlobalRotationLoc, false, R.elements);
}

function drawCube(M, color) {
  gl.uniformMatrix4fv(uModelMatrixLoc, false, M.elements);
  gl.uniform4f(uColorLoc, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function pushMatrix(stack, M) {
  stack.push(new Matrix4(M));
}
function popMatrix(stack) {
  return stack.pop();
}

function updateAnimationAngles() {
  // t in seconds-ish
  const t = g_animTime * 0.001;

  // A simple walk-cycle style motion
  const swing = Math.sin(t * 3.0);
  gFrontShoulder = 20 + swing * 25;
  gFrontKnee = -25 + Math.max(0, -swing) * -35; // bends more when leg comes forward
  gFrontAnkle = 10 + Math.sin(t * 3.0 + 1.2) * 10;
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  setGlobalRotationUniform();

  const stack = [];

  // Fit the model into clip space
  const root = new Matrix4();
  root.scale(0.55, 0.55, 0.55);
  root.translate(0, -0.15, 0);

  // ---- Horse body ----
  const body = new Matrix4(root);
  body.scale(1.3, 0.55, 0.5);
  drawCube(body, [0.55, 0.36, 0.22, 1.0]); // brown

  // ---- Neck ----
  const neck = new Matrix4(root);
  neck.translate(0.65, 0.28, 0);
  neck.rotate(15, 0, 0, 1);
  pushMatrix(stack, neck);
  neck.scale(0.45, 0.2, 0.25);
  drawCube(neck, [0.55, 0.36, 0.22, 1.0]);

  // ---- Head ----
  let headBase = popMatrix(stack);
  headBase.translate(0.3, 0.12, 0);
  const head = new Matrix4(headBase);
  head.scale(0.38, 0.22, 0.25);
  drawCube(head, [0.45, 0.28, 0.16, 1.0]);

  // ---- Tail ----
  const tail = new Matrix4(root);
  tail.translate(-0.7, 0.12, 0);
  tail.rotate(-25, 0, 0, 1);
  tail.scale(0.35, 0.12, 0.12);
  drawCube(tail, [0.25, 0.16, 0.1, 1.0]);

  // ---- Legs ----
  // Leg helper: builds a 3-joint leg chain (thigh -> calf -> hoof)
  // Hip coordinate frame is at the body, then we translate down.
  function drawLeg(hipX, hipZ, isFront, phase, overrides) {
    const shoulder = overrides?.shoulder ?? (isFront ? gFrontShoulder : 10 + phase);
    const knee = overrides?.knee ?? (isFront ? gFrontKnee : -20 - phase * 0.6);
    const ankle = overrides?.ankle ?? (isFront ? gFrontAnkle : 5 + phase * 0.2);

    // Hip frame
    let M = new Matrix4(root);
    M.translate(hipX, -0.05, hipZ);

    // Upper leg (thigh)
    pushMatrix(stack, M);
    M.rotate(shoulder, 0, 0, 1);
    pushMatrix(stack, M); // frame at shoulder after rotate
    {
      const thigh = new Matrix4(M);
      thigh.translate(0, -0.28, 0);
      thigh.scale(0.16, 0.45, 0.16);
      drawCube(thigh, [0.55, 0.36, 0.22, 1.0]);
    }

    // Lower leg (calf), attached to end of thigh
    M = popMatrix(stack);
    M.translate(0, -0.52, 0); // to knee joint
    M.rotate(knee, 0, 0, 1);
    pushMatrix(stack, M); // frame at knee after rotate
    {
      const calf = new Matrix4(M);
      calf.translate(0, -0.23, 0);
      calf.scale(0.14, 0.38, 0.14);
      drawCube(calf, [0.50, 0.32, 0.2, 1.0]);
    }

    // Hoof (foot), attached to end of calf
    M = popMatrix(stack);
    M.translate(0, -0.42, 0); // to ankle joint
    M.rotate(ankle, 0, 0, 1);
    {
      const hoof = new Matrix4(M);
      hoof.translate(0.05, -0.06, 0);
      hoof.scale(0.22, 0.12, 0.18);
      drawCube(hoof, [0.1, 0.1, 0.1, 1.0]);
    }

    popMatrix(stack); // original hip frame
  }

  // Front-left leg: fully slider controlled (3 levels deep)
  drawLeg(0.45, 0.18, true, 0, {
    shoulder: gFrontShoulder,
    knee: gFrontKnee,
    ankle: gFrontAnkle
  });

  // Front-right: mirrored a bit and phase-shifted
  drawLeg(0.45, -0.18, true, 10, {
    shoulder: -gFrontShoulder * 0.7,
    knee: gFrontKnee * 0.7,
    ankle: -gFrontAnkle * 0.7
  });

  // Back legs (simple procedural motion)
  const t = g_animTime * 0.001;
  const backPhase = gAnimationOn ? Math.sin(t * 3.0) * 20 : 0;
  drawLeg(-0.45, 0.16, false, -backPhase, null);
  drawLeg(-0.45, -0.16, false, backPhase, null);
}

// ---- UI wiring ----
function bindSlider(id, read, write, outId) {
  const el = document.getElementById(id);
  const out = document.getElementById(outId);
  if (!el) return;
  el.value = String(read());
  if (out) out.textContent = String(read());
  el.addEventListener("input", () => {
    const v = Number(el.value);
    write(v);
    if (out) out.textContent = String(v);
    renderScene();
  });
}

bindSlider(
  "globalRot",
  () => gAnimalGlobalRotation,
  (v) => (gAnimalGlobalRotation = v),
  "globalRotVal"
);
bindSlider(
  "frontShoulder",
  () => gFrontShoulder,
  (v) => (gFrontShoulder = v),
  "frontShoulderVal"
);
bindSlider(
  "frontKnee",
  () => gFrontKnee,
  (v) => (gFrontKnee = v),
  "frontKneeVal"
);
bindSlider(
  "frontAnkle",
  () => gFrontAnkle,
  (v) => (gFrontAnkle = v),
  "frontAnkleVal"
);

const toggleAnimBtn = document.getElementById("toggleAnim");
if (toggleAnimBtn) {
  toggleAnimBtn.addEventListener("click", () => {
    gAnimationOn = !gAnimationOn;
    toggleAnimBtn.textContent = `Animation: ${gAnimationOn ? "ON" : "OFF"}`;
  });
}

// ---- tick / FPS ----
let g_prevTime = performance.now();
let g_fpsSmoothed = 0;
const fpsEl = document.getElementById("fps");

function tick(now) {
  g_time = now;

  const dt = now - g_prevTime;
  g_prevTime = now;
  const fps = dt > 0 ? 1000 / dt : 0;
  g_fpsSmoothed = g_fpsSmoothed ? g_fpsSmoothed * 0.9 + fps * 0.1 : fps;
  if (fpsEl) fpsEl.textContent = `FPS: ${g_fpsSmoothed.toFixed(1)}`;

  if (gAnimationOn) {
    g_animTime += dt;
    updateAnimationAngles();
  }
  renderScene();
  requestAnimationFrame(tick);
}

// First draw and start the loop
renderScene();
requestAnimationFrame(tick);

