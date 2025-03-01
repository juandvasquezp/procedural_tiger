var grid;
var next;

var rfGridSize = 600;

var dA = 1;
var dB = 0.5;
var feed = 0.0545;
var k = 0.062;
var dt = 1;

let obj, phongShader, alpha = 8, reactionDiffusionTexture;
let feedSlider, kSlider, dtSlider;
let feedLabel, kLabel, dtLabel;
let clearButton, addPointsButton;

function setup(){
  createCanvas(400, 400, WEBGL);
  obj = loadModel("model.obj", true);
  reactionDiffusionTexture = createGraphics(rfGridSize, rfGridSize);
  noStroke();
  
  phongShader = createShader(phongVert, phongFrag);
  
  // Inicializar la textura de difusión-reacción
  initReactionDiffusion();
  
  // Crear sliders y etiquetas
  feedSlider = createSlider(0.002, 0.12, feed, 0.0001);
  feedSlider.position(10, height + 10);
  feedLabel = createDiv(`Feed: ${feed}`);
  feedLabel.position(200, height + 10);
  
  kSlider = createSlider(0.01413, 0.65534, k, 0.00001);
  kSlider.position(10, height + 40);
  kLabel = createDiv(`k: ${k}`);
  kLabel.position(200, height + 40);
  
  dtSlider = createSlider(0.1, 2, dt, 0.1);
  dtSlider.position(10, height + 70);
  dtLabel = createDiv(`dt: ${dt}`);
  dtLabel.position(200, height + 70);
  
  // Crear botones de limpiar y agregar puntos
  clearButton = createButton('Clear Grid');
  clearButton.position(10, height + 100);
  clearButton.mousePressed(initReactionDiffusion  );
  
  addPointsButton = createButton('Add Points');
  addPointsButton.position(100, height + 100);
  addPointsButton.mousePressed(addPoints);
  
  // Llamar a las funciones de limpiar y agregar puntos al inicio
}

function draw() {
  background(51);
  orbitControl();
  
  // Actualizar los valores de las variables con los sliders
  feed = feedSlider.value();
  k = kSlider.value();
  dt = dtSlider.value();
  
  // Actualizar las etiquetas con los valores actuales
  feedLabel.html(`Feed: ${feed}`);
  kLabel.html(`k: ${k}`);
  dtLabel.html(`dt: ${dt}`);
  
  // Actualizar la textura de difusión-reacción
  updateReactionDiffusion();
  
  scale(1, -1, 1);
  shader(phongShader);
  phongShader.setUniform("sTexture", reactionDiffusionTexture);
  
  phongShader.setUniform("uLightDir", [
    map(mouseX, 0, width, -1, 1),
    map(mouseY, 0, height, -1, 1),
    1.0
  ]);
  phongShader.setUniform("uAlpha", alpha);
  phongShader.setUniform("uCd", [1, 1, 1]);
  model(obj);
}

function initReactionDiffusion() {
  reactionDiffusionTexture.pixelDensity(1);
  grid = [];
  next = [];
  for (var x = 0; x < reactionDiffusionTexture.width; x++) {
    grid[x] = [];
    next[x] = [];
    for (var y = 0; y < reactionDiffusionTexture.height; y++) {
      grid[x][y] = { a: 1, b: 0 };
      next[x][y] = { a: 1, b: 0 };
    }
  }
}

function addPoints() {
  let radius = 2; // Radius of the points to be added
  for (var i = 0; i < 1500; i++) {
    var x = floor(random(reactionDiffusionTexture.width));
    var y = floor(random(reactionDiffusionTexture.height));
    for (var dx = -radius; dx <= radius; dx++) {
      for (var dy = -radius; dy <= radius; dy++) {
        var nx = x + dx;
        var ny = y + dy;
        if (nx >= 0 && nx < reactionDiffusionTexture.width && ny >= 0 && ny < reactionDiffusionTexture.height) {
          grid[nx][ny].a = 0;
          grid[nx][ny].b = 1;
        }
      }
    }
  }
}

function updateReactionDiffusion() {
  reactionDiffusionTexture.background(51);

  for (var x = 1; x < reactionDiffusionTexture.width - 1; x++) {
    for (var y = 1; y < reactionDiffusionTexture.height - 1; y++) {
      var a = grid[x][y].a;
      var b = grid[x][y].b;
      next[x][y].a = a +
        (dA * laplaceA(x, y)) -
        (a * b * b) +
        (feed * (1 - a)) * dt;
      next[x][y].b = b +
        (dB * laplaceB(x, y)) +
        (a * b * b) -
        ((k + feed) * b) * dt;

      next[x][y].a = constrain(next[x][y].a, 0, 1);
      next[x][y].b = constrain(next[x][y].b, 0, 1);
    }
  }

  reactionDiffusionTexture.loadPixels();
  for (var x = 0; x < reactionDiffusionTexture.width; x++) {
    for (var y = 0; y < reactionDiffusionTexture.height; y++) {
      var pix = (x + y * reactionDiffusionTexture.width) * 4;
      var a = next[x][y].a;
      var b = next[x][y].b;
      var c = floor((a - b) * 255);
      c = constrain(c, 0, 255);
      reactionDiffusionTexture.pixels[pix + 0] = c;
      reactionDiffusionTexture.pixels[pix + 1] = c;
      reactionDiffusionTexture.pixels[pix + 2] = c;
      reactionDiffusionTexture.pixels[pix + 3] = 255;
    }
  }
  reactionDiffusionTexture.updatePixels();

  swap();
}

function laplaceA(x, y) {
  var sumA = 0;
  sumA += grid[x][y].a * -1;
  sumA += grid[x - 1][y].a * 0.2;
  sumA += grid[x + 1][y].a * 0.2;
  sumA += grid[x][y + 1].a * 0.2;
  sumA += grid[x][y - 1].a * 0.2;
  sumA += grid[x - 1][y - 1].a * 0.05;
  sumA += grid[x + 1][y - 1].a * 0.05;
  sumA += grid[x + 1][y + 1].a * 0.05;
  sumA += grid[x - 1][y + 1].a * 0.05;
  return sumA;
}

function laplaceB(x, y) {
  var sumB = 0;
  sumB += grid[x][y].b * -1;
  sumB += grid[x - 1][y].b * 0.2;
  sumB += grid[x + 1][y].b * 0.2;
  sumB += grid[x][y + 1].b * 0.2;
  sumB += grid[x][y - 1].b * 0.2;
  sumB += grid[x - 1][y - 1].b * 0.05;
  sumB += grid[x + 1][y - 1].b * 0.05;
  sumB += grid[x + 1][y + 1].b * 0.05;
  sumB += grid[x - 1][y + 1].b * 0.05;
  return sumB;
}

function swap() {
  var temp = grid;
  grid = next;
  next = temp;
}

const phongVert = `
precision highp float;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;
uniform mat3 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;

void main() {
  vNormal = uNormalMatrix * aNormal;
  
  vec4 modelView = uModelViewMatrix * vec4(aPosition, 1.0);
  
  vPosition = modelView.xyz;
  
  vTexCoord = aTexCoord;
  
  gl_Position = uProjectionMatrix * modelView;
}
`;

const phongFrag = `
precision highp float;

uniform vec3 uLightDir;
uniform vec3 uCd;
uniform float uAlpha;
uniform sampler2D sTexture;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;

void main() {
  vec3 ambient = vec3(0.2);
  
  vec3 cl = vec3(1.0);
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDir);
  
  vec3 diffuse = uCd * cl * max(0.0, dot(normal, lightDir));
  
  vec3 cs = vec3(0.8);
  vec3 eyeDir = normalize(-vPosition);
  vec3 reflected = reflect(-lightDir, normal);
  
  vec3 specular = cs * cl * pow(max(0.0, dot(eyeDir, reflected)), uAlpha);
  
  vec2 uv = vTexCoord;
  vec3 color = (ambient + diffuse + specular) * texture2D(sTexture, uv).rgb;
  gl_FragColor = vec4(color, 1.0);
}
`;