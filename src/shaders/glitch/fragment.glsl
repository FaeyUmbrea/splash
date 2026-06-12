#version 300 es

precision mediump float;

#include "../shared/dissolve.frag"
#include "../shared/glitch.frag"

// Dissolve machinery (same contract as the dissolve filter)
uniform float time;                        // ms since the filter attached; doubles as the wave radius in px (1px/ms)
uniform int numOrigins;
uniform vec2 effectOrigins[MAX_ORIGINS];   // wave centers, in stage pixels
uniform sampler2D noise;
uniform sampler2D uSampler;
uniform bool invert;                       // true = image appears outward from origins (animIn); false = erodes away (animOut)

// Glitch border (band table is rolled on the CPU and re-rolled every few frames)
uniform vec3 bands[MAX_BANDS];
uniform int numBands;
uniform bool horizontal;                   // band orientation, see bandBasedDisplace
uniform float aberrationPx;                // channel separation at full strength, in px
uniform vec3 tint;

// Assembly default: how deep (px) the glitch zone trails behind the wave front.
const float BORDER_WIDTH = 120.0;

in vec2 vWorldCoord;
in vec2 vTextureCoord;

out vec4 fragColor;

void main() {
    vec2 size = vec2(textureSize(uSampler, 0));
    float jitteredDistance = dissolveDistance(noise, vTextureCoord, vWorldCoord, effectOrigins, numOrigins, time);

    // visible: 1 where the image shows at all (same wave logic as the dissolve).
    // strength: 0 on the calm side of the border zone, rising to 1 at the wave front.
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

    // Band tearing: mixing toward the displaced UV scales the tear with strength.
    vec2 tornCoord = mix(vTextureCoord, bandBasedDisplace(size, vTextureCoord, bands, numBands, horizontal), strength);

    // Channel separation along the tear axis, also scaled by strength.
    float px = aberrationPx * strength;
    vec4 color = chromaticAberration(uSampler, tornCoord, size, 0.0, 0.0, 180.0, px, 0.0, px);

    // Tint: additive energy glow, strongest at the front. rgb only — alpha is coverage.
    color.rgb += tint * strength * 0.35 * color.a;

    // Premultiplied transparency outside the wave, exactly like the dissolve.
    fragColor = color * visible;
}
