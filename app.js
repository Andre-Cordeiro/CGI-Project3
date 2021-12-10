import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec4, mult, rotateZ, inverse, vec3} from "../../libs/MV.js";
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

/**Commands
const moreZoom = '+';
const lessZoom = '-';
const wireView = 'W';
const meshView = 'S';
const frontViewComm = '1';
const topViewComm = '2';
const profileViewComm = '3';
const axonometricViewComm = '4';
const backViewComm = '5';
*/


//Camera Views
const frontView = lookAt([0.5,0,0], [0,0,0], [1,1,0]); //Camera's front view
const backView = lookAt([-0.5,0,0], [0,0,0], [1,1,0]); //Camera's back view
const topView  = lookAt([0,1,0], [0,0,0], [1,1,0]);    //Camera's top view
const profileView = lookAt([0,0,0], [0,0,0], [1,1,0]); //Camera's profile view
const axonometricView = lookAt([3,3,3], [0,0,0], [1,2,1]); // Camera's axonometric view

//let view = topView;
//let view = axonometricView;
//let view = frontView; //Camera's first view
let view = profileView;


const WIREFRAME = 0;
const FILLED = 1;

const Z_ON = 1, Z_OFF = 0;
var zBufferMode = Z_OFF;

const BACK_ON = 1, BACK_OFF = 0;
var backFaceCullingMode = BACK_OFF;


const CUBE_SOLID = "Cube", SPHERE_SOLID = "Sphere", TORUS_SOLID = "Torus", 
PYRAMID_SOLID = "Pyramid", CYLINDER_SOLID = "Cylinder";

//WF = wireFrame | F = filled
/**
var drawFunctions = [[cubeWF, cubeF], [sphereWF, sphereF],
    [torusWF, torusF], [pyramidWF, pyramidF], [cylinderWF, cylinderF]];
*/

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

    /**
    document.onkeydown = function(event) {
        switch(event.key) {

            case moreZoom:
                if(VP_DISTANCE>3)
                    VP_DISTANCE--;
                mProjection = getOrthoValue();
                break;

            case lessZoom:
                if(VP_DISTANCE<10)
                    VP_DISTANCE++;
                mProjection = getOrthoValue();
                break;

            case wireView:
                mode = gl.LINES; 
                break;

            case meshView:
                mode = gl.TRIANGLES;
                break;

            case frontViewComm:
                view = frontView;
                break;
                
            case topViewComm:
                view = topView;
                break;

            case profileViewComm:
                view = profileView;
                break;

            case axonometricViewComm:
                view = axonometricView;
                break;
            case backViewComm:
                view = backView;
                break;
        }
    }
    */

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
        paint(vec4(1.0,1.0,1.0,1.0));
        uploadModelView();
        CUBE.draw(gl,program,mode);
    }

    function drawShape(shape){
        multScale([2,2,2]);
        multTranslation([0, 1, 0]);
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
    //Added 1 light to test!
    const lightGUI = lights.addFolder("Light1")
    const positionGUI = lightGUI.addFolder("position")
    positionGUI.add(position.pos, 0).name("x").listen()
    positionGUI.add(position.pos, 1).name("y").listen()
    positionGUI.add(position.pos, 2).name("z").listen()
    positionGUI.addColor(position, "ambient")
    positionGUI.addColor(position, "diffuse")
    positionGUI.addColor(position, "specular")
    positionGUI.add(position, "directional")
    positionGUI.add(position, "active")
    lights.open()
    lightGUI.open()
    positionGUI.open()

    function render()
    {
        if(animation) {
           
        }

        if(zBufferMode == Z_ON)
            gl.enable(gl.DEPTH_TEST);
        else
            gl.disable(gl.DEPTH_TEST);

        if(backFaceCullingMode == BACK_ON)
            gl.enable(gl.CULL_FACE);
        else
            gl.disable(gl.CULL_FACE);
       
        window.requestAnimationFrame(render);

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

        console.log(options["backface culling"]);
        console.log(gui2Parameters.shapes);
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))