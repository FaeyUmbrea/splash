#version 300 es

#define MAX_ORIGINS 16

precision mediump float;

uniform float time;
uniform int numOrigins;
uniform vec2 effectOrigins[MAX_ORIGINS];
uniform sampler2D noise;
uniform sampler2D uSampler;
uniform bool invert;

in vec2 vWorldCoord;
in vec2 vTextureCoord;

out vec4 fragColor;

void main() {

    vec4 color = texture(uSampler,vTextureCoord);
    vec4 glowColor = vec4(0.8863, 0.3451, 0.1333, 1.0);
    vec4 c_noise = texture(noise, vTextureCoord+vec2(time* -0.2,time*0.1));

    float noise = (c_noise.r + c_noise.g + c_noise.b) / 30.0;
    float distancefromEffectOrigin = 99999999.0;
    for (int i; i < numOrigins; i++) {
       distancefromEffectOrigin = min(distance(effectOrigins[i], vWorldCoord),distancefromEffectOrigin);
    }
    float falloff = step(time, distancefromEffectOrigin - (noise*500.0));
    float glowFallof = step(time+10.0, distancefromEffectOrigin - (noise*500.0));
    if (invert){
        fragColor = mix(color * (1.0 - falloff), glowColor, glowFallof) * (1.0 - falloff);
    }
    else {
        fragColor = mix(glowColor,color * falloff,glowFallof) * falloff;
    }
}