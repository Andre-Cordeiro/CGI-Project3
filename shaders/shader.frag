precision highp float;
uniform float lightMode;

varying vec3 fNormal;
varying vec3 fLight;
varying vec3 fViewer;
uniform vec4 fColor;

//material
uniform vec3 ka;
uniform vec3 kd;
uniform vec3 ks;
uniform float shine;

uniform vec3 lightA;
uniform vec3 lightD;
uniform vec3 lightS;

vec3 aColor = lightA * ka;
vec3 dColor = lightD * kd;
vec3 sColor = lightS * ks;

void main() {
    if(lightMode == 0.0)
        gl_FragColor = fColor;
    else {
        vec3 L = normalize(fLight);
        vec3 V = normalize(fViewer);
        vec3 N = normalize(fNormal);
        vec3 H = normalize(L+V);

        float diffuseF = max(dot(L,N), 0.0);
        vec3 diffuse = diffuseF * dColor;
        
        float specularF = pow(max(dot(N,H), 0.0), shine);
        vec3 specular = specularF * sColor;

        if(dot(L,N) < 0.0)
            specular = vec3(0.0,0.0,0.0);
        gl_FragColor = vec4(aColor + diffuse + specular, 1.0);
    }
    //vec3 c = fNormal + vec3(1.0, 1.0, 1.0);
    
}