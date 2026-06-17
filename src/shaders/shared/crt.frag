// CRT barrel curvature: bulges the image inside `box`, compressing content toward the edges.
// box = (minX, minY, maxX, maxY) in UV. Object space = the sprite's box (0,0,1,1); pass a sub-rect for screen space.
// Returns the UV to sample; reads landing outside [0,1] should be drawn transparent by the caller.
vec2 crtCurve(vec2 vTextureCoord, vec4 box, float strength, float start, float end) {
    vec2 center = (box.xy + box.zw) * 0.5;
    vec2 halfBox = (box.zw - box.xy) * 0.5;
    vec2 p = (vTextureCoord - center) / halfBox;                  // -1..1 across the box, beyond it = outside
    if (abs(p.x) > 1.0 || abs(p.y) > 1.0) return vTextureCoord;   // outside the box → untouched

    float dist = length(p);                            // distance from centre (X), 0 at centre
    float amount = strength * smoothstep(start, end, dist) * dist * dist;   // flat near centre, ramps to the edge

    return center + (p + p * amount) * halfBox;
}
