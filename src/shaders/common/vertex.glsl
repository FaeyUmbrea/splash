#version 300 es

precision mediump float;

in vec2 aVertexPosition;

uniform mat3 projectionMatrix;
uniform mat3 worldTransform;

out vec2 vTextureCoord;
out vec2 vWorldCoord;


uniform vec4 inputSize;
uniform vec4 outputFrame;


vec4 filterVertexPosition( void )
{
    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;

    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0., 1.);
}

vec2 filterTextureCoord( void )
{
    return aVertexPosition * (outputFrame.zw * inputSize.zw);
}

vec2 filterWorldCoord()
{
    return (inverse(worldTransform) * vec3(vTextureCoord * inputSize.xy + outputFrame.xy,1.0)).xy;
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
    vWorldCoord = filterWorldCoord();
}