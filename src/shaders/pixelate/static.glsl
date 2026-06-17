#version 300 es

precision mediump float;

#include "../shared/pixelate.frag"

// Static (non-transition) pixelation: the lib at a constant cell size.
uniform sampler2D uSampler;
uniform vec2 kernel;
uniform vec2 offset;

in vec2 vTextureCoord;

out vec4 fragColor;

void main() {
    vec2 size = vec2(textureSize(uSampler, 0));
    fragColor = pixelate(uSampler, vTextureCoord, kernel, offset, size);
}
