#version 300 es

precision mediump float;

#include "../shared/dissolve.frag"

uniform float time;                        // ms since the filter attached; doubles as the wave radius in px (1px/ms)
uniform int numOrigins;
uniform vec2 effectOrigins[MAX_ORIGINS];   // wave centers, in stage pixels (same space as vWorldCoord)
uniform sampler2D noise;                   // tiling noise texture (REPEAT), drives the ragged edge
uniform sampler2D uSampler;                // PIXI: the sprite being filtered
uniform bool invert;                       // true = image appears outward from origins (animIn); false = erodes away (animOut)

in vec2 vWorldCoord;                       // from the vertex shader: this pixel in stage pixels (via worldTransform)
in vec2 vTextureCoord;

out vec4 fragColor;

void main() {
    vec4 color = texture(uSampler, vTextureCoord);
    // The mono-color border ring painted at the wave front.
    vec4 glowColor = vec4(0.8863, 0.3451, 0.1333, 1.0);

    float jitteredDistance = dissolveDistance(noise, vTextureCoord, vWorldCoord, effectOrigins, numOrigins, time);
    fragColor = dissolveComposite(color, glowColor, jitteredDistance, time, 10.0, invert);
}
