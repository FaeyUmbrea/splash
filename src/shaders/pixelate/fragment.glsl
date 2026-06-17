#version 300 es

precision mediump float;

#include "../shared/dissolve.frag"
#include "../shared/pixelate.frag"

// Dissolve machinery (same contract as the dissolve filter)
uniform float time;
uniform int numOrigins;
uniform vec2 effectOrigins[MAX_ORIGINS];
uniform sampler2D noise;
uniform sampler2D uSampler;
uniform bool invert;

uniform float blockSize;                    // peak cell size in px, reached at the wave front

// How deep (px) the pixelated zone trails behind the wave front.
const float BORDER_WIDTH = 120.0;

in vec2 vWorldCoord;
in vec2 vTextureCoord;

out vec4 fragColor;

void main() {
    vec2 size = vec2(textureSize(uSampler, 0));
    float jitteredDistance = dissolveDistance(noise, vTextureCoord, vWorldCoord, effectOrigins, numOrigins, time);

    // visible: 1 where the image shows; strength: 0 on the calm side, 1 at the wave front.
    float visible;
    float strength;
    if (invert) {
        visible = 1.0 - step(time, jitteredDistance);
        strength = smoothstep(time - BORDER_WIDTH, time, jitteredDistance) * visible;
    }
    else {
        visible = step(time, jitteredDistance);
        strength = (1.0 - smoothstep(time, time + BORDER_WIDTH, jitteredDistance)) * visible;
    }

    // Cells swell from 1px (sharp) to blockSize at the front, then resolve back to sharp behind it.
    vec2 kernel = max(vec2(1.0), floor(mix(vec2(1.0), vec2(blockSize), strength)));
    vec4 color = pixelate(uSampler, vTextureCoord, kernel, vec2(0.0), size);

    fragColor = color * visible;
}
