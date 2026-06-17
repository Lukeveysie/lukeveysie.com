// ─────────────────────────────────────────────────────────────
// Luke Veysie — lv-shader.js
// WebGL ultramarine ink-flow shader. Mounts on any
// <canvas data-shader data-seed="N"> element. Falls back by
// hiding the canvas (CSS gradient behind it shows instead).
// Respects prefers-reduced-motion (renders one static frame).
// ─────────────────────────────────────────────────────────────
(function () {
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VERT =
    'attribute vec2 p;' +
    'void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_t;',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float n(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x),',
    '             mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 5; i++){ v += a * n(p); p = p * 2.03 + vec2(7.3, 9.1); a *= 0.5; }',
    '  return v;',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 1.6;',
    '  float t = u_t * 0.05;',
    '  vec2 q = vec2(fbm(p + t), fbm(p - t * 0.7 + 3.1));',
    '  float f = fbm(p + 2.2 * q + vec2(t * 0.6, -t * 0.4));',
    '  vec3 ink  = vec3(0.043, 0.039, 0.035);',
    '  vec3 navy = vec3(0.050, 0.100, 0.380);',
    '  vec3 blue = vec3(0.059, 0.200, 0.800);',
    '  vec3 lift = vec3(0.357, 0.490, 0.980);',
    '  vec3 c = mix(ink, navy, smoothstep(0.25, 0.65, f));',
    '  c = mix(c, blue, smoothstep(0.55, 0.85, f) * 0.8);',
    '  c = mix(c, lift, smoothstep(0.78, 0.95, f) * q.x * 0.6);',
    '  float vg = smoothstep(1.25, 0.45, length(uv - 0.5));',
    '  c *= mix(0.72, 1.0, vg);',
    '  c += (h(gl_FragCoord.xy + fract(u_t) * 7.0) - 0.5) * 0.035;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }

  function mount(canvas) {
    var gl = canvas.getContext('webgl', {
      antialias: false, alpha: false, powerPreference: 'low-power'
    });
    if (!gl) { canvas.style.display = 'none'; return; }

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.style.display = 'none'; return; }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = 'none'; return;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uT = gl.getUniformLocation(prog, 'u_t');
    var seed = parseFloat(canvas.getAttribute('data-seed') || '0') * 37.0;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width * dpr));
      var hgt = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== hgt) {
        canvas.width = w; canvas.height = hgt;
        gl.viewport(0, 0, w, hgt);
      }
    }
    resize();
    window.addEventListener('resize', function () { resize(); draw(performance.now()); });
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { resize(); }).observe(canvas);
    }

    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
      }).observe(canvas);
    }

    var t0 = performance.now();
    function draw(now) {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000 + seed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (REDUCED) { draw(t0 + 4000); return; }
    (function loop(now) {
      if (visible) draw(now);
      requestAnimationFrame(loop);
    })(t0);
  }

  function init() {
    var nodes = document.querySelectorAll('canvas[data-shader]');
    Array.prototype.forEach.call(nodes, mount);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
