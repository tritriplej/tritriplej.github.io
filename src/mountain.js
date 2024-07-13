import './style.css'
import * as THREE from 'three'
import * as d3 from 'd3'
import * as dat from 'lil-gui'
// import { CSS3DRenderer, CSS3DObject } from './js/CSS3DRenderer.js'
// import TextPlane from '@seregpie/three.text-plane';



import * as TWEEN from '@tweenjs/tween.js'

import {Water} from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js';



import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
const matcapTexture = new THREE.TextureLoader().load('textures/matcaps/5.png')

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//                                       3d页面初始化
//
///////////////////////////////////////////////////////////////////////////////
// Canvas
const canvas = document.querySelector('#mountain')

// Sizes
const sizes = {
    width: window.innerWidth ,
    height: window.innerHeight
}

// Scene
const scene = new THREE.Scene()

//Add helper
const gridHelper = new THREE.GridHelper(60, 60,'black','black');
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(40);
scene.add(axesHelper);

//lights
// const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)

let tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const light = new THREE.PointLight(0xffffff, 0.5)
light.position.x = 50
light.position.y = 50
light.position.z = 50
light.name = 'pointLight';
scene.add(light)

// Camera
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 500);
camera.position.set(30,10,30)
camera.name = 'camera';

scene.add(camera)
// Renderer
const renderer = new THREE.WebGLRenderer( {
    canvas: canvas,
    antialias:true
} )
renderer.setClearColor('white',0.1)
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

 
const tween_busket =[]; //store all the tween action

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//                                       数据处理
//
//////////////////////////////////////////////////////////////////




//生成正态分布随机数
function normalRandom(mean, std) {
    let u = 0.0, v = 0.0, w = 0.0, c = 0.0;
    do {
        //获得两个（-1,1）的独立随机变量
        u = Math.random() * 2 - 1.0;
        v = Math.random() * 2 - 1.0;
        w = u * u + v * v;
    } while (w == 0.0 || w >= 1.0)
    //Box-Muller转换
    c = Math.sqrt((-2 * Math.log(w)) / w);
    let normal = mean + (u * c) * std;
    return normal;
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//                                       环境(天空+水面)
//
//////////////////////////////////////////////////////////////////

function draw_water_plane(){
    var geom = new THREE.PlaneGeometry(10000,10000,1,1),
    water_mesh = new Water(geom,{
        textureWidth:512,
        textureHeight:512,
        waterNormals:new THREE.TextureLoader().load("textures/waternormals.jpg",function (texture) {
            texture.wrapS=texture.wrapT=THREE.RepeatWrapping;//法向量贴图
        }),
        alpha:1.0,//透明度
        sunDirection: light.position.clone().normalize(),
        sunColor: 'white',//太阳的颜色
        waterColor:'white',//水的颜色
        distortionScale: 3.7,//物体倒影的分散度
        fog: scene.fog !== undefined,
    
    });
    water_mesh.rotation.x=- Math.PI /2
    water_mesh.position.set(0,-1,0)
    return water_mesh
}

const water = draw_water_plane();
scene.add(water)

// 纯色背景
// renderer.shadowMap.enabled = true
// renderer.shadowMap.type = THREE.PCFSoftShadowMap
// renderer.setClearColor('rgb(195, 208, 140)',0.5)
// renderer.setSize(sizes.width, sizes.height)
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// sky
let sky = new Sky();
let uniforms = sky.material.uniforms;
uniforms[ 'turbidity' ].value = 10;
uniforms[ 'rayleigh' ].value = 3;
uniforms[ 'mieCoefficient' ].value = 0.005;
uniforms[ 'mieDirectionalG' ].value = 0.7;
let parameters = {
    distance: 84.8,
    inclination: 1.6,//倾向
    azimuth: 0.4//方位角
};

// let parameters = {
// distance: 400,
// inclination: 0.49,//倾向
// azimuth: 0.205//方位角
// };

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
format: THREE.RGBAFormat,
generateMipmaps: true,
minFilter: THREE.LinearMipmapLinearFilter
})

const cubeCamera = new THREE.CubeCamera( 0.01, 1000, cubeRenderTarget );
    
function updateSun(){

    let theta = Math.PI * ( parameters.inclination - 0.5 );
    let phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );
    light.position.x = parameters.distance * Math.cos( phi );
    light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
    light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );

    sky.material.uniforms[ 'sunPosition' ].value = light.position.copy( light.position );
    water.material.uniforms[ 'sunDirection' ].value = light.position.clone().normalize();
    cubeCamera.update( renderer, sky );

    scene.background = cubeRenderTarget.texture
}


////////------------------controls&event_listener----------------------////////
// Controls
// 这里根据不同的模式更换control的方法
const orbit_control = new OrbitControls(camera, canvas);
orbit_control.enableDamping = true

// 是否锁定页面的相关
let instructions = document.getElementById( 'instructions' );
var blocker = document.getElementById( 'blocker' );


// 点击进入Orbit模式
instructions.addEventListener( 'click', function ( event ) {          
    instructions.style.display = 'none';
    launchFullScreen(document.body)
    blocker.style.display = 'none';
    camera.position.set(30,10,30);
    camera.lookAt(0,0,0);
}, false );


function launchFullScreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    }
    else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    }
    else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    }
    else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}



window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth 
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer otherwise nothing will change on the web
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})




/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//                                      animation
//
///////////////////////////////////////////////////////////////////////////////
var clock = new THREE.Clock();
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();
    window.requestAnimationFrame(tick);
    // stats.update();
    orbit_control.update();
    // galaxy_material.uniforms.uTime.value = elapsedTime // galaxy
    water.material.uniforms[ 'time' ].value += 0.2 / 60.0;
    updateSun()
    renderer.render(scene, camera);
    TWEEN.update();
    tween_busket.forEach(tw=>{
        tw.update();
    })
}
tick()
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//                                      debug ui
//
///////////////////////////////////////////////////////////////////////////////

// const gui = new dat.GUI({ width: 200})
// gui.domElement.style.position = 'absolute';
// gui.domElement.style.left = (window.innerWidth * 0.02).toString() + 'px';
// gui.domElement.style.top = (window.innerHeight * 0.15).toString() + 'px';
// // tweak postion 

