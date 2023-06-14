// Initialize globals
var canvas;
var gl;
var program;

var numTimesToSubdivide = 0;

// Points info
var index = 0;

var pointsArray = [];
var normalsArray = [];

// Camera Params
var near = 0.1;
var far = 100;

var left = -3.0;
var right = 3.0;
var ytop = 3.0;
var bottom = -3.0;

// Initial quad
var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

// Light params
var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

// Material Params
var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 20.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var eye;
var at = vec3(0.0, 0.0, -1.0);
var up = vec3(0.0, 1.0, 0.0);

// Creates a quad from 4 points
// Divides recursivelly by n
function quad(a, b, c, d, n) {
  var vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0),
  ];

  var indices = [a, b, c, a, c, d];

  // We need to parition the quad into two triangles in order for
  // WebGL to be able to render it.  In this case, we create two
  // triangles from the quad indices

  // Keep spliting triangles until base case is met
  divideTriangle(
    vertices[indices[0]],
    vertices[indices[1]],
    vertices[indices[2]],
    n
  );
  divideTriangle(
    vertices[indices[3]],
    vertices[indices[4]],
    vertices[indices[5]],
    n
  );
}

// Generates cube by rendering 4 quads
function makeCube(n) {
  quad(1, 0, 3, 2, n);
  quad(2, 3, 7, 6, n);
  quad(3, 0, 4, 7, n);
  quad(6, 5, 1, 2, n);
  quad(4, 5, 6, 7, n);
  quad(5, 4, 0, 1, n);
}

// Creates triangle points and updates drawing index
function triangle(a, b, c) {
  pointsArray.push(a);
  pointsArray.push(b);
  pointsArray.push(c);

  // normals are vectors

  normalsArray.push(a[0], a[1], a[2], 0.0);
  normalsArray.push(b[0], b[1], b[2], 0.0);
  normalsArray.push(c[0], c[1], c[2], 0.0);

  index += 3;
}

// Divides triangles into subsets
// Calls recursivelt
function divideTriangle(a, b, c, count) {
  if (count > 0) {
    var ab = mix(a, b, 0.5);
    var ac = mix(a, c, 0.5);
    var bc = mix(b, c, 0.5);

    ab = normalize(ab, true);
    ac = normalize(ac, true);
    bc = normalize(bc, true);

    divideTriangle(a, ab, ac, count - 1);
    divideTriangle(ab, b, bc, count - 1);
    divideTriangle(bc, c, ac, count - 1);
    divideTriangle(ab, bc, ac, count - 1);
  } else {
    triangle(a, b, c);
  }
}

// Initialization function
window.onload = function init() {
  // Grab canvas
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  // Set viewport and set backgorund
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Get Lighting
  var diffuseProduct = mult(lightDiffuse, materialDiffuse);
  var specularProduct = mult(lightSpecular, materialSpecular);
  var ambientProduct = mult(lightAmbient, materialAmbient);

  // Initialize First Cube
  makeCube(numTimesToSubdivide);

  // Generate new buffer
  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  // Grab Position
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Get normal buffer
  var vNormal = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vNormal);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

  // Get normal position
  var vNormalPosition = gl.getAttribLocation(program, "vNormal");
  gl.vertexAttribPointer(vNormalPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormalPosition);

  // Get Model and Projection
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

  // Update Lighting
  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );
  gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

  // Draw
  render();

  // Add key listeners
  document.addEventListener("keydown", (e) => {
    // Adds subdivides
    if (e.key === "q" || e.key === "Q") {
      numTimesToSubdivide += 1;

      // Bound to max
      if (numTimesToSubdivide > 5) {
        numTimesToSubdivide = 5;
      }

      // Reset points
      pointsArray = [];
      normalsArray = [];

      // Generate new and add to buffer
      makeCube(numTimesToSubdivide);
      addPoints();

      // Draw
      render();
    }

    // Removes subdivides
    if (e.key === "e" || e.key === "E") {
      numTimesToSubdivide -= 1;

      // Bound to min
      if (numTimesToSubdivide < 0) {
        numTimesToSubdivide = 0;
      }

      // Reset points
      pointsArray = [];
      normalsArray = [];

      // Generate new and add to buffer
      makeCube(numTimesToSubdivide);
      addPoints();

      // Draw
      render();
    }
  });
};

// Adds more points to the buffer
function addPoints() {
  // Generate new buffer
  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  // Grab Position
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Get normal buffer
  var vNormal = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vNormal);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

  // Get normal position
  var vNormalPosition = gl.getAttribLocation(program, "vNormal");
  gl.vertexAttribPointer(vNormalPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormalPosition);
}

function render() {
  // Clear
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //setting the object 20 units away
  eye = vec3(0, 0, 20);

  // Model view calculations
  modelViewMatrix = lookAt(eye, at, up);
  projectionMatrix = perspective(30, 1, near, far);

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

  // Render shapes
  for (var i = 0; i < index; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);
}
