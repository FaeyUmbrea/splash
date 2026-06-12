// Uniform arrays need a compile-time size; callers pass how many origins are real.
#define MAX_ORIGINS 16

// Jittered distance from the nearest effect origin, in stage pixels.
// The time-drifting noise sample makes the wave edge ragged and boiling;
// rgb averaged over 30 combined with the *500.0 gives up to ~50px of jitter.
float dissolveDistance(sampler2D noise, vec2 uv, vec2 worldCoord, vec2 origins[MAX_ORIGINS], int numOrigins, float time) {
    vec4 c_noise = texture(noise, uv + vec2(time * -0.2, time * 0.1));
    float n = (c_noise.r + c_noise.g + c_noise.b) / 30.0;
    float d = 99999999.0;
    for (int i = 0; i < numOrigins; i++) {
        d = min(distance(origins[i], worldCoord), d);
    }
    return d - (n * 500.0);
}

// Classic dissolve compositing: the wave radius IS time in px (1px/ms),
// borderColor paints the borderWidth-px ring at the front.
// invert = true reveals the image outward from the origins; false erodes it.
// Multiplying the whole vec4 by 0 zeroes alpha too (premultiplied transparent).
vec4 dissolveComposite(vec4 color, vec4 borderColor, float jitteredDistance, float time, float borderWidth, bool invert) {
    float falloff = step(time, jitteredDistance);
    float glowFalloff = step(time + borderWidth, jitteredDistance);
    if (invert) {
        return mix(color * (1.0 - falloff), borderColor, glowFalloff) * (1.0 - falloff);
    }
    else {
        return mix(borderColor, color * falloff, glowFalloff) * falloff;
    }
}
