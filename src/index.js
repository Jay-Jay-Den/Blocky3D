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

// HelloCube.js (c) 2012 matsuda
// Vertex shader program
// Vertex shader program
const VSHADER_SOURCE = `
  attribute vec2 aPosition;
  uniform mat4 uModelMatrix;
  void main() {
    gl_Position = uModelMatrix * vec4(aPosition, 0.0, 1.0);
  }
  `;

// Fragment shader program
const FSHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
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

// Set clear color
gl.clearColor(0.2, 0.2, 0.2, 1.0);

gl.clear(gl.COLOR_BUFFER_BIT);

const vertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5]);

const vertexBuf = gl.createBuffer();
if (!vertexBuf) {
  console.log("Failed to create the buffer object");
}

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);

gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const aPosPtr = gl.getAttribLocation(gl.program, "aPosition");

if (aPosPtr < 0) {
  console.error("Could not find aPosition ptr");
}

gl.vertexAttribPointer(aPosPtr, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosPtr);

function drawSpaceship(gl, matrix) {
  const uModelMatrixPtr = gl.getUniformLocation(gl.program, "uModelMatrix");

  const M1 = new Matrix4();

  function drawTri(tx, ty, rot, sx, sy) {
    M1.set(matrix);
    M1.translate(tx, ty, 0);
    M1.rotate(rot, 0, 0, 1);
    M1.scale(sx, sy, 1);
    gl.uniformMatrix4fv(uModelMatrixPtr, false, M1.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  drawTri(0, 0, 0, 1, 1);

  drawTri(0, 0, 180, 1, 1);

  drawTri(0, 0.5, 225, 0.7, 0.7);

  drawTri(0, -0.7, 0, 0.5, 0.5);

  drawTri(0, -0.7, 180, 0.5, 0.5);

  drawTri(0.2, -0.9, -225, 0.6, 0.6);

  drawTri(-0.2, -0.9, -45, 0.6, 0.6);

  drawTri(0.64, -1.32, -45, 0.6, 0.6);

  drawTri(-0.64, -1.32, -225, 0.6, 0.6);
}

const M = new Matrix4();

M.setTranslate(-0.5, -0.3, 0);
M.scale(0.4, 0.4, 0.4);
M.rotate(50, 0, 0, 1);

drawSpaceship(gl, M);

M.setTranslate(0.5, -0.25, 0);
M.scale(0.2, 0.2, 0.2);
M.rotate(30, 0, 0, 1);
drawSpaceship(gl, M);

M.setTranslate(-0.15, 0.4, 0);
M.scale(0.3, 0.3, 0.3);
M.rotate(20, 0, 0, 1);
drawSpaceship(gl, M);
