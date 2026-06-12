/* ============================================================
   FreedomFest — WebGL laser
   A neon-green laser behind the logo, pointed straight at the
   screen, its source sweeping left to right along the title.
   The title is drawn into an occluder texture and the fragment
   shader marches each pixel's light ray through it, so every
   letter goes silhouette as the source passes behind it, with
   light spilling around the glyph edges and shadows radiating
   outward. If WebGL (or shader compilation) is unavailable the
   CSS laser in style.css keeps running instead.
   ============================================================ */
(() => {
  const hero = document.querySelector('.hero');
  const canvas = document.querySelector('.hero-laser-canvas');
  if (!hero || !canvas || !window.WebGLRenderingContext) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return;

  const VERT = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision mediump float;
    uniform vec2 u_res;
    uniform vec2 u_point;  /* laser source, y-down pixels */
    uniform float u_time;
    uniform sampler2D u_text;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y);
    }

    void main() {
      vec2 frag = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
      vec2 d = frag - u_point;
      float rn = length(d) / u_res.y;
      float ang = atan(d.y, d.x);

      /* beam aimed at the camera: hot core + flaring glow */
      float hot = exp(-rn * rn * 240.0);
      float mid = exp(-rn * rn * 22.0);
      float wide = exp(-rn * 2.5) * 0.35;

      /* radial spokes around the source (integer harmonics keep the
         atan seam invisible) */
      float rays = 0.7 + 0.3 * sin(ang * 7.0 + u_time * 0.7)
                       + 0.2 * sin(ang * 13.0 - u_time * 1.1);

      /* drifting haze the light picks out */
      vec2 uvn = frag / u_res.y;
      float n = noise(uvn * 3.0 + vec2(u_time * 0.06, -u_time * 0.04))
              + noise(uvn * 9.0 - vec2(u_time * 0.10, u_time * 0.05)) * 0.5;
      float haze = 0.65 + 0.45 * n;

      /* Backlighting: march from the source to this pixel through the
         title mask. The source sits behind the text plane, so rays
         only start being blocked beyond R0 — light spills around the
         glyph the source is hiding behind, and the rest of the glyph
         throws a radial shadow. */
      const float R0 = 0.05;
      float t0 = clamp(R0 / max(rn, 1e-4), 0.0, 1.0);
      float occ = 0.0;
      for (int i = 0; i < 64; i++) {
        vec2 sp = mix(u_point, frag, mix(t0, 0.985, (float(i) + 0.5) / 64.0));
        occ = max(occ, texture2D(u_text, sp / u_res).a);
      }
      float lit = 1.0 - occ * 0.85 * smoothstep(R0 * 0.7, R0 * 1.8, rn);

      float light = (hot * 1.8 + (mid + wide) * rays) * haze * lit;
      vec3 col = vec3(0.25, 1.0, 0.12) * light
               + vec3(0.9, 1.0, 0.75) * hot * 1.5 * lit;
      gl_FragColor = vec4(col, clamp(light, 0.0, 1.0));
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  /* fullscreen triangle */
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  ['u_res', 'u_point', 'u_time', 'u_text'].forEach((name) => {
    u[name] = gl.getUniformLocation(prog, name);
  });

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(u.u_text, 0);

  /* the source's sweep path: along the title block, a little past
     each end, in canvas pixels */
  let sweep = { x0: 0, x1: 0, y: 0 };

  /* Render at reduced resolution — the beam is all soft glow, and
     this keeps the 64-sample shadow march cheap on phones. */
  function layout() {
    const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
    canvas.width = Math.max(1, Math.round(hero.clientWidth * scale));
    canvas.height = Math.max(1, Math.round(hero.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.u_res, canvas.width, canvas.height);

    /* occluder mask: the title lines at their on-screen positions */
    const heroRect = hero.getBoundingClientRect();
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const c = mask.getContext('2d');
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    hero.querySelectorAll('.hero-title .line-1, .hero-title .line-2').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      c.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * scale}px ${cs.fontFamily}`;
      const x = ((r.left + r.right) / 2 - heroRect.left) * scale;
      const y = ((r.top + r.bottom) / 2 - heroRect.top) * scale;
      c.filter = 'blur(3px)'; /* soft shadow edge */
      c.fillText(el.textContent, x, y);
      c.filter = 'none';
      c.fillText(el.textContent, x, y);
    });
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);

    const t = hero.querySelector('.hero-title').getBoundingClientRect();
    const pad = t.width * 0.18;
    sweep = {
      x0: (t.left - pad - heroRect.left) * scale,
      x1: (t.right + pad - heroRect.left) * scale,
      y: ((t.top + t.bottom) / 2 - heroRect.top) * scale,
    };
  }

  let raf = 0;
  function frame(tms) {
    const t = tms / 1000;
    /* left → right → left every 10s */
    const k = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 10);
    gl.uniform2f(u.u_point, sweep.x0 + (sweep.x1 - sweep.x0) * k, sweep.y);
    gl.uniform1f(u.u_time, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  hero.classList.add('laser-gl');
  layout();
  start();

  /* only render while the hero is on screen */
  new IntersectionObserver((entries) => {
    entries[0].isIntersecting ? start() : stop();
  }).observe(hero);
  new ResizeObserver(layout).observe(hero);
  document.fonts.ready.then(layout); /* redraw mask once Unbounded loads */
})();
