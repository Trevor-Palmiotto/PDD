// TODO: Comment
import * as THREE from './three.js'
import { CameraController } from './CameraController.js'
import { ObjectPDD } from './ObjectPDD.js';
const canvas       = document.querySelector('#bg');
const clock        = new THREE.Clock();
const renderer     = new THREE.WebGLRenderer({ canvas: canvas });
const scene        = new THREE.Scene();
const gridHelper   = new THREE.GridHelper(100, 10);
const pointLight   = new THREE.PointLight( 0xFFFFFF, 1, 100, 0.001 );
// const lightHelper  = new THREE.PointLightHelper( pointLight );
const ambientLight = new THREE.AmbientLight( 0xFFFFFF );
const camera       = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 500 );
const controller   = new CameraController(camera, renderer.domElement);
scene.background   = new THREE.Color( 0xFFFFFF );
scene.fog          = new THREE.Fog( 0xFFFFFFF, 10, 200 ); // fog depth will eventually be scrollable? with a key input

pointLight.position.set( 0, 10, 0 );
// scene.add(pointLight, lightHelper, ambientLight, gridHelper);
scene.add(pointLight, ambientLight, gridHelper);
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
camera.position.set( 10, 10, 10 );



// is there some way to export or make this smaller?
var mouse, scroll_ctr, y_start;
var dragObject     = null;
var scroll_rate    = 0.25;
var raycaster      = new THREE.Raycaster();
var plane          = new THREE.Plane();
var planeIntersect = new THREE.Vector3(); // point of intersection with the plane
var pointIntersect = new THREE.Vector3(); // point of intersection with an object (plane's point)
var shift          = new THREE.Vector3(); // distance between position of an object and points of intersection with the object
const plane_normal = new THREE.Vector3( 0, 1, 0 ); // plane's normal

document.addEventListener('pointerdown', function(e) {
  var intersects = raycaster.intersectObjects( scene.children );
  
  scroll_ctr = 0;
  for ( let i = 0; i < intersects.length; i++ ) {
    if (intersects[i].object.type == "Mesh") {
      controller.Disable()
      pointIntersect.copy(intersects[i].point);
      plane.setFromNormalAndCoplanarPoint(plane_normal, pointIntersect);
      shift.subVectors(intersects[i].object.position, intersects[i].point);
      dragObject = intersects[i].object;
      y_start = dragObject.position.y;
      break;
    }
  }
});

document.addEventListener('wheel', e => {
  if (dragObject != null) {
    dragObject.position.y += scroll_rate*(Number(e.deltaY > 0)*2-1);
    scroll_ctr += (Number(e.deltaY > 0)*2-1);
  }
});
document.addEventListener("pointermove", e => {
  mouse = new THREE.Vector2( ( e.clientX / window.innerWidth ) * 2 - 1, -( e.clientY / window.innerHeight ) * 2 + 1 );
  raycaster.setFromCamera(mouse, camera);
  if (dragObject) {
    raycaster.ray.intersectPlane(plane, planeIntersect);
    dragObject.position.addVectors(planeIntersect, shift);
    dragObject.position.y = y_start + scroll_rate*scroll_ctr
  }
});
document.addEventListener("pointerup", () => {
	dragObject = null; controller.Enable()
});
////////////////////////////
// Cube:
//    
//    5------6
//   /|     /|
//  4------7 |
//  | 1----|-2
//  |/     |/
//  0------3
// 
// add rest (mass, charge)
const cubeGraphDict = {
  0: {neighbors: [1,3,4], component: 'cube', type: 'external'},
  1: {neighbors: [0,2,5], component: 'cube', type: 'external'},
  2: {neighbors: [1,3,6], component: 'cube', type: 'external'},
  3: {neighbors: [0,2,7], component: 'cube', type: 'external'},
  4: {neighbors: [0,5,7], component: 'cube', type: 'external'},
  5: {neighbors: [1,4,6], component: 'cube', type: 'external'},
  6: {neighbors: [2,5,7], component: 'cube', type: 'external'},
  7: {neighbors: [3,4,6], component: 'cube', type: 'external'}
};
const cubeCoordinateDict = {
  0: new THREE.Vector3(-1, -1, -1),
  1: new THREE.Vector3(-1,  1, -1),
  2: new THREE.Vector3( 1,  1, -1),
  3: new THREE.Vector3( 1, -1, -1),
  4: new THREE.Vector3(-1, -1,  1),
  5: new THREE.Vector3(-1,  1,  1),
  6: new THREE.Vector3( 1,  1,  1),
  7: new THREE.Vector3( 1, -1,  1)
}
const cubeComponentDict = {
  cube : {internal: {distanceConstant:   10, angleConstant:   10, dihedralConstant:   10},
          external: {distanceConstant: 10000, angleConstant: 1000, dihedralConstant: 1000}
  }
};

const lineGraphDict = { // Including mass will have to be calculated in each of the force equations
  0: {neighbors:   [1], component: 'line', type: 'external', mass: 1},
  1: {neighbors: [0,2], component: 'line', type: 'external', mass: 1},
  2: {neighbors: [1,3], component: 'line', type: 'external', mass: 1},
  3: {neighbors:   [2], component: 'line', type: 'external', mass: 1}
};
const lineCoordinateDict = {
  0: new THREE.Vector3(-3, 0, 0),
  1: new THREE.Vector3(-1, 0, 0),
  2: new THREE.Vector3( 1, 0, 0),
  3: new THREE.Vector3( 3, 0, 0)
};
const lineComponentDict = {
  line: {internal: {distanceConstant:   10, angleConstant:   10, dihedralConstant:   10},
         external: {distanceConstant: 10000, angleConstant: 1000, dihedralConstant: 1000}}
}

const meshGraphDict = {
   0: {neighbors:       [1,4], component: 'mesh', type: 'external', mass: 1},
   1: {neighbors:     [0,2,5], component: 'mesh', type: 'external', mass: 1},
   2: {neighbors:     [1,3,6], component: 'mesh', type: 'external', mass: 1},
   3: {neighbors:       [2,7], component: 'mesh', type: 'external', mass: 1},
   4: {neighbors:     [0,5,8], component: 'mesh', type: 'external', mass: 1},
   5: {neighbors:   [1,4,6,9], component: 'mesh', type: 'external', mass: 1},
   6: {neighbors:  [2,5,7,10], component: 'mesh', type: 'external', mass: 1},
   7: {neighbors:    [3,6,11], component: 'mesh', type: 'external', mass: 1},
   8: {neighbors:    [4,9,12], component: 'mesh', type: 'external', mass: 1},
   9: {neighbors: [5,8,10,13], component: 'mesh', type: 'external', mass: 1},
  10: {neighbors: [6,9,11,14], component: 'mesh', type: 'external', mass: 1},
  11: {neighbors:   [7,10,15], component: 'mesh', type: 'external', mass: 1},
  12: {neighbors:      [8,13], component: 'mesh', type: 'external', mass: 1},
  13: {neighbors:   [9,12,14], component: 'mesh', type: 'external', mass: 1},
  14: {neighbors:  [10,13,15], component: 'mesh', type: 'external', mass: 1},
  15: {neighbors:     [11,14], component: 'mesh', type: 'external', mass: 1}
};
const meshCoordinateDict = {
   0: new THREE.Vector3(-3, 3, 0),
   1: new THREE.Vector3(-1, 3, 0),
   2: new THREE.Vector3( 1, 3, 0),
   3: new THREE.Vector3( 3, 3, 0),
   4: new THREE.Vector3(-3, 1, 0),
   5: new THREE.Vector3(-1, 1, 0),
   6: new THREE.Vector3( 1, 1, 0),
   7: new THREE.Vector3( 3, 1, 0),
   8: new THREE.Vector3(-3,-1, 0),
   9: new THREE.Vector3(-1,-1, 0),
  10: new THREE.Vector3( 1,-1, 0),
  11: new THREE.Vector3( 3,-1, 0),
  12: new THREE.Vector3(-3,-3, 0),
  13: new THREE.Vector3(-1,-3, 0),
  14: new THREE.Vector3( 1,-3, 0),
  15: new THREE.Vector3( 3,-3, 0)
};
const meshComponentDict = {
  mesh: {internal: {distanceConstant:  100, angleConstant:  100, dihedralConstant:  100},
         external: {distanceConstant: 10000, angleConstant: 1000, dihedralConstant: 1000}}
}

const miniGraphDict = {
  0: {neighbors:       [1,3], component: 'mini', type: 'external', mass: 1},
  1: {neighbors:     [0,2,4], component: 'mini', type: 'external', mass: 1},
  2: {neighbors:       [1,5], component: 'mini', type: 'external', mass: 1},
  3: {neighbors:     [0,4,6], component: 'mini', type: 'external', mass: 1},
  4: {neighbors:   [1,3,5,7], component: 'mini', type: 'external', mass: 1},
  5: {neighbors:     [2,4,8], component: 'mini', type: 'external', mass: 1},
  6: {neighbors:       [3,7], component: 'mini', type: 'external', mass: 1},
  7: {neighbors:     [4,6,8], component: 'mini', type: 'external', mass: 1},
  8: {neighbors:       [5,7], component: 'mini', type: 'external', mass: 1},
};
const miniCoordinateDict = {
  0: new THREE.Vector3(-2, 2, 0),
  1: new THREE.Vector3( 0, 2, 0),
  2: new THREE.Vector3( 2, 2, 0),
  3: new THREE.Vector3(-2, 0, 0),
  4: new THREE.Vector3( 0, 0, 0),
  5: new THREE.Vector3( 2, 0, 0),
  6: new THREE.Vector3(-2,-2, 0),
  7: new THREE.Vector3( 0,-2, 0),
  8: new THREE.Vector3( 2,-2, 0),
};
const miniComponentDict = {
  mini: {internal: {distanceConstant:  100, angleConstant:  100, dihedralConstant:  100},
         external: {distanceConstant: 10000, angleConstant: 1000, dihedralConstant: 1000}}
}
let cube = new ObjectPDD(cubeGraphDict, cubeCoordinateDict, cubeComponentDict);
let line = new ObjectPDD(lineGraphDict, lineCoordinateDict, lineComponentDict);
let mesh = new ObjectPDD(meshGraphDict, meshCoordinateDict, meshComponentDict);
let mini = new ObjectPDD(miniGraphDict, miniCoordinateDict, miniComponentDict);

let obj = cube;
// NEXT IMPLEMENT SPHERES AND LINES

// Implementing visualization:
let spheres;
let lines;

const loadSpheres = (coordinates) => {
  spheres = new Array(Object.keys(coordinates).length);
  for (const key in coordinates) {
    let geometry      = new THREE.SphereGeometry( .5, 24, 24 );
    let material      = new THREE.MeshStandardMaterial( { color: 0x555555 });
    let mesh          = new THREE.Mesh( geometry, material );
    mesh.position.set( coordinates[key].x, coordinates[key].y, coordinates[key].z );
    spheres[Number(key)] = mesh;
    scene.add(mesh);
  }
}; loadSpheres(obj.coordinates)

const loadLines = (obj) => {
  lines = {};
  for (const pair in obj.distances) {
    const parsedPair = pair.split( ',' ).map( v => { return Number(v) } );
    const points     = [obj.coordinates[parsedPair[0]], obj.coordinates[parsedPair[1]]];
    const geometry   = new THREE.BufferGeometry().setFromPoints(points);
    const material   = new THREE.LineBasicMaterial({ color: 0xFF0000 })
    const line       = new THREE.Line(geometry, material);
    lines[pair]      = line;
    scene.add(line);
  }
}; loadLines(obj);

const updateSpheres = (coordinates) => {
  for (const key in coordinates) {
    spheres[Number(key)].position.set( coordinates[key].x, coordinates[key].y, coordinates[key].z );
  }
};

const updateLines = (obj) => {
  for (const pair in obj.distances) {
    const parsedPair = pair.split( ',' ).map( v => { return Number(v) } );
    const points     = [obj.coordinates[parsedPair[0]], obj.coordinates[parsedPair[1]]];
    lines[pair].geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
};

const updateObject = (object, spheres) => {
  for ( const key in object.coordinates ) {
    object.coordinates[Number(key)] = spheres[Number(key)].position;
  }
}

const updateFPS = (fps) => { document.getElementById('fps').innerText = "FPS: ".concat(String(fps)) };
var ctr = 0; const animate = () => {
  requestAnimationFrame( animate );
  let end = clock.getDelta();
  controller.Update();
  end = clock.getDelta();
  obj.verlet();
  updateLines(obj)
  updateSpheres(obj.coordinates);
  updateObject(obj, spheres);
  ((ctr++ % 20 == 0) ? updateFPS((Math.min(1/end, 60)).toFixed(2)) : '');
  ((ctr++ % 100 == 0) ? ctr = 0 : '');
  renderer.render( scene, camera );
}; animate();

window.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'ArrowRight':
      obj.verlet()
      break;
    case 'ArrowLeft':
      for (let coord in obj.coordinates) {
        obj.coordinates[coord].x = (Math.random()*2-1)*3;
        obj.coordinates[coord].y = (Math.random()*2-1)*3;
        obj.coordinates[coord].z = (Math.random()*2-1)*3;
      };
      
  }

});