import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec4, mult, rotateZ, perspective, vec3} from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationY, multScale, multTranslation, popMatrix, pushMatrix, multRotationZ, multRotationX} from "../../libs/stack.js";

import * as dat from "../../libs/dat.gui.module.js";


import * as PYRAMID from '../../libs/pyramid.js';
import * as CUBE from '../../libs/cube.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as SPHERE from '../../libs/sphere.js';
import * as TORUS from '../../libs/torus.js';


/** @type WebGLRenderingContext */
let gl;
let mode;      
let animation = true;
let VP_DISTANCE = 5;

var mModelLoc;
var mView, mProjection;
var mViewLoc, mProjectionLoc;
var mNormals, mViewNormals;
var mNormalsLoc, mViewNormalsLoc;

//Interfaces
const gui = new dat.GUI();
const gui2 = new dat.GUI();


//Camera Views
const initView = lookAt([0,0,5], [0,0,0], [0,1,0]);

//let view = topView;
//let view = axonometricView;
//let view = frontView; //Camera's first view
let view = initView;

const zoom = 1.5;


const WIREFRAME = 0;
const FILLED = 1;

var zBufferMode;
var backFaceCullingMode;
var showLightsMode;


const CUBE_SOLID = "Cube", SPHERE_SOLID = "Sphere", TORUS_SOLID = "Torus", 
PYRAMID_SOLID = "Pyramid", CYLINDER_SOLID = "Cylinder";

//WF = wireFrame | F = filled
/**
var drawFunctions = [[cubeWF, cubeF], [sphereWF, sphereF],
    [torusWF, torusF], [pyramidWF, pyramidF], [cylinderWF, cylinderF]];
*/

let lights = [];
let nOfActualLights = 0;



function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = getOrthoValue();

    mode = gl.TRIANGLES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    gl.clearColor(0.5, 0.5, 0.6, 1.0);
    CUBE.init(gl);
    PYRAMID.init(gl);
    CYLINDER.init(gl);
    SPHERE.init(gl);
    TORUS.init(gl);
    gl.enable(gl.DEPTH_TEST);
    
    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        aspect = canvas.width / canvas.height;
        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = getOrthoValue();
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function getOrthoValue(){
        return ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);
    }

    function getFragColorVar(){
        return gl.getUniformLocation(program, "fColor");
    }

    function paint(color){
        let colorVar = getFragColorVar();
        gl.uniform4fv(colorVar, color);
    }

    function drawFloor(){
        multScale([3,0.1,3]);
        multTranslation([0,-0.6,0]);
        paint(vec4(1.0,1.0,1.0,1.0));
        uploadModelView();
        CUBE.draw(gl,program,mode);
    }

    function drawShape(shape){
        multScale([1,1,1]);
        multTranslation([0, 0.5, 0]);
        paint(vec4(1.0,0.753,0.796,1.0));
        uploadModelView();
        switch(shape) {
            case CUBE_SOLID: CUBE.draw(gl,program,mode)
            break;
            case SPHERE_SOLID: SPHERE.draw(gl,program,mode)
            break;
            case TORUS_SOLID: TORUS.draw(gl,program,mode)
            break;
            case PYRAMID_SOLID: PYRAMID.draw(gl,program,mode)
            break;
            case CYLINDER_SOLID: CYLINDER.draw(gl,program,mode)
            break;
            default: console.log("Undenifed shape.")
        }
    }

    function lighsToAdd(){
        //Here we add all the lights to our program!
        if(nOfActualLights < light.nOfLights){
            for(let i = Number(nOfActualLights) + Number(1); i<=light.nOfLights;i++){
                const lightGUI = lights.addFolder("Light"+ i)
                const positionGUI = lightGUI.addFolder("position")
                positionGUI.add(position.pos, 0).name("x").listen()
                positionGUI.add(position.pos, 1).name("y").listen()
                positionGUI.add(position.pos, 2).name("z").listen()
                positionGUI.addColor(position, "ambient")
                positionGUI.addColor(position, "diffuse")
                positionGUI.addColor(position, "specular")
                positionGUI.add(position, "directional")
                positionGUI.add(position, "active")
            }
            nOfActualLights = light.nOfLights;
        }
    }

    function updateLookAt(){
        view = lookAt(camera.eye, camera.at, camera.up);
    }

    function updateFovy(){
        mProjection = perspective(camera.fovy*zoom, aspect, camera.near, camera.far);
    }

    function updateBackfaceCulling(){
        backFaceCullingMode = options["backface culling"];
    }

    function updateZBuffer(){
        zBufferMode = options["depth test"];
    }

    function updateShowLights(){
        showLightsMode = options["show lights"];
    }

    let gui2Parameters = {
        shapes: "Torus",
        Ka: vec3(0,25,0),
        Kd: vec3(0,100,0),
        Ks: vec3(255,255,255),
        Shininess: 50
    }

    let options = {
        "backface culling": true,
        "depth test": true,
        "show lights": false,
    }

    let camera = {
        eye: vec3(0,0,5),
        at: vec3(0,0,0),
        up: vec3(0,1,0),
        fovy: 45,
        near: 0.1,
        far: 20,
    }

    //dividir a ilumnicao por 255 no shader
    let position = {
        pos: vec3(0,1,0),
        ambient: vec3(75,75,75),
        diffuse: vec3(175,175,175),
        specular: vec3(255,255,255),
        directional: false,
        active: true,
    }

    let light = {
        nOfLights: 0,
        pos: vec3(0,1,0),
        ambient: vec3(75,75,75),
        diffuse: vec3(175,175,175),
        specular: vec3(255,255,255),
        directional: false,
        active: true,
    }

    gui2.add(gui2Parameters, "shapes", ["Cube", "Sphere", "Torus", "Pyramid", "Cylinder"]).name("Object");
    const materialGUI = gui2.addFolder("Material")
    materialGUI.addColor(gui2Parameters,"Ka")
    materialGUI.addColor(gui2Parameters,"Kd")
    materialGUI.addColor(gui2Parameters,"Ks")
    materialGUI.add(gui2Parameters,"Shininess")
    materialGUI.open()


    const optionsGUI = gui.addFolder("Options");
    optionsGUI.add(options, "backface culling")
    optionsGUI.add(options, "depth test")
    optionsGUI.add(options, "show lights")
    optionsGUI.open()

    const cameraGUI = gui.addFolder("Camera")
    cameraGUI.add(camera, "fovy").min(1).max(100).step(1).listen()
    cameraGUI.add(camera, "near").min(0.1).max(20).listen().onChange( function (x) {
        camera.near = Math.min(camera.far-0.5,x)
    })
    cameraGUI.add(camera, "far").min(0.1).max(20).listen().onChange( function (x) {
        camera.far = Math.max(camera.near+0.5,x)
    })
    cameraGUI.open()

    const eyeGUI = gui.addFolder("Eye")
    eyeGUI.add(camera.eye, 0).name("x").step(0.05).listen()
    eyeGUI.add(camera.eye, 1).name("y").step(0.05).listen()
    eyeGUI.add(camera.eye, 2).name("z").step(0.05).listen()
    eyeGUI.open()

    const atGUI = gui.addFolder("At")
    atGUI.add(camera.at, 0).name("x").step(0.05).listen()
    atGUI.add(camera.at, 1).name("y").step(0.05).listen()
    atGUI.add(camera.at, 2).name("z").step(0.05).listen()
    atGUI.open()

    const upGUI = gui.addFolder("Up")
    upGUI.add(camera.up, 0).name("x").step(0.05).listen()
    upGUI.add(camera.up, 1).name("y").step(0.05).listen()
    upGUI.add(camera.up, 2).name("z").step(0.05).listen()
    upGUI.open()


    //Code for every added Light!
    const lights = gui.addFolder("Lights")
    lights.add(light, "nOfLights", ["0","1","2","3","4","5","6","7","8"]).name("NumberLights");


    lights.open()
    //lightGUI.open()
    //positionGUI.open()

    function render()
    {
        if(animation) {
           
        }

        if(zBufferMode)
            gl.enable(gl.DEPTH_TEST);
        else
            gl.disable(gl.DEPTH_TEST);

        if(backFaceCullingMode)
            gl.enable(gl.CULL_FACE);
        else
            gl.disable(gl.CULL_FACE);

        if(showLightsMode)
           console.log("apenas para n dar erro") //TODO: FAZER LUZES APARECEREM
        else
           console.log("apenas para n dar erro")//TODO : FAZER LUZES DESAPARECEREM
       
        //Updates the fovy
        updateFovy();

        //Updates the eye, at and up
        updateLookAt();

        //Updates Backface Culling
        updateBackfaceCulling();

        //Updated ZBuffer
        updateZBuffer();

        //Update showLights
        updateShowLights(); //NOT WORKING YET!

        //Updates the color of the solid object
        //updateSolidColor();

        //Adds Lights to UI
        lighsToAdd();


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        loadMatrix(view);

        pushMatrix()
        drawFloor();
        popMatrix()

        pushMatrix()
        drawShape(gui2Parameters.shapes);
        popMatrix()

        //console.log(options["backface culling"]);
        //console.log(gui2Parameters.shapes);

        window.requestAnimationFrame(render);
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))