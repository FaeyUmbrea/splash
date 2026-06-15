// Shared glitch building blocks. Pure functions only; no uniforms, no main();
// the including shader owns those. All distances are in pixels; callers resolve
// the texture size once (vec2(textureSize(sampler, 0))) and pass it down.

// Shifts the sample UV coordinate by the specified direction and pixel amount.
// dir is in degrees, 0°/360° = right, 90° = down (y grows downward in PIXI).
vec2 shiftCoord(vec2 vTextureCoord, float dir, float strength, vec2 size) {
    // Unit vector from the angle, scaled to `strength` px, converted to UV space
    // by the component-wise divide (x/width, y/height; UV space is anisotropic).
    return vTextureCoord + ((vec2(cos(radians(dir)),sin(radians(dir))) * strength) / size);
}

// Texture sample that treats everything outside UV space as transparent black,
// so displaced reads past the edge fade out instead of smearing border pixels.
vec4 sampleColors(sampler2D uSampler, vec2 coord) {
    // If sampling outside of UV space, return transparent black vector
    if (coord.x < 0.0 || coord.y < 0.0 || coord.x > 1.0 || coord.y > 1.0) {
        return vec4(0,0,0,0);
    }
    else {
        return texture(uSampler, coord);
    }
}

// Calculate chromatically aberrated pixel color: each channel is fetched from
// its own displaced location and reassembled into one color.
// rgbDir is in degrees. 0°/360° = right
// rgbStrength is distance from normal in pixels
vec4 chromaticAberration(sampler2D uSampler, vec2 vTextureCoord, vec2 size, float rDir, float gDir, float bDir, float rStrength, float gStrength, float bStrength) {
    // calculate the shifted sample locations in UV space
    vec2 rVec = shiftCoord(vTextureCoord, rDir, rStrength, size);
    vec2 gVec = shiftCoord(vTextureCoord, gDir, gStrength, size);
    vec2 bVec = shiftCoord(vTextureCoord, bDir, bStrength, size);

    // Accumulators must start at zero: each color channel is written exactly
    // once, alpha collects all three contributions for the average below.
    vec4 color = vec4(0,0,0,0);

    //subsampling red channel
    color.ra = color.ra + sampleColors(uSampler,rVec).ra;

    // subsampling green channel
    color.ga = color.ga + sampleColors(uSampler,gVec).ga;

    //subsampling blue channel
    color.ba = color.ba + sampleColors(uSampler,bVec).ba;

    //normalize alpha: average of the three samples' alphas
    color.a = color.a / 3.0;

    return color;
}

// Uniform arrays need a compile-time size; callers pass how many bands are real.
#define MAX_BANDS 16

// Displaces the coordinate if it falls inside a defined band; no-op otherwise.
// horizontal = true: bands partition the x axis and displace along y.
// horizontal = false: bands partition the y axis and displace along x.
// Band vector is [band start in px from left/top, band end in px (inclusive),
// displacement in px, positive = away from the top-left origin].
// Overlapping bands: the FIRST matching band wins.
vec2 bandBasedDisplace(vec2 size, vec2 vTextureCoord, vec3 bands[MAX_BANDS], int numBands, bool horizontal) {
    // This pixel's position along the partitioned axis, in pixels.
    float pos = (horizontal ? vTextureCoord.x : vTextureCoord.y) * (horizontal ? size.x : size.y);
    for (int i = 0; i < numBands; i++) {
        if (bands[i].x <= pos && bands[i].y >= pos) {
            // px → UV conversion divides by the dimension of the axis being moved along,
            // which is the OPPOSITE of the partitioned axis.
            vec2 displace = ((horizontal ? vec2(0,1) : vec2(1,0)) * bands[i].z) / (horizontal ? size.y : size.x);
            return vTextureCoord + displace;
        }
    }
    return vTextureCoord;
}
