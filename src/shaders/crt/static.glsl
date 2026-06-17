#version 300 es

precision mediump float;

#include "../shared/crt.frag"

// Static CRT curvature over the whole sprite (object space: box = the texture).
uniform sampler2D uSampler;
uniform float strength;
uniform float start;
uniform float end;

in vec2 vTextureCoord;

out vec4 fragColor;

void main() {
    vec2 uv = crtCurve(vTextureCoord, vec4(0.0, 0.0, 1.0, 1.0), strength, start, end);
    // Transparent where the bulge reads past the texture — the rounded CRT corners.
    fragColor = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec4(0.0) : texture(uSampler, uv);
}
