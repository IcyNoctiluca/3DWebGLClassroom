//////////////////////////////////////////////////////////////////////////
/* PROGRAM CORE: Lighting Demo by Frederick Li                          */
/* GRAPHICS ASSIGNMENT - 3D MODEL OF CLASSROOM                          */
//////////////////////////////////////////////////////////////////////////

// define the vertex shader
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +        // Normal
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform vec3 u_LightColor1;\n' +     // Light1 color
  'uniform vec3 u_LightColor2;\n' +     // Light2 color
  'uniform vec3 u_LightDirection;\n' +  // Light direction (in the world coordinate, normalized)
  'uniform vec3 u_LightPosition1;\n' +  // Position of light2 source
  'uniform vec3 u_LightPosition2;\n' +  // Position of light2 source
  'uniform vec3 u_AmbientLight;\n' +    // Color of ambient light
  'varying vec4 v_Color;\n' +
  'uniform bool u_isLighting;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
  '  if(u_isLighting)\n' +
  '  {\n' +
  '     vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  '     float nDotL = max(dot(normal, u_LightDirection), 0.0);\n' +
  '     vec3 diffuse = u_LightColor1 * a_Color.rgb * nDotL;\n' +
  '     vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  '     v_Color = vec4(diffuse + ambient, a_Color.a);\n' +  '  }\n' +
  '  else\n' +
  '  {\n' +
  '     vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  '     vec4 vertexPosition = u_ModelMatrix * a_Position;\n' +

        // calculate diffuse from light 1
  '     vec3 lightDirection1 = normalize(u_LightPosition1 - vec3(vertexPosition));\n' +
  '     float nDotL1 = max(dot(lightDirection1, normal), 0.0);\n' +
  '     vec3 diffuse1 = u_LightColor1 * a_Color.rgb * nDotL1;\n' +

        // calculate diffuse from light 2
  '     vec3 lightDirection2 = normalize(u_LightPosition2 - vec3(vertexPosition));\n' +
  '     float nDotL2 = max(dot(lightDirection2, normal), 0.0);\n' +
  '     vec3 diffuse2 = u_LightColor2 * a_Color.rgb * nDotL2;\n' +

        // combine the light reflections
  '     vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  '     v_Color = vec4(diffuse1 + diffuse2 + ambient , a_Color.a);\n' +
  '  }\n' +
  '}\n';

// Fragment shader
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var modelMatrix = new Matrix4();      // The model matrix
var viewMatrix = new Matrix4();       // The view matrix
var projMatrix = new Matrix4();       // The projection matrix
var g_normalMatrix = new Matrix4();   // Coordinate transformation matrix for normals

var isLit1 = true;                    // if light1 is switched on or off
var isLit2 = true;                    // if light2 is switched on or off

var CLEANER_Y = -2.9;                 // initial coords of whiteboard cleaner
var CLEANER_Z = -2.9;

var MOVABLECHAIR_X = 20;               // initial coords of movable chair
var MOVABLECHAIR_Z = -40;
var MOVABLECHAIR_TILT = 0;            // inital orientation of movable chair
var MOVABLECHAIR_SPIN = 0;

var TEACHERSCHAIR_ANGLE = 0;          // inital orientation of teachers chair

var POS_STEP = 0.5;                   // amount to move and any direction
var ANGLE_STEP = 3;                   // increment of rotation angle (degrees)

var door_Angle = 0.0;                 // inital angle of door (closed)

var CAM_X_POS = 20;                   // inital coords of camera
var CAM_Y_POS = 4;
var CAM_Z_POS = -20;

var UP_DOWN_ANGLE = 120;              // angle camera looks down from vertical
var LEFT_RIGHT_ANGLE = 135;           // angle camera looks around in left right dir

// computes x look at coord based on camera position and looking direction
// based on spherical polar coords
function AT_X_POS() {
  return (CAM_X_POS + Math.cos(toRadians(LEFT_RIGHT_ANGLE)) * Math.sin(toRadians(UP_DOWN_ANGLE))).toFixed(2);
}

// computes z look at coord based on camera position and looking direction
function AT_Z_POS() {
  return (CAM_Z_POS + Math.sin(toRadians(LEFT_RIGHT_ANGLE)) * Math.sin(toRadians(UP_DOWN_ANGLE))).toFixed(2);
}

// converts angle in degree to rads
function toRadians(degree) {
  return degree * Math.PI / 180
}


function main() {

  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {alert('Failed to get the rendering context for WebGL');return;}

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {alert('Failed to intialize shaders.');return;}

  // Set clear color and enable hidden surface removal
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get the storage locations of uniform attributes
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');

  var u_LightColor1 = gl.getUniformLocation(gl.program, 'u_LightColor1');         // light colour 1
  var u_LightColor2 = gl.getUniformLocation(gl.program, 'u_LightColor2');         // light colour 2

  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');

  var u_LightPosition1 = gl.getUniformLocation(gl.program, 'u_LightPosition1');   // direction of light 1
  var u_LightPosition2 = gl.getUniformLocation(gl.program, 'u_LightPosition2');   // direction of light 2

  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');


  // Trigger using lighting or not
  var u_isLighting = gl.getUniformLocation(gl.program, 'u_isLighting');

  if (!u_ModelMatrix  || !u_ViewMatrix || !u_NormalMatrix   ||
      !u_ProjMatrix   || !u_LightColor1 || !u_LightDirection || !u_isLighting)
     {alert('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');return;}

  // Set the colour (white) and positions of both lights
  gl.uniform3f(u_LightColor1, 1, 1, 1);
  gl.uniform3f(u_LightColor2, 1, 1, 1);

  gl.uniform3f(u_LightPosition1, 0,9.5,-20);
  gl.uniform3f(u_LightPosition2, 0,9.5,20);

  gl.uniform3f(u_AmbientLight, 0.3, 0.3, 0.3);


  // Calculate the view matrix and the projection matrix
  viewMatrix.setLookAt(CAM_X_POS, CAM_Y_POS, CAM_Z_POS, AT_X_POS(), CAM_Y_POS, AT_Z_POS(), 0, 1, 0);
  projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 1000);

  // Pass the model, view, and projection matrix to the uniform variable respectively
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  // allow reception of keypresses
  document.onkeydown = function(ev){
    keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_isLighting, u_ProjMatrix, u_LightColor1, u_LightColor2);
  };

  // draw scene
  draw(gl, u_ModelMatrix, u_NormalMatrix, u_isLighting, u_ProjMatrix, u_LightColor1, u_LightColor2);
}

// deals with key presses
function keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_isLighting, u_ProjMatrix, u_LightColor1, u_LightColor2) {

  switch (ev.keyCode) {

    // turn camera to left
    case 39: // Right arrow key
      LEFT_RIGHT_ANGLE = (LEFT_RIGHT_ANGLE + ANGLE_STEP) % 360;
      break;

    // turn camera to right
    case 37: // Left arrow key
      LEFT_RIGHT_ANGLE = (LEFT_RIGHT_ANGLE - ANGLE_STEP) % 360;
      break;

    // move camera in x direction
    case 87: // w
      CAM_X_POS += POS_STEP;
      break;

    // move camera in z direction
    case 65: // a
      CAM_Z_POS += POS_STEP;
      break;

    // move camera back in x direction
    case 83: // s
      CAM_X_POS -= POS_STEP;
      break;

    // move camera back in z direction
    case 68: // d
      CAM_Z_POS -= POS_STEP;
      break;

    // turn on and off light 1
    case 81:  // q
      isLit1 = !isLit1;
      break;

    // turn on and off light 2
    case 69:  // e
      isLit2 = !isLit2;
      break;

    // close the door
    case 80:  // p
      if (door_Angle + ANGLE_STEP <= 0) {    // apply limits to door hinge
          door_Angle += ANGLE_STEP;
      }
      break;

    // open the door
    case 79:  // o
      if (door_Angle - ANGLE_STEP >= -75) {
          door_Angle -= ANGLE_STEP;
      }
      break;

    // move the whiteboard cleaner up
    case 49:  // 1
      if (POS_STEP + CLEANER_Y <= 3) {
          CLEANER_Y += POS_STEP;
      }
      break;

    // move the whiteboard cleaner down
    case 50:  // 2
      if (CLEANER_Y - POS_STEP >= -3) {
          CLEANER_Y -= POS_STEP;
      }
      break;

    // move the whiteboard cleaner right
    case 51:  // 3
      if (CLEANER_Z + POS_STEP <= 3) {
          CLEANER_Z += POS_STEP;
      }
      break;

    // move the whiteboard cleaner left
    case 52:  // 4
      if (CLEANER_Z - POS_STEP >= -3) {
          CLEANER_Z -= POS_STEP;
      }
      break;

    // swing around in the teachers chair
    case 66:  // b
      TEACHERSCHAIR_ANGLE = (TEACHERSCHAIR_ANGLE + ANGLE_STEP) % 360;
      break;

    // swing around in the teachers chair (opposite direction)
    case 78:  // n
      TEACHERSCHAIR_ANGLE = (TEACHERSCHAIR_ANGLE - ANGLE_STEP) % 360;
      break;

    // move the movable back in x direction
    case 53:  // 5
      if (MOVABLECHAIR_X - POS_STEP >= -30) {
          MOVABLECHAIR_X -= POS_STEP;
      }
      break;

    // move the movable in x direction
    case 54:  // 6
      if (MOVABLECHAIR_X + POS_STEP <= 30) {
          MOVABLECHAIR_X += POS_STEP;
      }
      break;

    // move the movable back in z direction
    case 55:  // 7
      if (MOVABLECHAIR_Z - POS_STEP >= -30) {
          MOVABLECHAIR_Z -= POS_STEP;
      }
      break;

    // move the movable in z direction
    case 56:  // 8
      if (MOVABLECHAIR_Z + POS_STEP <= 30) {
          MOVABLECHAIR_Z += POS_STEP;
      }
      break;

    // swing back in chair
    case 57:  // 9
      if (MOVABLECHAIR_TILT + ANGLE_STEP <= 45) {
          MOVABLECHAIR_TILT += ANGLE_STEP;
      }
      break;

    // swing forward in chair
    case 48:  // 0
      if (MOVABLECHAIR_TILT - ANGLE_STEP >= 0) {
          MOVABLECHAIR_TILT -= ANGLE_STEP;
      }
      break;

    // sping around in chair
    case 84:  // t
      MOVABLECHAIR_SPIN = (MOVABLECHAIR_SPIN + ANGLE_STEP) % 360;
      break;

    // sping around in chair (opposite direction)
    case 89:  // y
      MOVABLECHAIR_SPIN = (MOVABLECHAIR_SPIN - ANGLE_STEP) % 360;
      break;

    // Skip drawing at no effective action
    default: return;
  }

  // Draw the scene
  draw(gl, u_ModelMatrix, u_NormalMatrix, u_isLighting, u_ProjMatrix, u_LightColor1, u_LightColor2);
}

// allows a block to be coloured
function colourBlock(r, g, b) {
    var colours = new Float32Array([    // Colours
        r, g, b,   r, g, b,   r, g, b,  r, g, b,     // v0-v1-v2-v3 front
        r, g, b,   r, g, b,   r, g, b,  r, g, b,     // v0-v3-v4-v5 right
        r, g, b,   r, g, b,   r, g, b,  r, g, b,     // v0-v5-v6-v1 up
        r, g, b,   r, g, b,   r, g, b,  r, g, b,     // v1-v6-v7-v2 left
        r, g, b,   r, g, b,   r, g, b,  r, g, b,     // v7-v4-v3-v2 down
        r, g, b,   r, g, b,   r, g, b,  r, g, b      // v4-v7-v6-v5 back
    ]);
    return colours;
}

function initVertexBuffers(gl, colourBlock) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  var vertices = new Float32Array([   // Coordinates
     0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, // v0-v1-v2-v3 front
     0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, // v0-v3-v4-v5 right
     0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
    -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, // v1-v6-v7-v2 left
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, // v7-v4-v3-v2 down
     0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5  // v4-v7-v6-v5 back
  ]);


  var colors = colourBlock;


  var normals = new Float32Array([    // Normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);


  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);


  // Write the vertex property to buffers (coordinates, colors and normals)
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {alert('Failed to create the buffer object');return false;}

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer (gl, attribute, data, num, type) {

  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {alert('Failed to create the buffer object');return false;}

  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {alert('Failed to get the storage location of ' + attribute);return false;}
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return true;
}

function initAxesVertexBuffers(gl) {

  var verticesColors = new Float32Array([
    // Vertex coordinates and color (for axes)
    -20.0,  0.0,   0.0,  1.0,  1.0,  1.0,  // (x,y,z), (r,g,b)
     20.0,  0.0,   0.0,  1.0,  1.0,  1.0,
     0.0,  20.0,   0.0,  1.0,  1.0,  1.0,
     0.0, -20.0,   0.0,  1.0,  1.0,  1.0,
     0.0,   0.0, -20.0,  1.0,  1.0,  1.0,
     0.0,   0.0,  20.0,  1.0,  1.0,  1.0
  ]);
  var n = 6;

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {alert('Failed to create the buffer object');return false;}

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  //Get the storage location of a_Position, assign and enable buffer
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {alert('Failed to get the storage location of a_Position');return -1;}
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

  // Get the storage location of a_Position, assign buffer and enable
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {alert('Failed to get the storage location of a_Color');return -1;}
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);  // Enable the assignment of the buffer object

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return n;
}

// Array for storing a matrix
var g_matrixStack = [];

// Store the specified matrix to the array
function pushMatrix(m) {
  var m2 = new Matrix4(m);
  g_matrixStack.push(m2);
}

// Retrieve the matrix from the array
function popMatrix() {
  return g_matrixStack.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_isLighting, u_ProjMatrix, u_LightColor1, u_LightColor2) {

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set the vertex coordinates and color (for the x, y axes)
  var n = initAxesVertexBuffers(gl);
  if (n < 0) {alert('Failed to set the vertex information');return;}

  // Calculate the view matrix and the projection matrix
  modelMatrix.setTranslate(0, 0, 0);

  // Pass the model matrix to the uniform variable
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  // lighting
  gl.uniform1i(u_isLighting, false);

  // check if light 1 is on or off
  if (isLit1) {
    gl.uniform3f(u_LightColor1, 1, 1, 1);
  } else {
    gl.uniform3f(u_LightColor1, 0, 0, 0);
  }

  // check if light 2 is on or off
  if (isLit2) {
    gl.uniform3f(u_LightColor2, 1, 1, 1);
  } else {
    gl.uniform3f(u_LightColor2, 0, 0, 0);
  }

  // Set the vertex coordinates and color (for the cube)
  var n = initVertexBuffers(gl, colourBlock(1,0,0));
  if (n < 0) {alert('Failed to set the vertex information');return;}

  // get canvas and set view fustrum
  var canvas = document.getElementById('webgl');
  projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 1000);
  projMatrix.lookAt(CAM_X_POS, CAM_Y_POS, CAM_Z_POS, AT_X_POS(), CAM_Y_POS-0.15, AT_Z_POS(), 0, 1, 0);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);


  // construct classroom and its elements
  makeFloor(gl, u_ModelMatrix, u_NormalMatrix, 0,-2.0,0);
  makeRoof(gl, u_ModelMatrix, u_NormalMatrix, 0,10,0);

  makeWall(gl, u_ModelMatrix, u_NormalMatrix, 0, 0,0,50);
  makeWall(gl, u_ModelMatrix, u_NormalMatrix, 0, 0,0,-50);
  makeWall(gl, u_ModelMatrix, u_NormalMatrix, 90, -50,0,0);
  makeEntranceWall(gl, u_ModelMatrix, u_NormalMatrix, 90, 50,0,0);

  makeDoor(gl, u_ModelMatrix, u_NormalMatrix, 50,4,-50);

  makeWindowFrame(gl, u_ModelMatrix, u_NormalMatrix, 0,0,2.1,50);
  makeWindowFrame(gl, u_ModelMatrix, u_NormalMatrix, 0,0,2.1,-50);
  makeWindowFrame(gl, u_ModelMatrix, u_NormalMatrix, 90,-50,2.1,0);

  makeLightShade(gl, u_ModelMatrix, u_NormalMatrix,0,9.5,-20);
  makeLightShade(gl, u_ModelMatrix, u_NormalMatrix,0,9.5,20);

  makeWhiteBoard(gl, u_ModelMatrix, u_NormalMatrix, 49.5,4,10);

  makeTeachersTable(gl, u_ModelMatrix, u_NormalMatrix, 45,1,-8);
  makeTeachersChair(gl, u_ModelMatrix, u_NormalMatrix, 45,0.5,-15);


  // construct cluster of chairs and tables
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 33,0,30, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 30,1,30);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 33,0,25, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 30,1,25);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 22,0,30, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 25,1,30);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 22,0,25, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 25,1,25);

  // another cluster
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 3,0,30, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 0,1,30);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 3,0,25, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 0,1,25);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix,-8,0,30, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -5,1,30);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -8,0,25, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -5,1,25);

  // another cluster
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -17,0,30, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -20,1,30);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -17,0,25, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -20,1,25);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix,-28,0,30, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -25,1,30);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -28,0,25, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -25,1,25);


  // another cluster on other side of the room
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 33,0,-20, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 30,1,-20);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 33,0,-25, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 30,1,-25);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 22,0,-20, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 25,1,-20);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 22,0,-25, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 25,1,-25);

  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 3,0,-20, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 0,1,-20);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, 3,0,-25, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, 0,1,-25);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix,-8,0,-20, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -5,1,-20);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -8,0,-25, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -5,1,-25);

  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -17,0,-20, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -20,1,-20);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -17,0,-25, 270);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -20,1,-25);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix,-28,0,-20, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -25,1,-20);
  makeChair(gl, u_ModelMatrix, u_NormalMatrix, -28,0,-25, 90);
  makeTable(gl, u_ModelMatrix, u_NormalMatrix, -25,1,-25);


  // movable chair
  makeMovableChair(gl, u_ModelMatrix, u_NormalMatrix);

}


// set of functions to model separate objects in classroom

function makeMovableChair (gl, u_ModelMatrix, u_NormalMatrix) {

    // give it a nice colour
    var n = initVertexBuffers(gl, colourBlock(0, 1, 0));

    // translation to place in the room defined by global variables
    modelMatrix.setTranslate(MOVABLECHAIR_X, 0, MOVABLECHAIR_Z);

    // allows chair to spin around
    modelMatrix.rotate(MOVABLECHAIR_SPIN, 0, 1, 0);

    // rotation allows chair to tilt from its rear legs
    modelMatrix.translate(0, -2, -1);
    modelMatrix.rotate(MOVABLECHAIR_TILT, -1, 0, 0);
    modelMatrix.translate(0, 2, 1);

    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.scale(2.0, 0.5, 2.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1.25, -0.75);
    modelMatrix.scale(2.0, 2.0, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair front right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.75, -1.25, 0.75);
    modelMatrix.scale(0.5, 2.0, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair front left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.75, -1.25, 0.75);
    modelMatrix.scale(0.5, 2.0, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair back right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.75, -1.25, -0.75);
    modelMatrix.scale(0.5, 2.0, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair back left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.75, -1.25, -0.75);
    modelMatrix.scale(0.5, 2.0, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function makeLightShade (gl, u_ModelMatrix, u_NormalMatrix, x, y, z) {

    var n = initVertexBuffers(gl, colourBlock(1, 0, 0));

    // translation for position in the room
    modelMatrix.setTranslate(x, y, z);

    // Model the table top
    pushMatrix(modelMatrix);
    modelMatrix.scale(3.0, 1, 3.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

}

function makeTeachersChair (gl, u_ModelMatrix, u_NormalMatrix, x, y, z) {

    var n = initVertexBuffers(gl, colourBlock(1, 0, 1));

    // translation for position in the room
    modelMatrix.setTranslate(x, y, z);

    // Model the chair base
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, -2, 0);
    modelMatrix.scale(2.0, 0.5, 2.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair pole
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, -1, 0);
    modelMatrix.scale(0.25, 1.5, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // only rotate the top part of the chair
    modelMatrix.rotate(TEACHERSCHAIR_ANGLE, 0, 1, 0);

    // Model the chair arm
    pushMatrix(modelMatrix);
    modelMatrix.translate(-1, 0.5, 0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(1.0, 0.25, 2.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair arm
    pushMatrix(modelMatrix);
    modelMatrix.translate(1, 0.5, 0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(1.0, 0.25, 2.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.scale(2.0, 0.5, 2.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1.25, -0.75);
    modelMatrix.scale(2.0, 3.0, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

}

function makeTeachersTable (gl, u_ModelMatrix, u_NormalMatrix, x, y, z) {

    var n = initVertexBuffers(gl, colourBlock(1,1,0));

    // translation for position in the room
    modelMatrix.setTranslate(x, y, z);

    // Model the table top
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1, 0);
    modelMatrix.scale(8.0, 0.5, 8.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair front right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.5, -1.5, 3.5);
    modelMatrix.scale(0.5, 4.5, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair front left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(3.5, -1.5, 3.5);
    modelMatrix.scale(0.5, 4.5, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair back right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.5, -1.5, -3.5);
    modelMatrix.scale(0.5, 4.5, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair back left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(3.5, -1.5, -3.5);
    modelMatrix.scale(0.5, 4.5, 0.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

}

function makeWhiteBoard (gl, u_ModelMatrix, u_NormalMatrix, x, y, z) {

    // translation for position in the room
    modelMatrix.setTranslate(x, y, z);

    // make board cleaner
    var n = initVertexBuffers(gl, colourBlock(0, 0, 1));

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25, CLEANER_Y, CLEANER_Z);
    modelMatrix.scale(0.25, 1, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // make whiteboard fram
    var n = initVertexBuffers(gl, colourBlock(0, 0, 0));

    // Model the frame
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.25, 0, 0);              // make frame just behind board
    modelMatrix.scale(0.25, 9, 13);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // make the whiteboard
    var n = initVertexBuffers(gl, colourBlock(1, 1, 1));

    // Model the whiteboard
    pushMatrix(modelMatrix);
    modelMatrix.scale(0.25, 8, 12);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

}

function makeWindowFrame (gl, u_ModelMatrix, u_NormalMatrix, angle, x, y, z) {

    var n = initVertexBuffers(gl, colourBlock(1, 0, 0));

    // Rotate, and then translate
    modelMatrix.setTranslate(x, y, z);
    modelMatrix.rotate(angle, 0, 1, 0);   // rotate to turn whole thing in line with wall if needed

    // Model the left panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(-9.9, 2, 0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(4.0, 0.25, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the right panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(9.9, 2, 0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(4.0, 0.25, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the centre pannel
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 2, 0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(4.0, 0.25, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the upper pannel
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 3.8, 0);
    modelMatrix.scale(20.0, 0.25, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the lower pannel
    pushMatrix(modelMatrix);
    modelMatrix.scale(20.0, 0.25, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function makeDoor (gl, u_ModelMatrix, u_NormalMatrix, x, y, z) {

    var n = initVertexBuffers(gl, colourBlock(1, 1, 0));

    // allow door to be rotated via global variable
    modelMatrix.setTranslate(x, y, z);
    modelMatrix.rotate(door_Angle, 0, 1, 0);
    modelMatrix.translate(0,0,4);                 // translate model to rotate around hinge

    // Model the handle
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, -1, 2.5);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // different colour for door
    var n = initVertexBuffers(gl, colourBlock(1, 0, 0));

    // Model the door
    pushMatrix(modelMatrix);
    modelMatrix.scale(0.25, 12, 8);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

}

function makeEntranceWall (gl, u_ModelMatrix, u_NormalMatrix, angle, x, y, z) {

    var n = initVertexBuffers(gl, colourBlock(1, 1, 1));

    modelMatrix.setTranslate(x, y, z);
    modelMatrix.rotate(angle, 0, 1, 0);   // angle orientation if required

    pushMatrix(modelMatrix);
    modelMatrix.translate(-4, 4, 0);
    modelMatrix.scale(92, 12, 0.25);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function makeWall (gl, u_ModelMatrix, u_NormalMatrix, angle, x, y, z) {

  modelMatrix.setTranslate(x, y, z);
  modelMatrix.rotate(angle, 0, 1, 0);   // angle orientation if required

  var n = initVertexBuffers(gl, colourBlock(1, 1, 1));

  // lower panel above window
  pushMatrix(modelMatrix);
  modelMatrix.scale(100, 4, 0.25);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // upper panel above window
  pushMatrix(modelMatrix);
  modelMatrix.scale(100.0, 4, 0.25);
  modelMatrix.translate(0.0, 2, 0.0);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // colour the middle pannels differently
  var n = initVertexBuffers(gl, colourBlock(1, 1, 0));

  // panels inbetween windows
  pushMatrix(modelMatrix);
  modelMatrix.scale(40, 4, 0.25);
  modelMatrix.translate(0.75, 1, 0);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
  modelMatrix.scale(40, 4, 0.25);
  modelMatrix.translate(-0.75, 1, 0);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function makeRoof (gl, u_ModelMatrix, u_NormalMatrix, x, y, z) {

  var n = initVertexBuffers(gl, colourBlock(1, 1, 1));

  modelMatrix.setTranslate(x, y, z);

  pushMatrix(modelMatrix);
  modelMatrix.scale(100.0, 0.25, 100.0);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function makeFloor (gl, u_ModelMatrix, u_NormalMatrix, x, y, z) {

  var n = initVertexBuffers(gl, colourBlock(0.521,0.521,0.521));

  modelMatrix.setTranslate(x, y, z);

  pushMatrix(modelMatrix);
  modelMatrix.scale(100.0, 0.25, 100.0);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

}

function makeTable (gl, u_ModelMatrix, u_NormalMatrix, x, y ,z) {

  var n = initVertexBuffers(gl, colourBlock(1, 1, 0));

  modelMatrix.setTranslate(x, y, z);

  // Model the table top
  pushMatrix(modelMatrix);
  modelMatrix.scale(4.0, 0.5, 4.0);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the table front right leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(-1.75, -1.5, 1.75);
  modelMatrix.scale(0.5, 3.25, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the table front left leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(1.75, -1.5, 1.75);
  modelMatrix.scale(0.5, 3.25, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the table back right leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(-1.75, -1.5, -1.75);
  modelMatrix.scale(0.5, 3.25, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the table back left leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(1.75, -1.5, -1.75);
  modelMatrix.scale(0.5, 3.25, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function makeChair (gl, u_ModelMatrix, u_NormalMatrix, x, y ,z, orientation) {

  var n = initVertexBuffers(gl, colourBlock(1, 0, 1));

  modelMatrix.setTranslate(x, y, z);  // translation to place the chair somewhere in the room

  // Model the chair seat
  pushMatrix(modelMatrix);
  modelMatrix.scale(2.0, 0.5, 2.0);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the chair back
  pushMatrix(modelMatrix);
  modelMatrix.rotate(orientation, 0, 1, 0);       // orientation defines in which direction the chair faces
  modelMatrix.translate(0, 1.25, -0.75);
  modelMatrix.scale(2.0, 2.0, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the chair front right leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(-0.75, -1.25, 0.75);
  modelMatrix.scale(0.5, 2.0, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the chair front left leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(0.75, -1.25, 0.75);
  modelMatrix.scale(0.5, 2.0, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the chair back right leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(-0.75, -1.25, -0.75);
  modelMatrix.scale(0.5, 2.0, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the chair back left leg
  pushMatrix(modelMatrix);
  modelMatrix.translate(0.75, -1.25, -0.75);
  modelMatrix.scale(0.5, 2.0, 0.5);
  drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

}

function drawbox(gl, u_ModelMatrix, u_NormalMatrix, n) {

    pushMatrix(modelMatrix);

    // Pass the model matrix to the uniform variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Calculate the normal transformation matrix and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

    // Draw the cube
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    modelMatrix = popMatrix();
}
