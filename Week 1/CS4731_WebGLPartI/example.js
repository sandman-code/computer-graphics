function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  var gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }

  // Initialize shaders
  program = initShaders(gl, "vshader", "fshader");
  gl.useProgram(program);

  //Set up the viewport
  gl.viewport(0, 0, canvas.width, canvas.height);

  var points = [];
  points.push(vec4(1.0, -0.5, 0.0, 1.0));
  points.push(vec4(0.5, -0.5, 0.0, 1.0));
  points.push(vec4(0.0, 0.5, 0.0, 1.0));

  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.enableVertexAttribArray(vPosition);
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, points.length);
}
