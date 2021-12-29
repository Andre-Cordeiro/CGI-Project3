precision highp float;
uniform float lightMode;

varying vec3 fNormal;
varying vec3 fLight;
varying vec3 fViewer;
uniform vec4 fColor;

varying vec3 NN;
varying vec3 posC;


uniform mat4 mView;
uniform mat4 mViewNormals;

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec3 pos;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
    bool isDirectional;
    bool isActive;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used

uniform LightInfo uLight[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial;  // The material of the object being drawn

vec4 calculateColor(){

    vec3 aColor;
    vec3 dColor;
    vec3 sColor;
    vec3 finalLight = vec3(0.0, 0.0, 0.0);

    for(int i=0; i<MAX_LIGHTS;i++){
        LightInfo light= uLight[i];

        if(light.isActive) {
            aColor = light.Ia * uMaterial.Ka;
            dColor = light.Id * uMaterial.Kd;
            sColor = light.Is * uMaterial.Ks;

            vec3 P = normalize(posC);
            vec3 N = normalize(NN);
            //vec3 L = normalize(light.pos - P);
            vec3 L;
        
            if(light.isDirectional)
                L = normalize((mViewNormals * vec4(light.pos,0)).xyz);
            else
                L = normalize((mView * vec4(light.pos,1)).xyz - P);

            vec3 R = normalize (reflect(-L,N));
            vec3 V = normalize(-P);

            float diffuseF = max(dot(L,N), 0.0);
            vec3 diffuse = diffuseF * dColor;

            float specularF = pow(max(dot(R,V), 0.0), uMaterial.shininess);
            //float specularF = pow(max(dot(N,R), 0.0), uMaterial.shininess);
            vec3 specular = specularF * sColor;


            if(dot(L,N) < 0.0)
                specular = vec3(0.0,0.0,0.0);

            finalLight += aColor + diffuse + specular;
        }
        if(i == uNLights) break;
        
    }
    return vec4(finalLight, 1.0);
}



void main() {
    gl_FragColor = calculateColor();
    //gl_FragColor = vec4(uMaterial.Kd,1.0);
    //vec3 c = fNormal + vec3(1.0,1.0,1.0);
}
