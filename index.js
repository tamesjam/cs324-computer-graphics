import { OrbitControls } from "./node_modules/three/examples/js/controls/OrbitControls.js";
  // ------------------------- Three.js variables -------------------------
  var camera, dynamic_view, top_view, fixed_view; 
  var renderer;
  var scene, plane, model_light;
  var skybox, skyboxArray = [];
  var sunlight;
  var controls, controlKeys = {};

  // audio
  var audioContext, game_music; 
  var idle, accelerate, accelerate1, decelerate, decelerate_low, rev_limiter; 
  var sound_success, sound_fail;

  // blender models/animations
  var loader; 
  var car_model, tree_model, tyre_wall, finish_line;
  var mixer, front_anim, back_anim, front_anim1, back_anim1, steer_left, steer_right;

  // variables for controlling game logic
  var main_menu = true, daytime = false, freeMode = false, fog = false, race_started = false;

  // timing for racing lap times
  var clock = new THREE.Clock();
  var elapsed = 0;

  // camera rotation during main menu
  var rotation = 0;

  // car's initial position
  var x_car = -9500;
  var y_car = 0;
  var z_car = -6900;

  // Fixed birds-eye view look at position
  const FIXED_X = 0;
  const FIXED_Y = 8000;
  const FIXED_Z = 13000;

  // Car steering/velocity factors
  var steering = 0;
  var velocity = 0.0;
  var increment = 0;

  // Road resistance for decrement of 'increment' variable
  const FORWARD_RESISTANCE = 0.24;
  const BACKWARDS_RESISTANCE = 0.28;

  // Third-person camera (https://discourse.threejs.org/t/third-person-follow-camera-with-orbit-controls/18543)
  var mesh, goal, follow;
  var temp = new THREE.Vector3;
  var dir = new THREE.Vector3;
  var a = new THREE.Vector3;
  var b = new THREE.Vector3;
  var coronaSafetyDistance = 3000;

  // HTML elements for heads-up display
  var speedometer, dashboard, times, view, leaderboard, leaderboard_title, lap_times, lap_number = 0;

  // Game levels logic
  var race_started_text, level_one, level_two, level_three, outsideMap1, practice_lap;
  var l1 = true, l2 = true, l3 = true;


  // ------------------------- Cannon.js variables -------------------------
  var cannon_world;
  var cannon_plane;
  var cannonDebug;

  var carMesh;
  var carBody;

  var barrierMesh = [];
  var barrierBody = [];
  var barrierArray = [];

  var tyreMesh = [];
  var tyreBody = [];
  var tyreArray = [];

  init();
  animate();

  function init() {
    var day_or_night = Math.floor(Math.random() * 2);
    daytime = (day_or_night == 0) ? true : false; // set to day time if random variable is 0, else night time

    initCameras();
    initRenderer();
    initControls();
    initScenePlane();
    initSkybox();
    initLights();
    initSounds();
    initHTMLElements();

    // physics engine - cannon.js
    initCannonWorld();
    initModels(); // load blender model and initialise cannonjs on them
    initCannonDebugger();

    // Add the objects to the scene
    scene.add(skybox);
    scene.add(plane);
    scene.add(model_light);
    scene.add(finish_line);
    scene.add(game_music);
    scene.add(idle);
    scene.add(accelerate);
    scene.add(accelerate1)
    scene.add(decelerate);
    scene.add(decelerate_low);
    scene.add(rev_limiter);
    scene.add(sound_success);
    scene.add(sound_fail);

    // Add/remove sunlight source depending on if day/night is chosen
    if(daytime) {
      scene.add(sunlight);
    }

    animate();
  }

  // Rendering the new positions of objects in the THREE scene according to the CANNON physics engine
  function updatePhysics() {
    cannon_world.step(1.0/60.0);

    // Rotate cannon mesh attached to car model when steering (rotation)
    if (controlKeys.a && increment > 0.1) {
      carMesh.rotation.y += steering;
      carBody.quaternion.y += steering;
    }else if(controlKeys.d && increment > 0.1){
      carMesh.rotation.y += -steering;
      carBody.quaternion.y += -steering;
    }else if (controlKeys.a && increment < -0.1) {
      carMesh.rotation.y += -steering;
      carBody.quaternion.y += steering;
    }else if(controlKeys.d && increment < -0.1){
      carMesh.rotation.y += steering;
      carBody.quaternion.y += steering;
    }

    // Update cannon mesh data attached to car model when moving
    if(carMesh !== undefined && carBody !== undefined) {
      carMesh.position.set(
        car_model.position.x,
        car_model.position.y,
        car_model.position.z
      )

      carBody.position.set(
        carMesh.position.x,
        carMesh.position.y,
        carMesh.position.z
      )


      carBody.quaternion.set(
        carMesh.quaternion.x,
        carMesh.quaternion.y,
        carMesh.quaternion.z,
        carMesh.quaternion.w
      )
    }

    // Update cannon mesh data attached to the barrier model (during collisions)
    for(var i = 0; i < barrierMesh.length; i++) {
      barrierArray[i].position.set(
        barrierBody[i].position.x,
        barrierBody[i].position.y,
        barrierBody[i].position.z
      )

      barrierArray[i].quaternion.set(
        barrierBody[i].quaternion.x,
        barrierBody[i].quaternion.y,
        barrierBody[i].quaternion.z,
        barrierBody[i].quaternion.w,
      )

      barrierMesh[i].position.set(
        barrierBody[i].position.x,
        barrierBody[i].position.y,
        barrierBody[i].position.z
      )
    }

    // Update cannon mesh data attached to the tyre model (during collisions)
    for(var i = 0; i < tyreMesh.length; i++) {
      tyreArray[i].position.set(
        tyreBody[i].position.x,
        tyreBody[i].position.y - 200,
        tyreBody[i].position.z
      )

      tyreArray[i].quaternion.set(
        tyreBody[i].quaternion.x,
        tyreBody[i].quaternion.y,
        tyreBody[i].quaternion.z,
        tyreBody[i].quaternion.w,
      )

      tyreMesh[i].position.set(
        tyreBody[i].position.x,
        tyreBody[i].position.y,
        tyreBody[i].position.z
      )

      tyreMesh[i].quaternion.set(
        tyreBody[i].quaternion.x,
        tyreBody[i].quaternion.y,
        tyreBody[i].quaternion.z,
        tyreBody[i].quaternion.w,
      )
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    updatePhysics();

    // For model animation purposes
    var delta = clock.getDelta();
    if(mixer !== undefined) {
      mixer.update(delta);
    };

    animateLeaderboardDashboard(); // Updating HTML elements of HUD for speed/lap-times

    // Game Logic for capturing lap times every time car passes finish line
    if(car_model !== undefined) {
      if(insideFinishLine(car_model.position)) {
        if(!race_started) {
          race_started = true;
          lap_number++;
          clock.start();
          fadeIn();

          // Adjust the HUD in HTML when practice lap or not
          if(practice_lap) {
            race_started_text.innerHTML = "FIRST PRACTICE LAP"
            race_started_text.style.color = "yellow";
          }else {
            race_started_text.innerHTML = "RACE STARTED"
            race_started_text.style.color = "green";
          }
        }else if(clock.elapsedTime > 10){
          race_started = false;
          clock.stop();

          if(!practice_lap && !freeMode) {
            if(clock.elapsedTime < 30 && l1) { // Level 1 completion (under 30s)- apply fog
              level_one.style.color = 'green';
              level_two.style.display = 'block';
              l1 = false;
              sound_success.play();
              scene.fog = new THREE.Fog( 0xffffff, 100, 10000 );

            }else if(clock.elapsedTime < 25 && l2) { // Level 2 completion (under 25s)- apply even more fog
              level_two.style.color = 'green';
              level_three.style.display = 'block';
              l2 = false;
              sound_success.play();
              scene.fog = new THREE.Fog( 0xffffff, 3, 5200);

            }else if(clock.elapsedTime < 23 && l3) { // Level 2 completion (under 23s)- remove fog and let driver roam freely
              level_three.style.color = 'green';
              l3 = false;
              sound_success.play();

            }else if(!l1 && !l2 && !l3){
              sound_success.play();
            }else {
              sound_fail.play(); // play fail sound when level is not completed sucessfully
            }

            if(!l1 && !l2 && !l3){
              scene.fog = new THREE.Fog(0xffffff, 0.1, 0);
            }
          }

            var div = document.createElement('div');
            if(practice_lap) {
              div.innerHTML += "Practice "
            }
            div.innerHTML += "Lap (" + lap_number + ")    " + clock.elapsedTime.toFixed(4) + " s";
            lap_times.appendChild(div);

          practice_lap = false;
        }
      }
    }

    // Check and display warning if vehicle is out of bounds of plane
    if(car_model !== undefined) {
      if(!insideMap(car_model.position)) {
        outsideMap1.style.visibility = 'visible';
      }else {
        outsideMap1.style.visibility = 'hidden';
      }
    }

    // console.log(main_menu);

    if(main_menu) { // Display rotational view whilst in main menu
        rotation += 0.0073;
        camera.position.x = Math.sin(rotation) * 9000;
        camera.position.y = 5000;
        camera.position.z = Math.cos(rotation) * 9000;
        camera.lookAt(new THREE.Vector3(0 , 100, 0));

        // Remove dashboard/leaderboard from user view
        dashboard.style.display = 'none';
        leaderboard.style.display = 'none';
    }else {
        dashboard.style.display = 'block';
        leaderboard.style.display = 'block';
        game_music.setVolume(0.038);

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
        }else if(camera == fixed_view) { // Fixed view (behind the car)
          controls.enabled = false;
          var relativeCameraOffset = new THREE.Vector3(20, 8, 0);
          var cameraOffset = car_model.localToWorld(relativeCameraOffset);

          camera.position.copy(cameraOffset);
          camera.lookAt(car_model.position.x, car_model.position.y + 200, car_model.position.z);
        }else if(camera == top_view) { // Top-down view looking down on THREE plane
          controls.enabled = false;
          camera.position.set(FIXED_X, FIXED_Y, FIXED_Z);
          camera.lookAt(50,0,-55);
        }


        // Play car animations according to whether moving forward/backwards
        if(increment > 0) { // Play moving forwards animation
          front_anim.play();
          back_anim.play();
        }else if(increment < 0) { // Play moving backwards animation
          front_anim1.play();
          back_anim1.play();
        }else { // Car is at a stand still i.e. increment = 0
          front_anim.stop();
          back_anim.stop();
          front_anim1.stop();
          back_anim1.stop();

          if(accelerate.isPlaying) {
            accelerate.stop();
          }
          if(decelerate.isPlaying) {
            decelerate.stop();
          }
          if(decelerate_low.isPlaying) {
            decelerate_low.stop();
          }

          if(!idle.isPlaying) {
            idle.play(); // Play idling car sounds when stand still
          }
        }

        // Play rev limiter sounds when car reaches top speed
        if(increment > 79) {
          if(accelerate.isPlaying) {
            accelerate.stop();
          }
          if(accelerate1.isPlaying) {
            accelerate1.stop();
          }
          if(decelerate.isPlaying) {
            decelerate.stop();
          }
          if(decelerate_low.isPlaying) {
            decelerate_low.stop();
          }

          if(!rev_limiter.isPlaying) {
            rev_limiter.play();
          }
        }

        // Play deceleration sounds when 'w' key is lifted up
        if(!controlKeys["w"]) {
          if(accelerate.isPlaying) {
            accelerate.stop();
          }
          if(accelerate1.isPlaying) {
            accelerate1.stop();
          }
          if(rev_limiter.isPlaying) {
            rev_limiter.stop();
          }

          if(increment > 70) {
            if(!decelerate_low.isPlaying) {
              if(!decelerate.isPlaying) {
                decelerate.play();
              }
            }
          }else {
            if(!decelerate.isPlaying) {
              if(!decelerate_low.isPlaying) {
                decelerate_low.play();
              }
            }
          }
        }

        // Adjust the rate of acceleration when 'w' key pressed down
        if(controlKeys["w"] || (controlKeys["w"] && controlKeys["a"]) || (controlKeys["w"] && controlKeys["d"])) {
          if(increment < 65) { 
            increment += 0.23;
          }else { // Above 65 speed, activate turbo speed
            increment += 0.27;
          }
        }

        // Add rolling resistance and naturally slow down vehicle when 'w' key is lifted up
        if(!controlKeys["w"] && increment > 0.2) {
          increment -= FORWARD_RESISTANCE;
        }else if(!controlKeys["s"] && increment < 0) {
          increment += BACKWARDS_RESISTANCE;
        }else if(increment >= -0.2 && increment <= 0.2){ // Standstill
          increment = 0;
        }

        // Adjust the velocity of the car
        velocity += (increment - velocity) * 0.3;
        car_model.translateX(-velocity);

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
            increment -= 0.23;
        }

        // Adjust rate of steering when keys 'a' and 'd' are pressed to steer left/right
        if(controlKeys["a"] || controlKeys["d"]) {
          if(increment < 20) {
            steering = 0.015;
          }else {
            steering += 0.00076;

          }
        }

        if (increment > 80) increment = 80; // Limit the forward speed to 80 mph
        if (increment < -40) increment = -40; // Limit the backwards speed to (-)40 mph
        if(steering > 0.03) steering = 0.03; // Limit the rate of steering
    }

    render();
  }

  function render() {
    controls.update();
    if(cannonDebug !== undefined) {
      // cannonDebug.update(); // Cannon.js debugging purposes
    }
    renderer.render(scene,camera);
  }

  function keydown(e) {
    var key = e.code.replace('Key', '').toLowerCase();
    if(!main_menu) {

      // Keydown events for WASD keys
      if(controlKeys[key] !== undefined) {
        controlKeys[key] = true; // Set whichever key pressed to TRUE
      }

      // Play the car's steering animations
      if(controlKeys["a"]) {
        steer_left.play();
      }else if(controlKeys["d"]) {
        steer_right.play();
      }

      // Play the acceleration sounds when 'w' key is pressed
      if(controlKeys["w"] && increment > 0) {
        if(decelerate.isPlaying) {
          decelerate.stop();
        }
        if(decelerate_low.isPlaying) {
          decelerate_low.stop();
        }
        if(idle.isPlaying) {
          idle.stop();
        }
        if(increment < 30) {
          if(!accelerate.isPlaying) {
            accelerate.play();
          }
        }else {
          if(!accelerate.isPlaying) {
            accelerate1.play();
          }
        }
      }

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

    }else {
      if(key == "escape") { // Adjust HTML elements for the menu to display to user
        if(play_content.style.display == "flex") {
          play_content.style.display = "none";
          click.style.display = "flex"
        }else if(how_play_content.style.display == "flex") {
          how_play_content.style.display = "none";
          click.style.display = "flex"
        }else if(controls_content.style.display == "flex") {
          controls_content.style.display = "none";
          click.style.display = "flex"
        }else if(credits_content.style.display == "flex") {
          credits_content.style.display = "none";
          click.style.display = "flex";
        }else if(campaign_content.style.display == "flex") {
          campaign_content.style.display = "none";
          play_content.style.display = "flex";
        }
      }
    }
  }

  function keyup(e) {
    var key = e.code.replace('Key', '').toLowerCase();
    if(controlKeys[key] !== undefined ){
        controlKeys[key] = false;
    }

    // Releasing a/d keys restores initial steering position and stop steering animations
    if(!controlKeys["a"] || !controlKeys["d"]){
      steering = 0;
      if(steer_left.isPlaying) {
        steer_left.stop();
      }
      if(steer_right.isPlaying) {
        steer_right.stop();
      }
    }
  }

  // Leaderboard fade in transition when car passes finish line for first time
  function fadeIn(){
    leaderboard.style.opacity = 0.85;
    leaderboard.style.transition = "linear 0.35s";
  }

  function animateLeaderboardDashboard() {
    // Dashboard speedometer display - change colour when top speed reached
    speedometer.innerHTML = (Math.round(increment)) + " mph ";
    if(increment >= 80 && controlKeys["w"]){
      speedometer.style.color = 'red';
      speedometer.innerHTML += " (TURBO ACTIVATED)";
    }else {
      speedometer.style.color = 'white';
    }

    // Dashboard timing display for lap times
    if(!l1 && !l2 && !l3) { // All levels completed - present congratulations message
      times.style.color = 'gold';
      times.innerHTML = "CONGRATULATIONS! You completed all the levels!";
    }else if(!race_started) {
      times.style.color = 'red';
      times.innerHTML = "Head to the start line to begin racing!"
    }else if(race_started){
      times.style.color = 'white';
      if(practice_lap) {
        times.innerHTML = "(Practice) Lap Time: " + clock.elapsedTime.toFixed(2) + " secs";
      }else {
        times.innerHTML = "Lap Time: " + clock.elapsedTime.toFixed(2) + " secs";
      }
    }
  }

  // Checks if the car model is within the bounds of the map
  function insideMap(car_position) {
    return (
      car_position.x > -13711 && car_position.x < 14000 && 
      car_position.z > -9630 && car_position.z < 9500
    )
  }

  // Checks if the car model has overlapped with the position of the finish lane
  function insideFinishLine(car_position) {
    if(car_model.position.x >= -2700 && car_model.position.x <= -2500 && car_model.position.z > -9500 && car_model.position.z < -6000) {
      return true;
    }else {
      return false;
    }
  }

  function initCameras() {
    // Set the cameras - dynamic view, top-down view & fixed view
    dynamic_view = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100000);
    top_view = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100000);
    fixed_view = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100000);

    camera = dynamic_view; // Initial camera set up is the dynamic view
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
    controls = new OrbitControls(camera, renderer.domElement);

    controls.rotateSpeed *= 0.3;
    controls.minDistance = 300;
    controls.maxDistance = 8000;
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
    
    plane = new THREE.Mesh(geometry, material);
    plane.material.map.wrapS = THREE.RepeatWrapping;
    plane.material.map.wrapT = THREE.RepeatWrapping;
    plane.material.map.encoding = THREE.sRGBEncoding;
    plane.castShadow = true;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;

    // Adding light to the car model
    model_light = new THREE.HemisphereLight(0xffffff, 0x000000, 0.15);
  }

  function initSkybox() {
    // Set the skybox background setting - load 6 faces of the box
    const texture_ft = new THREE.TextureLoader().load('./assets/images/humble_ft.jpg');
    const texture_bk = new THREE.TextureLoader().load('./assets/images/humble_bk.jpg');
    const texture_up = new THREE.TextureLoader().load('./assets/images/humble_up.jpg');
    const texture_dn = new THREE.TextureLoader().load('./assets/images/humble_dn.jpg');
    const texture_rt = new THREE.TextureLoader().load('./assets/images/humble_rt.jpg');
    const texture_lf = new THREE.TextureLoader().load('./assets/images/humble_lf.jpg');

    var colorSkybox = (daytime == true) ? 0xffffff : 0x363636; // Apply hint of dark grey if night, to the skybox
      
    skyboxArray.push(new THREE.MeshBasicMaterial( {color: colorSkybox, map: texture_ft }));
    skyboxArray.push(new THREE.MeshBasicMaterial( {color: colorSkybox, map: texture_bk }));
    skyboxArray.push(new THREE.MeshBasicMaterial( {color: colorSkybox, map: texture_up }));
    skyboxArray.push(new THREE.MeshBasicMaterial( {color: colorSkybox, map: texture_dn }));
    skyboxArray.push(new THREE.MeshBasicMaterial( {color: colorSkybox, map: texture_rt }));
    skyboxArray.push(new THREE.MeshBasicMaterial( {color: colorSkybox, map: texture_lf }));

    for (let i = 0; i < 6; i++) {
       skyboxArray[i].side = THREE.BackSide;
    }

    const skyboxGeo = new THREE.BoxGeometry(43000, 43000, 43000);
    skybox = new THREE.Mesh( skyboxGeo, skyboxArray );
  }

  function initLights() {
    // Set the primary light source
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
    idle = new THREE.Audio(audioListener);
    accelerate = new THREE.Audio(audioListener);
    accelerate1 = new THREE.Audio(audioListener);
    decelerate = new THREE.Audio(audioListener);
    decelerate_low = new THREE.Audio(audioListener);
    rev_limiter = new THREE.Audio(audioListener);
    sound_success = new THREE.Audio(audioListener);
    sound_fail = new THREE.Audio(audioListener);

    // In-game background music
    audioLoader.load('./assets/sounds/osrs.mp3', function(buffer) {
      game_music.setBuffer(buffer);
      game_music.setLoop(true);
      game_music.setVolume(0.09);
      game_music.play();
    },  function ( xhr ) {
        // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      }, function ( err ) {
        console.log('An error occured');
      }
    );

    // Car idling sound when at a stand still
    audioLoader.load('./assets/sounds/idle.mp3', function(buffer) {
      idle.setBuffer(buffer);
      idle.setLoop(false);
      idle.setVolume(0.23);
    },  function ( xhr ) {
        // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      }, function ( err ) {
        console.log('An error occured');
      }
    );

    // Car acceleration sounds when moving forwards
    audioLoader.load('./assets/sounds/accelerate.mp3', function(buffer) {
      accelerate.setBuffer(buffer);
      accelerate.setLoop(false);
      accelerate.setVolume(0.018);
    },  function ( xhr ) {
        // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      }, function ( err ) {
        console.log('An error occured');
      }
    );

    // (Higher-pitched) car acceleration at higher speeds
    audioLoader.load('./assets/sounds/accelerate1.mp3', function(buffer) {
      accelerate1.setBuffer(buffer);
      accelerate1.setLoop(false);
      accelerate1.setVolume(0.018);
    });

    audioLoader.load('./assets/sounds/decelerate.mp3', function(buffer) {
      decelerate.setBuffer(buffer);
      decelerate.setLoop(true);
      decelerate.setVolume(0.01);
    },  function ( xhr ) {
        // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      }, function ( err ) {
        console.log('An error occured');
      }
    );

    // Car deceleration sounds when deceleration at low speeds
    audioLoader.load('./assets/sounds/decelerate_low.mp3', function(buffer) {
      decelerate_low.setBuffer(buffer);
      decelerate_low.setLoop(true);
      decelerate_low.setVolume(0.01);
    },  function ( xhr ) {
        // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      }, function ( err ) {
        console.log('An error occured');
      }
    );

    // Car deceleration sounds when deceleration at high speeds
    audioLoader.load('./assets/sounds/rev_limiter.mp3', function(buffer) {
      rev_limiter.setBuffer(buffer);
      rev_limiter.setLoop(true);
      rev_limiter.setVolume(0.013);
    },  function ( xhr ) {
        // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      }, function ( err ) {
        console.log('An error occured');
      }
    );

    // Bell sound for successfully completing level
    audioLoader.load('./assets/sounds/sound_lap.mp3', function(buffer) {
      sound_success.setBuffer(buffer);
      sound_success.setLoop(false);
      sound_success.setVolume(0.8);
    },  function ( xhr ) {
        // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      }, function ( err ) {
        console.log('An error occured');
      }
    );

    // Buzzer sound for failing to complete level
    audioLoader.load('./assets/sounds/fail.mp3', function(buffer) {
      sound_fail.setBuffer(buffer);
      sound_fail.setLoop(false);
      sound_fail.setVolume(0.8);
    });
  }

  function initModels() {
    loader = new THREE.GLTFLoader();

    // Import the car model we created in Blender
    loader.load('./assets/blender/car_blend_final.glb', function (gltf) {
      car_model = gltf.scene;
      car_model.scale.set(80, 80, 80);
      car_model.traverse(c => {
        c.castShadow = true;
      });

      // Set the car's intitial position
      car_model.position.x = x_car;
      car_model.position.y = y_car;
      car_model.position.z = z_car;
      car_model.rotateY(THREE.MathUtils.degToRad(180));

      // Load the animations for the car - moving forwards/backwards/steering
      car_model.animations = gltf.animations;

      mixer = new THREE.AnimationMixer(car_model);
      front_anim = mixer.clipAction(gltf.animations[1]);
      back_anim = mixer.clipAction(gltf.animations[3]);

      front_anim1 = mixer.clipAction(gltf.animations[0]);
      back_anim1 = mixer.clipAction(gltf.animations[2]);

      steer_left = mixer.clipAction(gltf.animations[4]);
      steer_left.clampWhenFinished = true;
      steer_left.setLoop(THREE.LoopOnce);
      steer_right = mixer.clipAction(gltf.animations[5]);
      steer_right.clampWhenFinished = true;
      steer_right.setLoop(THREE.LoopOnce);

      goal = new THREE.Object3D; // Third-person camera following the car model
      follow = new THREE.Object3D;
      follow.position.x = -50;
      car_model.add(follow);
      goal.add(camera);
  
      initCannonCar(car_model);

      scene.add(car_model);
    });

    loader.load('./assets/blender/premade/tree.glb', function (gltf) {
      tree_model = gltf.scene;
      tree_model.scale.set(800, 800, 800);
      tree_model.traverse(c => {
        c.castShadow = true;
      });

      // Duplicating the tree model several times - position and place in scene
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

    loader.load('./assets/blender/premade/tyre_wall.glb', function (gltf) {
      tyre_wall = gltf.scene;
      tyre_wall.scale.set(60, 60, 60);
      tyre_wall.traverse(c => {
        c.castShadow = true;
      });

      // Duplicating the tyre model several times - position and place in scene
      for(var i = 0; i <= 31; i++) {
        var duplicate0 = tyre_wall.clone();
        scene.add(duplicate0);
        tyreArray.push(duplicate0); // Push duplicated model into array for placing CANNON mesh to it
      }

      initTyres();
    });

    loader.load('./assets/blender/premade/barrier.glb', function (gltf) {
        var barrier = gltf.scene;
        barrier.scale.set(2600, 340, 350);
        barrier.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
        });
        // ---------------- Centre map barrier 1 ------------------
        barrierArray.push(barrier);
        scene.add(barrier);

        // ---------------- Centre map barrier 2 ----------------
        var duplicate = barrier.clone();
        duplicate.scale.set(1800, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        // ---------------- Centre map barrier 3 ----------------
        duplicate = barrier.clone();
        duplicate.scale.set(2500, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        // ---------------- Bottom right barrier ----------------
        duplicate = barrier.clone();
        duplicate.scale.set(1450, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        // ---------------- Bottom left 1 barrier ----------------
        duplicate = barrier.clone();
        duplicate.scale.set(1900, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        // ---------------- Bottom left 2 barrier ----------------
        duplicate = barrier.clone();
        duplicate.scale.set(1300, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        // ---------------- Top left barrier ----------------
        duplicate = barrier.clone();
        duplicate.scale.set(3000, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        // ---------------- Centre right 1 barrier ----------------
        duplicate = barrier.clone();
        duplicate.scale.set(2100, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        // ---------------- Centre right 2 barrier ----------------
        duplicate = barrier.clone();
        duplicate.scale.set(1700, 340, 350);
        barrierArray.push(duplicate);
        scene.add(duplicate);

        initBarrier();
    });

    loader.load('./assets/blender/premade/street_lamp.glb', function (gltf) {
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

        scene.add(duplicate0);
        scene.add(duplicate1);

        // Add a secondary light source when night time
        if(!daytime) {
          // Add a THREE PointLight at the height of each street lamp
          var pointlight = new THREE.PointLight(0xffffff, 0.2);
          var pointlight1 = new THREE.PointLight(0xffffff, 0.2);

          pointlight.decay = 2;
          pointlight.distance = 10000;
          pointlight1.decay = 2;
          pointlight1.distance = 10000;


          pointlight.position.set( -8500 + i, 1000, -6300 );
          pointlight1.position.set( -8500 + i, 1000, -5100 );

          scene.add(pointlight); 
          scene.add(pointlight1);
        }
      }          
    });

    // Adding a start/finish line for timing
    const chequered_texture = new THREE.TextureLoader().load(
      './assets/images/chequered.jpg'
    );
    const geometry_chequered = new THREE.BoxGeometry( 500, 11, 2800 );
    const material_chequered = new THREE.MeshBasicMaterial({ map: chequered_texture });
    finish_line = new THREE.Mesh(geometry_chequered, material_chequered);
    finish_line.position.set(-2000, 0, -7400);
  }

  function initHTMLElements() {
    // Set the main menu - pause game/read instructions
    const blocker = document.getElementById('blocker');
    const click = document.getElementById('click');

    const play = document.getElementById('play');
    const free_mode = document.getElementById('free_mode');
    const campaign = document.getElementById('campaign');
    const how_play = document.getElementById('how_play');
    const controls = document.getElementById('controls');
    const credits = document.getElementById('credits');

    const play_content = document.getElementById('play_content');
    const campaign_content = document.getElementById('campaign_content');
    const yes = document.getElementById('yes');
    const no = document.getElementById('no');
    const how_play_content = document.getElementById('how_play_content');
    const controls_content = document.getElementById('controls_content');
    const credits_content = document.getElementById('credits_content');

    const challenges = document.getElementById('challenges');

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
    window.addEventListener("resize", onWindowResize);

    // Button event listeners to adjust HTML elements/assign game logic variable values, when clicked
    play.addEventListener('click', function() {
      click.style.display = 'none';
      play_content.style.display = 'flex';
    });

    free_mode.addEventListener('click', function() {
      blocker.style.display = 'none';
      click.style.display = 'none';
      play_content.style.display = 'none';
      challenges.innerHTML = "<u>Free Mode</u>"
      freeMode = true;
      main_menu = false;
    });

    campaign.addEventListener('click', function() {
      // click.style.display = 'none';
      freeMode = false;
      play_content.style.display = 'none';
      campaign_content.style.display = 'flex';
    });

    yes.addEventListener('click', function() {
      practice_lap = true;
      blocker.style.display = 'none';
      main_menu = false;
    });

    no.addEventListener('click', function() {
      practice_lap = false;
      blocker.style.display = 'none';
      main_menu = false;
    });

    how_play.addEventListener('click', function() {
      click.style.display = 'none';
      how_play_content.style.display = 'flex';
    });

    controls.addEventListener('click', function() {
      click.style.display = 'none';
      controls_content.style.display = 'flex';
    });

    credits.addEventListener('click', function() {
      click.style.display = 'none';
      credits_content.style.display = 'flex';
    });

  }

  // Initialising the Cannon.js physics engine (https://www.mrguo.link/article?id=50)
  function initCannonWorld() {
    cannon_world = new CANNON.World();
    cannon_world.gravity.set(0, -9.82 * 130, 0);
    cannon_world.broadphase = new CANNON.NaiveBroadphase();
    cannon_world.solver.iterations = 5;

    cannon_plane = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, -20, 0),
      shape: new CANNON.Box(new CANNON.Vec3(14000, 10000, 20)),
      material: new CANNON.Material({friction: 0.05, restitution: 0})
    });

    cannon_plane.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2)

    plane.userData = cannon_plane; // Assign the data from CANNON to THREE plane
    cannon_world.add(cannon_plane);
  }

  function initCannonCar(car_model) {
    // Create a bounded box surrounding the car model
    var geometry = new THREE.BoxGeometry(800, 400, 400);
    var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    carMesh = new THREE.Mesh(geometry, material);
    carMesh.position.set(x_car, y_car, z_car);

    carBody = new CANNON.Body({
      mass: 100,
      position: carMesh.position,
      shape: new CANNON.Box(new CANNON.Vec3(460, 150, 200)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.5})
    });

    carBody.addEventListener("collide", carCollision);

    carMesh.userData = carBody; // Assign the data from CANNON to THREE mesh
    cannon_world.add(carBody);
  }

  function initBarrier() {
    // Create a bounded box surrounding the barrier model
    var geometry = new THREE.BoxGeometry(5000, 100, 100);
    var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    var b_mesh = new THREE.Mesh(geometry, material);

    // ---------------- Centre map barrier 1 ------------------
    var b_mesh0 = b_mesh.clone();
    b_mesh0.rotateY(THREE.MathUtils.degToRad(-67)); // -67 Degrees!
    b_mesh0.position.set(-3850, 0, -3550);

    var b_body = new CANNON.Body({
      mass: 9000,
      position: b_mesh0.position,
      shape: new CANNON.Box(new CANNON.Vec3(2500, 20, 10)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    // Rotate the CANNON body to match the rotation in the THREE scene
    b_body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(-67));

    b_mesh0.userData = b_body;
    cannon_world.add(b_body);

    barrierMesh.push(b_mesh0);
    barrierBody.push(b_body);

    // ---------------- Centre map barrier 2 ------------------
    var geometry1 = new THREE.BoxGeometry(3500, 100, 100);
    var b_mesh1 = new THREE.Mesh(geometry1, material);

    b_mesh1.rotateY(THREE.MathUtils.degToRad(-31));
    b_mesh1.position.set(-1100, 2, -100);

    var b_body1 = new CANNON.Body({
      mass: 9000,
      position: b_mesh1.position,
      shape: new CANNON.Box(new CANNON.Vec3(1750, 30, 10)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body1.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(-31));

    b_mesh1.userData = b_body1;
    cannon_world.add(b_body1);

    barrierMesh.push(b_mesh1);
    barrierBody.push(b_body1);

    // ---------------- Centre map barrier 3 ------------------
    var geometry2 = new THREE.BoxGeometry(4800, 100, 100);
    var b_mesh2 = new THREE.Mesh(geometry2, material);
    b_mesh2.rotateY(THREE.MathUtils.degToRad(-77));
    b_mesh2.position.set(1100, 2, 3500);

    var b_body2 = new CANNON.Body({
      mass: 9000,
      position: b_mesh2.position,
      shape: new CANNON.Box(new CANNON.Vec3(2400, 30, 10)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body2.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(-77));

    b_mesh2.userData = b_body2;
    cannon_world.add(b_body2);

    barrierMesh.push(b_mesh2);
    barrierBody.push(b_body2);

    // ---------------- Bottom right barrier ----------------
    var geometry3 = new THREE.BoxGeometry(2800, 100, 100);
    var b_mesh3 = new THREE.Mesh(geometry3, material);
    b_mesh3.rotateY(THREE.MathUtils.degToRad(-87));
    b_mesh3.position.set(8450, 2, 8100);

    var b_body3 = new CANNON.Body({
      mass: 9000,
      position: b_mesh3.position,
      shape: new CANNON.Box(new CANNON.Vec3(1400, 30, 23)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body3.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(-87));

    b_mesh3.userData = b_body3;
    cannon_world.add(b_body3);

    barrierMesh.push(b_mesh3);
    barrierBody.push(b_body3);

    // ------------------ Bottom left 1 barrier -----------------------
    var geometry4 = new THREE.BoxGeometry(3800, 100, 100);
    var b_mesh4 = new THREE.Mesh(geometry4, material);
    b_mesh4.rotateY(THREE.MathUtils.degToRad(-74));
    b_mesh4.position.set(-6800, 2, 7500);

    var b_body4 = new CANNON.Body({
      mass: 9000,
      position: b_mesh4.position,
      shape: new CANNON.Box(new CANNON.Vec3(1900, 30, 23)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body4.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(-74));

    b_mesh4.userData = b_body4;
    cannon_world.add(b_body4);

    barrierMesh.push(b_mesh4);
    barrierBody.push(b_body4);

    // ------------------ Bottom left 2 barrier -----------------------
    var geometry5 = new THREE.BoxGeometry(2600, 100, 100);
    var b_mesh5 = new THREE.Mesh(geometry5, material);
    b_mesh5.rotateY(THREE.MathUtils.degToRad(90));
    b_mesh5.position.set(-9700, 2, 3000);

    var b_body5 = new CANNON.Body({
      mass: 9000,
      position: b_mesh5.position,
      shape: new CANNON.Box(new CANNON.Vec3(1300, 30, 23)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body5.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(90));

    b_mesh5.userData = b_body5;
    cannon_world.add(b_body5);

    barrierMesh.push(b_mesh5);
    barrierBody.push(b_body5);

    // ---------------- Top left barrier ----------------
    var geometry6 = new THREE.BoxGeometry(6000, 100, 100);
    var b_mesh6 = new THREE.Mesh(geometry6, material);
    b_mesh6.rotateY(THREE.MathUtils.degToRad(10));
    b_mesh6.position.set(-10000, 2, -2150);

    var b_body6 = new CANNON.Body({
      mass: 9000,
      position: b_mesh6.position,
      shape: new CANNON.Box(new CANNON.Vec3(3000, 30, 10)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body6.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(10));

    b_mesh6.userData = b_body6;
    cannon_world.add(b_body6);

    barrierMesh.push(b_mesh6);
    barrierBody.push(b_body6);

    // ---------------- Centre right 1 barrier ----------------
    var geometry7 = new THREE.BoxGeometry(4200, 100, 100);
    var b_mesh7 = new THREE.Mesh(geometry7, material);
    b_mesh7.rotateY(THREE.MathUtils.degToRad(-67));
    b_mesh7.position.set(3000, 2, 650);

    var b_body7 = new CANNON.Body({
      mass: 9000,
      position: b_mesh7.position,
      shape: new CANNON.Box(new CANNON.Vec3(2100, 30, 10)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body7.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(-67));

    b_mesh7.userData = b_body7;
    cannon_world.add(b_body7);

    barrierMesh.push(b_mesh7);
    barrierBody.push(b_body7);

    // ---------------- Centre right 2 barrier ----------------
    var geometry8 = new THREE.BoxGeometry(1700, 100, 100);
    var b_mesh8 = new THREE.Mesh(geometry8, material);
    b_mesh8.rotateY(THREE.MathUtils.degToRad(145));
    b_mesh8.position.set(700, 1, -2500);

    var b_body8 = new CANNON.Body({
      mass: 9000,
      position: b_mesh8.position,
      shape: new CANNON.Box(new CANNON.Vec3(1700, 30, 30)),
      material: new CANNON.Material({friction: 0.1, restitution: 0.1})
    });

    b_body8.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(145));

    b_mesh8.userData = b_body8;
    cannon_world.add(b_body8);

    barrierMesh.push(b_mesh8);
    barrierBody.push(b_body8);
  } 

  function initTyres() {
    // Create a bounded box surrounding the tyre model
    var geometry = new THREE.BoxGeometry(1400, 300, 300);
    var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    var t_mesh = new THREE.Mesh(geometry, material);

    // ---------------- Top row of tyres ----------------
    for(var i = 1000; i <= 17900; i+= 1300) {
      var t_clone = t_mesh.clone();
      t_clone.rotateY(THREE.MathUtils.degToRad(4.5));
      t_clone.position.set(-10000 + i, 200, -6050);

      var t_body = new CANNON.Body({
        mass: 5000,
        position: t_clone.position,
        shape: new CANNON.Box(new CANNON.Vec3(650, 150, 150)),
        material: new CANNON.Material({friction: 0.1, restitution: 1})
      });

      // Rotate the CANNON body to match the rotation in the THREE scene
      t_body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(4.5));


      t_clone.userData = t_body;
      cannon_world.add(t_body);

      tyreMesh.push(t_clone);
      tyreBody.push(t_body);
    }

    // ---------------- Bottom row of tyres ----------------
    for(var i = 1000; i <= 8500; i+= 1500) {
      var t_clone = t_mesh.clone();
      t_clone.position.set(-4000 + i, 200, 6100);

      var t_body = new CANNON.Body({
        mass: 5000,
        position: t_clone.position,
        shape: new CANNON.Box(new CANNON.Vec3(650, 150, 150)),
        material: new CANNON.Material({friction: 0.1, restitution: 1})
      });

      t_clone.userData = t_body;
      cannon_world.add(t_body);

      tyreMesh.push(t_clone);
      tyreBody.push(t_body);
    }

    // ---------------- Centre right 1 row of tyres ----------------
    for(var i = 1000; i <= 3600; i+= 1300) {
      var t_clone = t_mesh.clone();
      t_clone.position.set(8500 + i, 200, -500);

      var t_body = new CANNON.Body({
        mass: 5000,
        position: t_clone.position,
        shape: new CANNON.Box(new CANNON.Vec3(650, 150, 150)),
        material: new CANNON.Material({friction: 0.1, restitution: 1})
      });

      t_clone.userData = t_body;
      cannon_world.add(t_body);

      tyreMesh.push(t_clone);
      tyreBody.push(t_body);
    }

    // ---------------- Centre right 2 row of tyres ----------------
    var z_increment = 0;
    for(var i = 1000; i <= 2000; i+= 1000) {
      var t_clone = t_mesh.clone();
      t_clone.rotateY(THREE.MathUtils.degToRad(-40));
      t_clone.position.set(5500 + i, 200, -2600 + z_increment);
      z_increment += 900;

      var t_body = new CANNON.Body({
        mass: 5000,
        position: t_clone.position,
        shape: new CANNON.Box(new CANNON.Vec3(650, 150, 150)),
        material: new CANNON.Material({friction: 0.1, restitution: 1})
      });

      t_body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(-40));

      t_clone.userData = t_body;
      cannon_world.add(t_body);

      tyreMesh.push(t_clone);
      tyreBody.push(t_body);
    }

    // ---------------- Centre right 3 row of tyres ----------------
    z_increment = 0;
    for(var i = 1000; i <= 2200; i+= 1200) {
      var t_clone = t_mesh.clone();
      t_clone.rotateY(THREE.MathUtils.degToRad(40));
      t_clone.position.set(2100 + i, 200, -1900 - z_increment);
      z_increment += 900;

      var t_body = new CANNON.Body({
        mass: 5000,
        position: t_clone.position,
        shape: new CANNON.Box(new CANNON.Vec3(650, 150, 150)),
        material: new CANNON.Material({friction: 0.1, restitution: 1})
      });

      t_body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(40));

      t_clone.userData = t_body;
      cannon_world.add(t_body);

      tyreMesh.push(t_clone);
      tyreBody.push(t_body);
    }

    // ---------------- Centre right 4 row of tyres ----------------
    z_increment = 0
    for(var i = 1000; i <= 2200; i+= 1200) {
      var t_clone = t_mesh.clone();
      t_clone.rotateY(THREE.MathUtils.degToRad(133));
      t_clone.position.set(5000 + i, 200, 500 + z_increment);
      z_increment += 1700;

      var t_body = new CANNON.Body({
        mass: 5000,
        position: t_clone.position,
        shape: new CANNON.Box(new CANNON.Vec3(650, 150, 150)),
        material: new CANNON.Material({friction: 0.1, restitution: 1})
      });

      t_body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(133));

      t_clone.userData = t_body;
      cannon_world.add(t_body);

      tyreMesh.push(t_clone);
      tyreBody.push(t_body);
    }

    // ---------------- Centre left row of tyres ----------------
    z_increment = 0;
    for(var i = 1000; i <= 2200; i+= 600) {
      var t_clone = t_mesh.clone();
      t_clone.rotateY(THREE.MathUtils.degToRad(121)); // -67 Degrees!
      t_clone.position.set(-6200 + i, 200, -800 + z_increment);
      z_increment += 900;

      var t_body = new CANNON.Body({
        mass: 5000,
        position: t_clone.position,
        shape: new CANNON.Box(new CANNON.Vec3(650, 150, 150)),
        material: new CANNON.Material({friction: 0.1, restitution: 1})
      });

      t_body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), THREE.MathUtils.degToRad(121));

      t_clone.userData = t_body;
      cannon_world.add(t_body);

      tyreMesh.push(t_clone);
      tyreBody.push(t_body);
    }
  }

  // Displays the shapes of CANNON bodies for debugging purposes
  function initCannonDebugger() {
    cannonDebug = new THREE.CannonDebugRenderer(scene, cannon_world);
  }

  // Get the audio context to allow game to play music/sounds
  function getAudioContext() {
    AudioContext = window.AudioContext || window.webkitAudioContext ;
    audioContext = new AudioContext();
    audioContext.resume()
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.left = camera.aspect / -2;
    camera.right = camera.aspect / 2;
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  // Decrements the vehicle's speed upon detecting a collision with other bodies
  function carCollision(e) {
    if(e.body.id != 0) {
      if(increment > 20) {
        if(accelerate.isPlaying) {
          accelerate.stop();
        }
        if(accelerate1.isPlaying) {
          accelerate1.stop();
        }
        if(decelerate.isPlaying) {
          decelerate.stop();
        }
        if(decelerate_low.isPlaying) {
          decelerate_low.stop();
        }
        if(rev_limiter.isPlaying) {
          rev_limiter.stop();
        }
      }
      increment = -18;


    }
  }