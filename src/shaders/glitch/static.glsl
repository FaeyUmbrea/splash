#version 300 es

precision mediump float;

#include "../shared/glitch.frag"

// Static (non-transition) glitch: the lib at constant strength, no dissolve wave.
uniform sampler2D uSampler;
uniform vec3 bands[MAX_BANDS];
uniform int numBands;
uniform bool horizontal;
uniform float aberrationPx;
uniform vec3 tint;

in vec2 vTextureCoord;

out vec4 fragColor;

void main() {
    vec2 size = vec2(textureSize(uSampler, 0));

    vec2 tornCoord = bandBasedDisplace(size, vTextureCoord, bands, numBands, horizontal);
    vec4 color = chromaticAberration(uSampler, tornCoord, size, 0.0, 0.0, 180.0, aberrationPx, 0.0, aberrationPx);

    // Subtle constant energy tint. rgb only; alpha is coverage.
    color.rgb += tint * 0.15 * color.a;

    fragColor = color;
}
