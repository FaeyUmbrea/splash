// Mix a premultiplied-alpha colour toward `target` by `amount` (0 = unchanged, 1 = full target).
// `target` is straight (non-premultiplied); scaling it by alpha keeps transparent pixels transparent.
vec4 tint(vec4 color, vec3 target, float amount) {
    return vec4(mix(color.rgb, target * color.a, amount), color.a);
}
