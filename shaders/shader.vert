uniform mat4 mProjection;
uniform vec4 lightPos;

attribute vec4 vPosition;
attribute vec3 vNormal;
uniform mat4 mModelView; //mModel

uniform mat4 mNormals;
//uniform mat4 mView;
uniform mat4 mViewNormals;

varying vec3 fNormal;
varying vec3 fLight;
varying vec3 fViewer;
varying vec4 fColor;


void main() {
    gl_Position = mProjection * mModelView * vPosition;
    fNormal = vNormal;
}