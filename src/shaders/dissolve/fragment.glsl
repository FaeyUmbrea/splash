#version 300 es

precision mediump float;

uniform float time;
uniform vec2 effectOrigin;
uniform sampler2D noise;
uniform sampler2D uSampler;

in vec2 vWorldCoord;
in vec2 vTextureCoord;

out vec4 fragColor;

void main() {

    vec4 color = texture(uSampler,vTextureCoord);
    vec4 c_noise = texture(noise, vTextureCoord+vec2(time* -0.2,time*0.1));

    float noise = (c_noise.r + c_noise.g + c_noise.b) / 30.0;
    float distancefromEffectOrigin = distance(effectOrigin, vTextureCoord);
    float falloff = step(time, distancefromEffectOrigin - noise);
    fragColor = color * falloff;
}