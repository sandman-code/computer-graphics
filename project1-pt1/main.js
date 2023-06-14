// Initialize Globals / Defaults
var lines = [];
var points = [];
var colors = [];
var gl;
var program;
var view = [0, 0, 400, 400];
var height = 400;
var width = 400;
var scaleFactor = 1;
var rotateFactor = 0;
var isDragging = false;

// Funcrion called whenever SVG is uploaded (initial render)
function read(e) {
  // Clear previous data
  lines = [];
  points = [];
  view = [];
  colors = [];

  // Parse SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(e.target.result, "image/svg+xml");
  lines = xmlGetLines(doc, hexToRgb(0xffffff));
  view = xmlGetViewbox(doc, [0, 0, 0, 0]);

  // Rip off rows from xml
  const vertices = lines[0];
  const colorVals = lines[1];

  // Push vertices
  vertices.forEach((v) => points.push(vec4(v[0], v[1])));

  // Push colors
  colorVals.forEach((c) => colors.push(c));

  // Create  vertex buffer
  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

  // Set position array
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.enableVertexAttribArray(vPosition);
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

  // Create color buffer
  var cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  // Set vColor
  var vColor = gl.getAttribLocation(program, "vColor");
  gl.enableVertexAttribArray(vColor);
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

  // Set point size
  var vPointSize = gl.getUniformLocation(program, "vPointSize");
  gl.uniform1f(vPointSize, 10.0);

  // Setup projection
  var thisProj = ortho(
    view[0],
    view[0] + view[2],
    view[1] + view[3],
    view[1],
    -1.0,
    1.0
  );

  // Updates ratio for viewport
  fixRatio();

  // Insert projection
  var projMatrix = gl.getUniformLocation(program, "projMatrix");
  gl.uniformMatrix4fv(projMatrix, false, flatten(thisProj));

  //initialize model transformation matrices
  var initalTrans = translate(0, 0, 0);
  var T = gl.getUniformLocation(program, "T");
  gl.uniformMatrix4fv(T, false, flatten(initalTrans));

  var initialRot = rotateZ(0);
  var R = gl.getUniformLocation(program, "R");
  gl.uniformMatrix4fv(R, false, flatten(initialRot));

  var initialScale = scalem(1, 1, 1);
  var S = gl.getUniformLocation(program, "S");
  gl.uniformMatrix4fv(S, false, flatten(initialScale));

  gl.viewport(0, 0, width, height);
  console.log(width, height);
  render();
}

// Loads file - wrote this without realizing there was one in
// starter code. Whoops
function load(e) {
  var reader = new FileReader();
  reader.onload = read;
  reader.readAsText(e.target.files[0]);
}

function main() {
  // Empty the object to render
  let vertices = [];
  let colors = [];

  // Retrieve <canvas> element
  let canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  gl = WebGLUtils.setupWebGL(canvas, undefined);

  //Check that the return value is not null.
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }

  // Initialize shaders
  program = initShaders(gl, "vshader", "fshader");
  gl.useProgram(program);

  //Set up the viewport
  gl.viewport(0, 0, width, height);

  // Create event listeners
  const input = document.getElementById("svg_files");
  input.addEventListener("change", (e) => {
    if (!e.target.files) {
      return;
    }
    load(e);
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.shiftKey) {
      scaleObject(e);
    } else {
      rotateObject(e);
    }
    render();
  });

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);

  document.addEventListener("keydown", (event) => {
    if (event.key === "r" || event.key === "R") {
      resetCanvas();
    }
  });
}

// Aux fucntions to handle drag
function handleMouseDown() {
  isDragging = true;
}

function handleMouseUp() {
  isDragging = false;
}

// Function to calculate the drag offset
function handleMouseMove(e) {
  if (isDragging) {
    translateObject(e.offsetX, e.offsetY);
    render();
  }
}

//TODO fix movement - kinda lowkey works
function translateObject(transX, transY) {
  var center = {
    x: (view[0] + view[2]) / 2,
    y: (view[1] + view[3]) / 2,
  };

  var ratioX = center.x / (width / 2);
  var ratioY = center.y / (height / 2);
  console.log(width, height);
  console.log("Object origin: ", center.x, center.y);
  console.log("Ratios: ", ratioX, ratioY);

  // First translate to origin then apply offset
  var originMat = translate(
    -(view[0] + view[2] / 2),
    -(view[1] + view[3] / 2),
    0
  );
  var offsetMat = translate(ratioX * transX, ratioY * transY, 0);
  var resMat = mult(offsetMat, originMat);

  var modelMatrix = gl.getUniformLocation(program, "T");
  gl.uniformMatrix4fv(modelMatrix, false, flatten(resMat));
}

// Rotates the object around itself
function rotateObject(e) {
  rotateFactor += e.deltaY * 0.01;

  // Translate to origin
  var transMat = translate(
    -(view[0] + view[2] / 2),
    -(view[1] + view[3] / 2),
    0
  );

  // Rotate by amount
  var rotMat = rotateZ(rotateFactor);
  var ctMat = mult(rotMat, transMat);

  // Translate back to original position
  transMat = translate(view[0] + view[2] / 2, view[1] + view[3] / 2, 0);
  var resMat = mult(transMat, ctMat);

  // Shows current rotation amount
  console.log("Degree: ", rotateFactor);

  // Update R Matrix
  var modelMatrix = gl.getUniformLocation(program, "R");
  gl.uniformMatrix4fv(modelMatrix, false, flatten(resMat));
}

// Scales the object based on the wheel input
function scaleObject(e) {
  scaleFactor += e.deltaY * 0.001;

  // Scales the factor between 0.1x and 10x
  if (scaleFactor < 0.1) {
    scaleFactor = 0.1;
  } else if (scaleFactor > 10) {
    scaleFactor = 10;
  }

  // Translate to origin
  var transMat = translate(
    -(view[0] + view[2] / 2),
    -(view[1] + view[3] / 2),
    0
  );

  // Scale by amount
  var scaleMat = scalem(scaleFactor, scaleFactor, 0);
  var ctMat = mult(scaleMat, transMat);

  // Translate back to original position
  transMat = translate(view[0] + view[2] / 2, view[1] + view[3] / 2, 0);
  var resMat = mult(transMat, ctMat);

  //Shows scale factor
  console.log("Scale factor: ", scaleFactor);

  // Update S matrix
  var modelMatrix = gl.getUniformLocation(program, "S");
  gl.uniformMatrix4fv(modelMatrix, false, flatten(resMat));
}

// Draws object
function render() {
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(gl.LINES, 0, points.length);
}

// Resets all transformations
function resetCanvas() {
  // Default scale and rotate
  scaleFactor = 1;
  rotateFactor = 0;

  // Clear T
  var initalTrans = translate(0, 0, 0);
  var T = gl.getUniformLocation(program, "T");
  gl.uniformMatrix4fv(T, false, flatten(initalTrans));

  // Clear R
  var initialRot = rotateZ(0);
  var R = gl.getUniformLocation(program, "R");
  gl.uniformMatrix4fv(R, false, flatten(initialRot));

  // Clear S
  var initialScale = scalem(1, 1, 1);
  var S = gl.getUniformLocation(program, "S");
  gl.uniformMatrix4fv(S, false, flatten(initialScale));

  // Re-render
  render();
}

// Updates aspect ratio for viewport
function fixRatio() {
  // Check if width is greater
  if (view[2] > view[3]) {
    width = 400;
    height = 400 / (view[2] / view[3]);
  }
  // Check if height is greater
  else if (view[2] < view[3]) {
    width = (view[2] / view[3]) * 400;
    height = 400;
  }
  //Default and if they are equal
  else {
    width = 400;
    height = 400;
  }
}
