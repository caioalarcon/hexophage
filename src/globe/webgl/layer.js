// Draw the bound globe program's positions using one color and primitive type.
export function drawGPULayer(gpu, buffer, mode, count, color, size, asCircles, first = 0) {
  if (!count) return;
  const { gl, uni, attr } = gpu;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, 3, gl.FLOAT, false, 0, 0);
  gl.uniform4fv(uni.color, color);
  gl.uniform1f(uni.pointSize, size);
  gl.uniform1f(uni.circles, asCircles ? 1 : 0);
  gl.drawArrays(mode, first, count);
}
