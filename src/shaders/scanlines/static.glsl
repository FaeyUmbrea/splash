#version 300 es

precision mediump float;

#include "../shared/scanline.frag"

// Static CRT scanlines over the whole sprite.
uniform sampler2D uSampler;
uniform float intensity;
uniform float thickness;
uniform vec3 lineColor;
uniform float steps;

in vec2 vTextureCoord;

out vec4 fragColor;

void main() {
    vec4 color = texture(uSampler, vTextureCoord);
    vec2 size = vec2(textureSize(uSampler, 0));
    fragColor = scanline(color, vTextureCoord, size, intensity, thickness, lineColor, steps);
}
