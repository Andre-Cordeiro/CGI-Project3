import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec4, mult, rotateZ, perspective, vec3, normalMatrix} from "../../libs/MV.js";
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

let mModelLoc;
let mView, mProjection;
let mViewLoc, mProjectionLoc;
let mNormals, mViewNormals;
let mNormalsLoc, mViewNormalsLoc;

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
const MAX_LIGHTS = 8;
let lights = [];
let nOfActualLights = 0;



function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    let programLights = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shaderLight.frag"]);

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
        return gl.getUniformLocation(programLights, "fColor");
    }

    function paint(color){
        let colorVar = getFragColorVar();
        gl.uniform4fv(colorVar, color);
    }

    function drawFloor(){
        multScale([3,0.1,3]);
        multTranslation([0,-0.6,0]);
        //paint(vec4(1.0,1.0,1.0,1.0));
        uploadModelView();
        CUBE.draw(gl,program,mode);
    }

    function drawShape(gui2Parameters){
        multScale([1,1,1]);
        multTranslation([0, 0.5, 0]);
        //paint(vec4(1.0,0.753,0.796,1.0));
        //paint(vec4(gui2Parameters.Kd,1.0)); // POR ALGUM MOTIVO QUANDO MUDAMOS A COR NO UI AS VEZES PERDE-SE A COR?
        uploadModelView();
        switch(gui2Parameters.shapes) {
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
        "show lights": true,
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

    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }

    function generateLight(){

        const nLights = lights.length;

        let ambient, diffuse, specular, pos, active, directional;

        let x, y, z;
        
        if((nLights%3) == 0) {

            ambient = vec3(75,5,5);
            diffuse = vec3(255,255,255);
            x = getRandom(0, 3);
            y = getRandom(-3, 0);
            z = getRandom(-3, 3);
        }
        else if((nLights%3 == 1)) {
            ambient = vec3(5,5,75);
            diffuse = vec3(15,105,175);
            x = getRandom(-3, 0);
            y = getRandom(0, 3);
            z = getRandom(-3, 3);
        }
        else {
            ambient = vec3(5,75,5);
            diffuse = vec3(35,175,15);
            x = getRandom(0, 3);
            y = getRandom(0, 3);
            z = getRandom(-3, 3);
        }
        
        specular = vec3(255,255,255);
        pos = vec3(x,y,z);
        directional = false;
        active = true;

        console.log(" x: " + x + " y: " + y + " z: "+ z);
        return {
            ambient, 
            diffuse, 
            specular, 
            pos, 
            active, 
            directional
        }
    }

    gui2.add(gui2Parameters, "shapes", ["Cube", "Sphere", "Torus", "Pyramid", "Cylinder"]).name("Object");
    const materialGUI = gui2.addFolder("Material")
    materialGUI.addColor(gui2Parameters,"Ka").listen()
    materialGUI.addColor(gui2Parameters,"Kd").listen()
    materialGUI.addColor(gui2Parameters,"Ks").listen()
    materialGUI.add(gui2Parameters,"Shininess").listen()
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
    const lightsFolder = gui.addFolder("Lights")
    lightsFolder.add({nOfLights: 0, buttonAddLight: addLight }, "buttonAddLight").name("Add New Light");

    lightsFolder.open()

    // add initially a light
    
    //lightGUI.open()
    //positionGUI.open()

    function addLight(){
        const light = generateLight();
        lights.push(light);

        // add light to the folder
        const index = lights.length - 1;
        const lightGUI = lightsFolder.addFolder("Light"+ index);
        const positionGUI = lightGUI.addFolder("position")
        positionGUI.add(light.pos, 0).name("x").listen()
        positionGUI.add(light.pos, 1).name("y").listen()
        positionGUI.add(light.pos, 2).name("z").listen()
        positionGUI.addColor(light, "ambient").listen()
        positionGUI.addColor(light, "diffuse").listen()
        positionGUI.addColor(light, "specular").listen()
        positionGUI.add(light, "directional").listen()
        positionGUI.add(light, "active").listen()
    }

    function drawLights(){
        //gl.useProgram(programLights);
        for(let i=0;i<lights.length && showLightsMode;i++){
          pushMatrix()
            multTranslation(lights[i].pos)
            multScale([0.2,0.2,0.2]);
            paint(vec4(lights[i].diffuse[0]/255,lights[i].diffuse[1]/255,lights[i].diffuse[2]/255,1.0));
            //console.log(lights[i].diffuse);
            //uploadModelView();
            gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mModelView"), false, flatten(modelView()));
            SPHERE.draw(gl,programLights,gl.LINES);
          popMatrix()
        }
    }

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
       
        //Updates the fovy
        updateFovy();

        //Updates the eye, at and up
        updateLookAt();

        //Updates Backface Culling
        updateBackfaceCulling();

        //Updated ZBuffer
        updateZBuffer();

        //Update showLights
        updateShowLights();

        //Updates the color of the solid object
        //updateSolidColor();

        //Adds Lights to UI
        // lighsToAdd();


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        //gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"),false,flatten(perspective(camera.fovy,camera.aspect,camera.near,camera.far)));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"),false,flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"),false,flatten(normalMatrix(modelView())));
        //gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelNormals"),false,flatten(normalMatrix(modelView())));
        //gl.uniformMatrix4fv(gl.getUniformLocation(program, "mView"),false,flatten(lookAt(camera.eye,camera.at,camera.up)));
        //gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"),false,flatten(perspective(camera.eye,camera.at,camera.up)));

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), flatten(vec3(gui2Parameters.Kd[0]/255, gui2Parameters.Kd[1] /255,gui2Parameters.Kd[2] /255)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), flatten(vec3(gui2Parameters.Ka[0]/255, gui2Parameters.Ka[1] /255,gui2Parameters.Ka[2] /255)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), flatten(vec3(gui2Parameters.Ks[0]/255, gui2Parameters.Ks[1] /255,gui2Parameters.Ks[2] /255)));
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), gui2Parameters.Shininess);


        gl.uniform1i(gl.getUniformLocation(program,"uNLights"),lights.length);
        for(let i=0;i<lights.length;i++){
            gl.uniform3fv(gl.getUniformLocation(program, "uLight["+i+"].pos"),flatten(lights[i].pos));
            gl.uniform1f(gl.getUniformLocation(program, "uLight["+i+"].isDirectional"), lights[i].directional);
            gl.uniform1f(gl.getUniformLocation(program, "uLight["+i+"].isActive"), lights[i].active);
            gl.uniform3fv(gl.getUniformLocation(program, "uLight["+i+"].Ia"),flatten(vec3(lights[i].ambient[0]/255, lights[i].ambient[1] /255,lights[i].ambient[2] /255)));
            gl.uniform3fv(gl.getUniformLocation(program, "uLight["+i+"].Id"),flatten(vec3(lights[i].diffuse[0]/255, lights[i].diffuse[1] /255,lights[i].diffuse[2] /255)));
            gl.uniform3fv(gl.getUniformLocation(program, "uLight["+i+"].Is"),flatten(vec3(lights[i].specular[0]/255, lights[i].specular[1] /255,lights[i].specular[2] /255)));
        }
        
        loadMatrix(view);

        pushMatrix()
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), flatten(vec3(0,0,1.0)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), flatten(vec3(0,0,1)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), flatten(vec3(0,0,1)));
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), 50);
        drawFloor();
        popMatrix()

        pushMatrix()
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), flatten(vec3(gui2Parameters.Kd[0]/255, gui2Parameters.Kd[1] /255,gui2Parameters.Kd[2] /255)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), flatten(vec3(gui2Parameters.Ka[0]/255, gui2Parameters.Ka[1] /255,gui2Parameters.Ka[2] /255)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), flatten(vec3(gui2Parameters.Ks[0]/255, gui2Parameters.Ks[1] /255,gui2Parameters.Ks[2] /255)));
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), gui2Parameters.Shininess);
        drawShape(gui2Parameters);
        popMatrix()

        gl.useProgram(programLights)

        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mProjection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mModelView"),false,flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mNormals"),false,flatten(normalMatrix(modelView())));

        pushMatrix()
        drawLights();
        popMatrix()
  
        

        //console.log(options["backface culling"]);
        //console.log(gui2Parameters.shapes);

        window.requestAnimationFrame(render);
    }
}

const urls = ["shader.vert", "shader.frag","shaderLight.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))