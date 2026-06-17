#include "./tint.frag"

// CRT scanlines: fade a pixel toward lineColor in periodic bands down the height.
// thickness = band period in px; steps quantises the falloff (1 = hard line) and only shows once thickness is several px.
vec4 scanline(vec4 color, vec2 vTextureCoord, vec2 size, float intensity, float thickness, vec3 lineColor, float steps) {
    float phase = fract(vTextureCoord.y * size.y / thickness);
    float ramp = abs(phase - 0.5) * 2.0;          // 0 at the dark centre line, 1 at the period edges
    float s = max(steps, 1.0);
    float level = clamp(floor(ramp * s + 0.5) / s, 0.0, 1.0);   // snap the falloff; steps = 1 → hard line
    return tint(color, lineColor, intensity * (1.0 - level));
}
