import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec4, perspective, vec3, normalMatrix} from "../../libs/MV.js";
import {modelView, loadMatrix, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as dat from "../../libs/dat.gui.module.js";


import * as PYRAMID from '../../libs/pyramid.js';
import * as CUBE from '../../libs/cube.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as SPHERE from '../../libs/sphere.js';
import * as TORUS from '../../libs/torus.js';


/** @type WebGLRenderingContext */
let gl;
let mode;
let VP_DISTANCE = 5;

/** Interfaces */
const gui = new dat.GUI();
const gui2 = new dat.GUI();


/**Camera Views */
const initView = lookAt([0,0,5], [0,0,0], [0,1,0]);
let view = initView;
const zoom = 1.5;

/** Light Modes */
var zBufferMode;
var backFaceCullingMode;
var showLightsMode;

/** Floor Constants */
const floorTransX = 0;
const floorTransY = -1;
const floorTransZ = 0;
const floorScaleX = 3;
const floorScaleY = 0.1;
const floorScaleZ = 3;
const floorKd = vec3(0,0,1.0);
const floorKa = vec3(0,0,1);
const floorKs = vec3(0,0,1);
const floorShininess = 50;

/** Shape Constants */
const shapeTransX = 0;
const shapeTransY= 0.5;
const shapeTransZ = 0;
const shapeScale = 1;

/** Kinds of Shapes */
const CUBE_SOLID = "Cube";
const SPHERE_SOLID = "Sphere";
const TORUS_SOLID = "Torus"; 
const PYRAMID_SOLID = "Pyramid";
const CYLINDER_SOLID = "Cylinder";
const UNKNOWNSHAPE = "Undenifed shape.";

/** Maximum number of lights*/
const MAX_LIGHTS = 8;
/** Array of lights */
let lights = [];



function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    /** Main program that deals with most things */
    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    /** Program that deals with the coloring of the light sphere's */
    let programLights = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shaderLight.frag"]);

    let mProjection = getOrthoValue();

    mode = gl.TRIANGLES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
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

    /**
     * Draws the floor of the scene
     */
    function drawFloor(){
        multScale([floorScaleX,floorScaleY,floorScaleZ]);
        multTranslation([floorTransX,floorTransY,floorTransZ]);
        uploadModelView();
        CUBE.draw(gl,program,mode);
    }

    /**
     * Draws the choosen object
     */
    function drawShape(material){
        multScale([shapeScale,shapeScale,shapeScale]);
        multTranslation([shapeTransX, shapeTransY, shapeTransZ]);
        uploadModelView();
        switch(material.shapes) {
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
            default: console.log(UNKNOWNSHAPE)
        }
    }

    /**
     * The following five functions deal updating certain values 
     * regarding changes made by the user
     */
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

    /**
     * Generates a random float within a specific interval
     * @param {*} min - minimum value of the interval
     * @param {*} max - maximum value of the interval
     * @returns float
     */
    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Creates a new light
     * Its position (apart from the first light, which spawns
     * at the start in order to be able to view the object correctly)
     * is random, as its color will be either blue, red or green.
     */
    function generateLight(){

        const nLights = lights.length;

        let ambient, diffuse, specular, pos, active, directional;

        let x, y, z;
        

        if(nLights == 0) {
            x = 0.0;
            y = 2.0;
            z = 0.0;
            ambient = vec3(75,75,75);
            diffuse = vec3(255,255,255);
            specular = vec3(255,255,255);
        }
        else if((nLights%3) == 0) {
            x = getRandom(-3, 3);
            y = getRandom(-3, 3);
            z = getRandom(-3, 3);
            ambient = vec3(75,5,5);
            diffuse = vec3(135,5,5);
            specular = vec3(220,165,165);
        }
        else if((nLights%3 == 1)) {
            x = getRandom(-3, 3);
            y = getRandom(-3, 3);
            z = getRandom(-3, 3);
            ambient = vec3(5,5,75);
            diffuse = vec3(15,105,175);
            specular = vec3(125,190,215);
        }
        else {
            x = getRandom(-3, 3);
            y = getRandom(-3, 3);
            z = getRandom(-3, 3);
            ambient = vec3(5,75,5);
            diffuse = vec3(35,175,15);
            specular = vec3(190,235,175);
        }
        pos = vec3(x,y,z);
        directional = false;
        active = true;

        return {
            ambient, 
            diffuse, 
            specular, 
            pos, 
            active, 
            directional
        }
    }

    /**Portion of code regarding the interface of the program */

    let material = {
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

    gui2.add(material, "shapes", [CUBE_SOLID, SPHERE_SOLID, TORUS_SOLID, PYRAMID_SOLID, CYLINDER_SOLID]).name("Object");
    const materialGUI = gui2.addFolder("Material")
    materialGUI.addColor(material,"Ka").listen()
    materialGUI.addColor(material,"Kd").listen()
    materialGUI.addColor(material,"Ks").listen()
    materialGUI.add(material,"Shininess").min(0).listen()
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


    /** Code for every added Light*/
    const lightsFolder = gui.addFolder("Lights")
    lightsFolder.add({nOfLights: 0, buttonAddLight: addLight }, "buttonAddLight").name("Add New Light");

    lightsFolder.open()

    function addLight(){
        if(lights.length <= MAX_LIGHTS){
            const light = generateLight();
            lights.push(light);

            //* Adds light to the folder */
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
    }

    /**
     * Draws the light spheres
     */
    function drawLights(){
        for(let i=0;i<lights.length && showLightsMode;i++){
          pushMatrix()
            multTranslation(lights[i].pos)
            multScale([0.1,0.1,0.1]);
            paint(vec4(lights[i].diffuse[0]/255,lights[i].diffuse[1]/255,lights[i].diffuse[2]/255,1.0));
            gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mModelView"), false, flatten(modelView()));
            SPHERE.draw(gl,programLights,gl.LINES);
          popMatrix()
        }
    }

    function render()
    {
        if(zBufferMode)
            gl.enable(gl.DEPTH_TEST);
        else
            gl.disable(gl.DEPTH_TEST);

        if(backFaceCullingMode){
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK)
        }
        else
            gl.disable(gl.CULL_FACE);

        if(lights.length == 0){
            addLight();
        }
       
        /** Updates the fovy*/
        updateFovy();

        /** Updates the eye, at and up */
        updateLookAt();

        /** Updates Backface Culling */
        updateBackfaceCulling();

        /** Updated ZBuffer */
        updateZBuffer();

        /** Update showLights */
        updateShowLights();

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"),false,flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"),false,flatten(normalMatrix(modelView())));
        let mView = lookAt(camera.eye,camera.at,camera.up);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mView"),false,flatten(mView));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        /** Passes the information about all lights to the shader fragment */
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

        /** Draws the Floor and passes information about the floor to the fragment shader */
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), flatten(floorKd));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), flatten(floorKa));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), flatten(floorKs));
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), floorShininess);
        pushMatrix()
        drawFloor();
        popMatrix()

        /** Draws the Shape and passes the information about the shape properties defined by the user */
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), flatten(vec3(material.Kd[0]/255, material.Kd[1] /255,material.Kd[2] /255)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), flatten(vec3(material.Ka[0]/255, material.Ka[1] /255,material.Ka[2] /255)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), flatten(vec3(material.Ks[0]/255, material.Ks[1] /255,material.Ks[2] /255)));
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), material.Shininess);
        pushMatrix()
        drawShape(material);
        popMatrix()

        gl.useProgram(programLights)

        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mProjection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mModelView"),false,flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mNormals"),false,flatten(normalMatrix(modelView())));
        pushMatrix()
        drawLights();
        popMatrix()


        window.requestAnimationFrame(render);
    }
}

const urls = ["shader.vert", "shader.frag","shaderLight.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))