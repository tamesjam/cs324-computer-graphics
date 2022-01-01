import THREE from "./node_modules/three/build/three.min.js";
// import GLTFLoader from "./node_modules/three/examples/js/loaders/GLTFLoader.js";
// import OrbitControls from "./node_modules/three/examples/js/controls/OrbitControls.js";
// import CANNON from "./node_modules/cannon/build/cannon.js";

var CANNON = document.getElementById('cannon').getAttribute("data-search");
var GLTFLoader = document.getElementById('gltf').getAttribute("data-search");
var CANNON = document.getElementById('orbit').getAttribute("data-search");

var camera, dynamic_view, top_view, fixed_view; 
var renderer;
var scene, plane, model_light;
var skybox, skyboxArray = [];
var sunlight;
var controls, controlKeys = {};

var game_music, sound_success, sound_fail;
// blender models/animations
var loader; 
var car_model, tree_model, tyre_wall, finish_line;
var mixer, actions, anims;

var main_menu = true, fog = false, race_started = false, esc = false;

var clock = new THREE.Clock();
var elapsed = 0;

var audioContext, animations, action, action1;

var rotation = 0; // Rotation amount during main menu

// // Initialise car's initial position
var x_car = -9500;
var y_car = 34;
var z_car = -6900;


const fixed_x = 0;
const fixed_y = 8000;
const fixed_z = 13000;

// Speed (rate of increase to car position)
var increment = 0;
var steering = 0;

// Road resistance, decrements 'increment' variable
const FORWARD_RESISTANCE = 0.3;
const BACKWARDS_RESISTANCE = 0.35;

// TESTING THIRD PERSON VIEW
var mesh, goal, follow;

var time = 0;
var newPosition = new THREE.Vector3();
var matrix = new THREE.Matrix4();

var temp = new THREE.Vector3;
var dir = new THREE.Vector3;
var a = new THREE.Vector3;
var b = new THREE.Vector3;
var coronaSafetyDistance = 3000;
var velocity = 0.0;
var speed = 0.0;

var speedometer, dashboard, times, view, leaderboard, leaderboard_title, lap_times, lap_number = 0, race_started_text, level_one, level_two, level_three, outsideMap1;

var sight_lap;

// Cannon.js variables
var cannon_world;
var cannon_plane;
var boxMesh;
var boxBody;
var bbox;

var helper;


var l1 = true, l2 = true, l3 = true;

init();
animate();

function init() {
initCameras();
initRenderer();
initControls();
initScenePlane();
initSkybox();
initLights();
initSounds();
initModels();

innitCannon();
createBox();

// Set the main menu - pause game/read instructions
const blocker = document.getElementById( 'blocker' );
const click = document.getElementById( 'click' );
const how_play = document.getElementById('how_play');
const instructions = document.getElementById('instructions');
const sighting_lap = document.getElementById('sighting_lap');
const yes = document.getElementById('yes');
const no = document.getElementById('no');

speedometer = document.getElementById('speedometer');
dashboard = document.getElementById('dashboard');
times = document.getElementById('times');
view = document.getElementById('view');
lap_times = document.getElementById('lap_times');
leaderboard = document.getElementById('leaderboard');
leaderboard_title = document.getElementById('leaderboard_title')

race_started_text = document.getElementById('race_started');
level_one = document.getElementById('level_one');
level_two = document.getElementById('level_two');
level_three = document.getElementById('level_three');
outsideMap1 = document.getElementById('outsideMap');

// Event listeners for keyboard/resize events
document.addEventListener("keydown", keydown, false);
document.addEventListener("keyup", keyup, false);
window.addEventListener( 'resize', onWindowResize );

click.addEventListener('click', function() {
  click.style.display = 'none';
  sighting_lap.style.display = 'flex';
});

yes.addEventListener('click', function() {
  sight_lap = true;
  blocker.style.display = 'none';
  main_menu = false;
  game_music.play();
})

no.addEventListener('click', function() {
  sight_lap = false;
  blocker.style.display = 'none';
  main_menu = false;
  game_music.play();
})

// Add the objects to the scene
scene.add(skybox);
// scene.add(plane);
scene.add(sunlight);
scene.add(model_light);
scene.add(finish_line);
scene.add(game_music);
scene.add(sound_success);
scene.add(sound_fail);

animate();
}

function updatePhysics() {
var delta = clock.getDelta();
cannon_world.step(1/60);

boxMesh.position.set(
  boxBody.position.x,
  boxBody.position.y,
  boxBody.position.z
)

boxMesh.quaternion.set(
  boxBody.quaternion.x,
  boxBody.quaternion.y,
  boxBody.quaternion.z
)

}

function animate() {
requestAnimationFrame(animate);
updatePhysics();

// For model animation purposes
var delta = clock.getDelta();
if(mixer !== undefined) {
  mixer.update(delta);
};

// Dashboard speedometer display - change colour when top speed reached
speedometer.innerHTML = (Math.round(increment)) + " mph";
if(increment == 80) {
  speedometer.style.color = 'red';
}else {
  speedometer.style.color = 'white';
}

// Dashboard timing display for lap times
if(!race_started) {
  times.style.color = 'red';
  times.innerHTML = "Head to the start line to begin racing!"
}else if(race_started){
  times.style.color = 'white';
  if(sight_lap) {
    times.innerHTML = "(Practice) Lap Time: " + clock.elapsedTime.toFixed(2) + " secs";
  }else {
    times.innerHTML = "Lap Time: " + clock.elapsedTime.toFixed(2) + " secs";
  }
}

if(insideFinishLine(car_model.position)) {
  if(!race_started) {
    race_started = true;
    lap_number++;
    clock.start();
    fadeIn();

    if(sight_lap) {
      race_started_text.innerHTML = "FIRST PRACTICE LAP"
      race_started_text.style.color = "yellow";
    }else {
      race_started_text.innerHTML = "RACE STARTED"
      race_started_text.style.color = "green";
    }
  }else if(clock.elapsedTime > 2){
    race_started = false;
    clock.stop();

    if(!sight_lap) {
      if(clock.elapsedTime < 35 && l1) {
        level_one.style.color = 'green';
        level_two.style.display = 'block';
        l1 = false;
        sound_success.play();
        scene.fog = new THREE.Fog( 0xffffff, 100, 10000 );

      }else if(clock.elapsedTime < 30 && l2) {
        level_two.style.color = 'green';
        level_three.style.display = 'block';
        l2 = false;
        sound_success.play();
        scene.fog = new THREE.Fog( 0xffffff, 6, 7000);

      }else if(clock.elapsedTime < 28 && l3) {
        level_three.style.color = 'green';
        l3 = false;
        sound_success.play();

      }else if(!l1 && !l2 && !l3){
        sound_success.play();
      }else {
        sound_fail.play();
      }

      if(!l1 && !l2 && !l3){
        scene.fog = new THREE.Fog(0xffffff, 0.1, 0);
      }
    }

      var div = document.createElement('div');
      if(sight_lap) {
        div.innerHTML += "Practice "
      }
      div.innerHTML += "Lap (" + lap_number + ")    " + clock.elapsedTime.toFixed(4) + " s";
      lap_times.appendChild(div);

    sight_lap = false;
  }
}

// Check and display warning if vehicle is out of bounds of plane
if(!insideMap(car_model.position)) {
  outsideMap1.style.visibility = 'visible';
}else {
  outsideMap1.style.visibility = 'hidden';
}

// console.log(main_menu);

if(main_menu) { // Display rotational view whilst in main menu
    rotation += 0.0085;
    camera.position.x = Math.sin(rotation) * 9000;
    camera.position.y = 2000;
    camera.position.z = Math.cos(rotation) * 9000;
    camera.lookAt(new THREE.Vector3(0 , 0, 0));

    // Remove dashboard/leaderboard from user view
    dashboard.style.display = 'none';
    leaderboard.style.display = 'none';
}else {
    dashboard.style.display = 'block';
    leaderboard.style.display = 'block';

    if(camera == dynamic_view) { // Third person view
      controls.enabled = true;
      a.lerp(car_model.position, 0.8);
      b.copy(goal.position);

      dir.copy(a).sub(b).normalize();
      const dis = a.distanceTo( b ) - coronaSafetyDistance;
      goal.position.addScaledVector( dir, dis );
      goal.position.lerp(temp, 0.02);
      temp.setFromMatrixPosition(follow.matrixWorld);

      camera.lookAt(car_model.position.x, car_model.position.y, car_model.position.z);
    }else if(camera == fixed_view) {
      controls.enabled = false;
      var relativeCameraOffset = new THREE.Vector3(20, 7, 0);
      var cameraOffset = car_model.localToWorld(relativeCameraOffset);

      camera.position.copy(cameraOffset);
      camera.lookAt(car_model.position.x, car_model.position.y + 200, car_model.position.z);
      // console.log(car_model.position);
    }else if(camera == top_view) { // Free view
      controls.enabled = false;
      camera.position.set(fixed_x, fixed_y, fixed_z);
      camera.lookAt(50,0,-55);
    }

    if(increment > 0.2 || increment < -0.2) {
      action.play();
      action1.play();
    }else {
      action.stop();
      action1.stop();
    }

    if(controlKeys["w"] || (controlKeys["w"] && controlKeys["a"]) || (controlKeys["w"] && controlKeys["d"])) {
      if(increment < 20) { // From stationary
        increment += 0.25;
      }else {
        increment += 0.38;
      }
    }

    // console.log(increment)
    if(!controlKeys["w"] && increment > 0.2) {
      increment -= FORWARD_RESISTANCE;
    }else if(!controlKeys["s"] && increment < 0) {
      increment += BACKWARDS_RESISTANCE;
    }else if(increment >= -0.2 && increment <= 0.2){ // Standstill
      increment = 0;
    }

    velocity += ( increment - velocity ) * 0.3;
    car_model.translateX( -velocity );

    // Steering for the car - only when moving and in correct direction when going forwards/backwards
    if (controlKeys.a && increment > 0.1) {
      car_model.rotateY(steering);
    }else if(controlKeys.d && increment > 0.1){
      car_model.rotateY(-steering);
    }else if (controlKeys.a && increment < -0.1) {
      car_model.rotateY(-steering);
    }else if(controlKeys.d && increment < -0.1){
      car_model.rotateY(steering);
    }

    if(controlKeys["s"] || (controlKeys["s"] && controlKeys["a"]) || (controlKeys["s"] && controlKeys["d"])) {
      if(increment == 0) { // From stationary
        increment -= 0.7;
      }else {
        increment -= 0.5;
      }
    }

    if(controlKeys["a"] || controlKeys["d"]) {
      if(increment < 18) {
        steering = 0.01;
      }else {
        steering += 0.0022;

      }
    }

    if (increment > 80) increment = 80;
    if (increment < -40) increment = -40;

    if(steering > 0.035) steering = 0.037;
}

// bodyBox.position.set(car_model.position);
// console.log(bodyBox.position);

render();
}

function render() {
controls.update();
// helper.update();
renderer.render(scene,camera);
}

function keydown(e) {
if(!main_menu) {
  var key = e.code.replace('Key', '').toLowerCase();

  // Switching between camera views
  if(key == "digit1") {
    camera = dynamic_view;
    view.innerHTML = "Dynamic View"
  }else if(key == "digit2") {
    camera = fixed_view;
    view.innerHTML = "Third Person View"
  }else if(key == "digit3") {
    camera = top_view;
    view.innerHTML = "Birds-eye View"
  }

  // Keydown events for WASD keys
  if(controlKeys[key] !== undefined) {
    controlKeys[key] = true; // Set whichever key pressed to TRUE
    
  }
}
}

function keyup(e) {
var key = e.code.replace('Key', '').toLowerCase();
if ( controlKeys[key] !== undefined ){
    controlKeys[key] = false;
    action.stop();

    // Releasing a/d keys restores initial steering position
    if(!controlKeys["a"] || !controlKeys["d"]) {
      steering = 0;
    }
}
}

function fadeIn(){
leaderboard.style.opacity = 0.85;
leaderboard.style.transition = "linear 0.35s";
}

function insideMap(car_position) {
return (
  car_position.x > -13711 && car_position.x < 14000 && 
  car_position.z > -9630 && car_position.z < 9500
)
}

function insideFinishLine(car_position) {
if(car_model.position.x >= -2700 && car_model.position.x <= -2500 && car_model.position.z > -8510 && car_model.position.z < -6000) {
  return true;
}else {
  return false;
}
}

function initCameras() {
// Set initial camera position in world coordinates
var x_camera = 900;
var y_camera = 600;
var z_camera = 0;
var camera_vector = new THREE.Vector3(x_camera, y_camera, z_camera);

// Set inital look-at position vector
var x_look = -600;
var y_look = 0;
var z_look = -80;
var look_vector = new THREE.Vector3(x_look, y_look, z_look);

// Set the cameras up - third-person and top-down view
dynamic_view = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100000);
top_view = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100000);
fixed_view = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100000);

camera = dynamic_view; // Initial camera set up is third-person view
}

function initRenderer() {
// Set the WebGL Renderer
renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio * 0.7);
document.body.appendChild(renderer.domElement);

renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = false;
renderer.shadowMapSoft = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.documentElement.style.overflow = 'hidden';
document.body.sroll = "none";
}

function initControls() {
// Initialise car movement key parameters
controlKeys = {
  w: false,
  s: false,
  d: false,
  a: false
};

// Set the controls, Orbit for zooming/rotating/panning
controls = new THREE.OrbitControls(camera, renderer.domElement);

controls.addEventListener( 'lock', function () {
  click.style.display = 'none';
  blocker.style.display = 'none';
});

controls.rotateSpeed *= 0.3;
controls.minDistance = 1000;
controls.maxDistance = 100000;
controls.zoomSpeed = 7;
controls.enableDamping = true;
controls.dampingFactor = 0.25;

controls.maxPolarAngle = Math.PI * 0.48;

controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
}
}

function initScenePlane() {
// Setting the scene
scene = new THREE.Scene();

// Setting the plane's size/texture/properties
var texture = new THREE.TextureLoader().load('assets/images/racetrack.jpg');
var geometry = new THREE.PlaneGeometry(28000, 20000, 1, 1);
var material = new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture});

// plane = new THREE.Mesh(geometry, material);
// plane.material.map.wrapS = THREE.RepeatWrapping;
// plane.material.map.wrapT = THREE.RepeatWrapping;
// plane.material.map.encoding = THREE.sRGBEncoding;
// plane.castShadow = true;
// plane.receiveShadow = true;
// plane.rotation.x = -Math.PI / 2;

// Adding light to the car model
model_light = new THREE.HemisphereLight(0xffffff, 0x000000, 0.15);
}

function initSkybox() {
// Set the skybox background setting - load 6 faces of box
const texture_ft = new THREE.TextureLoader().load( 'image/humble_ft.jpg');
const texture_bk = new THREE.TextureLoader().load( 'image/humble_bk.jpg');
const texture_up = new THREE.TextureLoader().load( 'image/humble_up.jpg');
const texture_dn = new THREE.TextureLoader().load( 'image/humble_dn.jpg');
const texture_rt = new THREE.TextureLoader().load( 'image/humble_rt.jpg');
const texture_lf = new THREE.TextureLoader().load( 'image/humble_lf.jpg');
  
skyboxArray.push(new THREE.MeshBasicMaterial( { map: texture_ft }));
skyboxArray.push(new THREE.MeshBasicMaterial( { map: texture_bk }));
skyboxArray.push(new THREE.MeshBasicMaterial( { map: texture_up }));
skyboxArray.push(new THREE.MeshBasicMaterial( { map: texture_dn }));
skyboxArray.push(new THREE.MeshBasicMaterial( { map: texture_rt }));
skyboxArray.push(new THREE.MeshBasicMaterial( { map: texture_lf }));

for (let i = 0; i < 6; i++) {
   skyboxArray[i].side = THREE.BackSide;
}

const skyboxGeo = new THREE.BoxGeometry( 43000, 43000, 43000);
skybox = new THREE.Mesh( skyboxGeo, skyboxArray );
}

function initLights() {
// Set the lights
sunlight = new THREE.DirectionalLight( 0xffffff, 1);
sunlight.position.set( 15000, 10000, 6000 );
sunlight.castShadow = true;
sunlight.shadow.mapSize.width = 2048;
sunlight.shadow.mapSize.height = 1024;
sunlight.shadow.camera.near = 0.1;2
sunlight.shadow.camera.far = 35000;
sunlight.shadow.camera.fov = 60;
sunlight.shadow.camera.left = -14000; // fit light to plane
sunlight.shadow.camera.right = 14000;
sunlight.shadow.camera.top = 8000;
sunlight.shadow.camera.bottom = -9000;
sunlight.shadow.radius = 6;
}

function initSounds() {
getAudioContext();

const audioListener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();

game_music = new THREE.Audio(audioListener);
sound_success = new THREE.Audio(audioListener);
sound_fail = new THREE.Audio(audioListener);

audioLoader.load('./assets/sounds/travis.mp3', function(buffer) {
  game_music.setBuffer(buffer);
  game_music.setLoop(true);
  game_music.setVolume(0.2);
},  function ( xhr ) {
    // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
  }, function ( err ) {
    console.log('An error occured');
  }
);

audioLoader.load('./assets/sounds/sound_lap.mp3', function(buffer) {
  sound_success.setBuffer(buffer);
  sound_success.setLoop(false);
  sound_success.setVolume(0.5);
},  function ( xhr ) {
    // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
  }, function ( err ) {
    console.log('An error occured');
  }
);

audioLoader.load('./assets/sounds/fail.mp3', function(buffer) {
  sound_fail.setBuffer(buffer);
  sound_fail.setLoop(false);
  sound_fail.setVolume(0.5);
},  function ( xhr ) {
    // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
  }, function ( err ) {
    console.log('An error occured');
  }
);
}

function initModels() {
// Loading models
loader = new THREE.GLTFLoader();

loader.load('./assets/blender/car_blend_final.glb', function (gltf) {
  car_model = gltf.scene;
  car_model.scale.set(75, 75, 75);
  car_model.traverse(c => {
    c.castShadow = true;
  });

  // Set the car's intitial position
  car_model.position.x = x_car;
  car_model.position.y = y_car;
  car_model.position.z = z_car;
  car_model.rotateY(THREE.MathUtils.degToRad(180));

  car_model.animations = gltf.animations;

  mixer = new THREE.AnimationMixer(car_model);
  action = mixer.clipAction(gltf.animations[1]);
  action1 = mixer.clipAction(gltf.animations[2]);

  goal = new THREE.Object3D; // Used in camera following
  follow = new THREE.Object3D;
  follow.position.x = -50;
  car_model.add(follow);
  goal.add(camera);
  
  // scene.add(car_model);



  // var geometry = new THREE.BufferGeometry().setFromPoints(car_model.Cylinder.geometry);
  // var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
  // let box = new THREE.Mesh(geometry, material);
  // box.position.set(x_car, y_car, z_car);
  // scene.add(box);

  scene.add(car_model);
});

loader.load('./assets/blender/tree.glb', function (gltf) {
  tree_model = gltf.scene;
  tree_model.scale.set(800, 800, 800);
  tree_model.traverse(c => {
    c.castShadow = true;
  });

  for(var i = 3000; i <= 27000; i+= 2000) {
    var duplicate0 = tree_model.clone();
    var duplicate2 = tree_model.clone();

    duplicate0.position.set(-14000 + i, -100, -10500); // top

    duplicate2.position.set(-14000 + i, -100, 8600); // bottom
    scene.add(duplicate0);
    scene.add(duplicate2);
  }

  for(var i = 3000; i <= 19000; i+= 2000) {
    var duplicate1 = tree_model.clone(); // left
    var duplicate3 = tree_model.clone(); // right

    duplicate1.rotateY(THREE.MathUtils.degToRad(90)); // left
    duplicate1.position.set(-14500, -100, -12000 + i);

    duplicate3.rotateY(THREE.MathUtils.degToRad(90)); // left
    duplicate3.position.set(12500, -100, -12000 + i);
    scene.add(duplicate1);
    scene.add(duplicate3);
  }
});

loader.load('./assets/blender/tyre_wall.glb', function (gltf) {
  tyre_wall = gltf.scene;
  tyre_wall.scale.set(60, 60, 60);
  tyre_wall.traverse(c => {
    c.castShadow = true;
  });

  var z_increment = 0;
  for(var i = 200; i <= 4100; i+= 1300) {
    var duplicate0 = tyre_wall.clone();
    duplicate0.rotateY(THREE.MathUtils.degToRad(100));
    duplicate0.position.set(-13000 + i, 0, -1750 - z_increment);
    z_increment += 200;
    scene.add(duplicate0);
  }

  for(var i = 1000; i <= 16600; i+= 1200) {
    var duplicate0 = tyre_wall.clone();
    duplicate0.rotateY(THREE.MathUtils.degToRad(90));
    duplicate0.position.set(-10000 + i, 0, -6050);
    scene.add(duplicate0);
  }

  for(var i = 1000; i <= 9400; i+= 1200) {
    var duplicate0 = tyre_wall.clone();
    duplicate0.rotateY(THREE.MathUtils.degToRad(90));
    duplicate0.position.set(-5000 + i, 0, 6100);
    scene.add(duplicate0);
  }

  z_increment = 0;
  for(var i = 200; i <= 1500; i+= 1300) {
    var duplicate0 = tyre_wall.clone();
    duplicate0.rotateY(THREE.MathUtils.degToRad(85));
    duplicate0.position.set(9300 + i, 0, -550 + z_increment);
    scene.add(duplicate0);
    z_increment += 100;
  }
});

loader.load('./assets/blender/barrier.glb', function (gltf) {
    var barrier = gltf.scene;
    barrier.scale.set(300, 340, 350);
    barrier.traverse(c => {
      c.castShadow = true;
      c.receiveShadow = true;
    });

    var z_increment = 0;
    for(var i = 200; i <= 2000; i+= 200) {
      var duplicate0 = barrier.clone();
      duplicate0.rotateY(THREE.MathUtils.degToRad(-67));
      duplicate0.position.set(-2800 - i, 0, -1200 - i - z_increment);
      scene.add(duplicate0);
      z_increment += 260;
    }

    z_increment = 0;
    for(var i = 200; i <= 2700; i+= 500) {
      var duplicate0 = barrier.clone();
      duplicate0.rotateY(THREE.MathUtils.degToRad(-32));
      duplicate0.position.set(300 - i, 0, 800 - i + z_increment);
      scene.add(duplicate0);
      z_increment += 190;
    }

    z_increment = 0;
    for(var i = 200; i <= 1280; i+= 120) {
      var duplicate0 = barrier.clone();
      duplicate0.rotateY(THREE.MathUtils.degToRad(-75));
      duplicate0.position.set(300 + i, 0, 1300 - i + z_increment);
      scene.add(duplicate0);
      z_increment += 600;
    }

    z_increment = 0;
    for(var i = 200; i <= 220; i+= 5) {
      var duplicate0 = barrier.clone();
      duplicate0.rotateY(THREE.MathUtils.degToRad(-90));
      duplicate0.position.set(8300 + i, 0, 7100 - i + z_increment);
      scene.add(duplicate0);
      z_increment += 600;
    }

});

loader.load('./assets/blender/street_lamp.glb', function (gltf) {
  var street_lamp = gltf.scene;
  street_lamp.scale.set(85, 115, 85);
  street_lamp.traverse(c => {
    c.castShadow = true;
    c.receiveShadow = true;
  });

  for(var i = 0; i <= 15000; i+= 3000) {
    var duplicate0 = street_lamp.clone();
    duplicate0.position.set(-8500 + i, 0, -5700);
    duplicate0.rotateY(THREE.MathUtils.degToRad(90));

    var duplicate1 = street_lamp.clone();
    duplicate1.position.set(-8500 + i, 0, -5700);
    duplicate1.rotateY(THREE.MathUtils.degToRad(270));

    var spotlight = new THREE.PointLight(0xffffff, 0.4);
    var spotlight1 = new THREE.PointLight(0xffffff, 0.4);

    spotlight.decay = 2;
    spotlight.distance = 10000;
    spotlight1.decay = 2;
    spotlight1.distance = 10000;


    spotlight.position.set( -8500 + i, 1000, -6300 );
    spotlight1.position.set( -8500 + i, 1000, -5100 );
    
    scene.add(duplicate0);
    scene.add(duplicate1);
    // scene.add(spotlight);
    // scene.add(spotlight1);
  }          
});

// Adding a start/finish line for timing
const chequered_texture = new THREE.TextureLoader().load(
  './assets/images/chequered.jpg'
);
const geo = new THREE.BoxGeometry( 500, 11, 2800 );
const mat = new THREE.MeshBasicMaterial({ map: chequered_texture });
finish_line = new THREE.Mesh(geo, mat);
finish_line.position.set(-2000, 0, -7400);
}

function innitCannon() {
cannon_world = new CANNON.World();
cannon_world.gravity.set(0, -9.82, 0);
cannon_world.broadphase = new CANNON.NaiveBroadphase();
cannon_world.solver.iterations = 16;

cannon_plane = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, 0, 0),
  // shape: new CANNON.Box(new CANNON.Vec3(1000, 1000, 1000)),
  shape: new CANNON.Plane(),
  material: new CANNON.Material({friction: 0.05, restitution: 0})
});

cannon_plane.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2)

// plane.userData = cannon_plane;
cannon_world.add(cannon_plane);
}

function createBox() {
var geometry = new THREE.BoxGeometry(1000, 1000, 1000);
var material = new THREE.MeshPhongMaterial({ color: 0xffffff });

boxMesh = new THREE.Mesh(geometry, material);
boxMesh.position.set(0, 2000, 0);
// scene.add(boxMesh);

const boxShape = new CANNON.Box(new CANNON.Vec3(50, 50, 50));
boxBody = new CANNON.Body({
  mass: 100,
  position: boxMesh.position,
  // shape: new CANNON.Box(new CANNON.Vec3(1000,1000,1000)),
  // material: new CANNON.Material({friction: 0.1, restitution: 0})
});
boxBody.addShape(boxShape);

boxMesh.userData = boxBody;
cannon_world.addBody(boxBody);
}

function getAudioContext() {
AudioContext = window.AudioContext || window.webkitAudioContext ;
audioContext = new AudioContext();
audioContext.resume()
}

function onWindowResize() {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();

renderer.setSize( window.innerWidth, window.innerHeight );

}