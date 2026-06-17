// Box-average pixelation. kernel = cell size in px, offset = grid phase.
vec4 pixelate(sampler2D uSampler, vec2 vTextureCoord, vec2 kernel, vec2 offset, vec2 size) {
    vec2 pixelPos = vTextureCoord * size;

    // Snap to the cell's top-left on a stable grid; offset goes inside the snap.
    vec2 grid = pixelPos - offset;
    vec2 topLeft = grid - vec2(mod(grid.x, kernel.x), mod(grid.y, kernel.y)) + offset;

    int kx = int(kernel.x);
    int ky = int(kernel.y);

    float sampled = 0.0;
    vec4 color = vec4(0.0);
    for (int i = 0; i < kx; i++) {
        for (int j = 0; j < ky; j++) {
            vec2 texel = topLeft + vec2(float(i), float(j)) + 0.5;
            // Overhang at the edges averages fewer texels, shrinking the kernel.
            if (texel.x >= 0.0 && texel.y >= 0.0 && texel.x < size.x && texel.y < size.y) {
                color += texture(uSampler, texel / size);
                sampled += 1.0;
            }
        }
    }

    return color / max(sampled, 1.0);
}
