/* =============================================================
   Fig. 1: a contrastive objective on the unit hypersphere.

   Ink line-art on paper. Points sit on the surface in clusters;
   one anchor pulls a positive in and pushes negatives out. Drawn
   at CSS-pixel scale, back to front, so depth reads as weight.
   ============================================================= */

(function () {
    'use strict';

    var canvas = document.getElementById('fig-sphere');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var frame = canvas.parentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var TILT = -0.42;          // fixed lean, so we never look straight down the equator
    var SPIN = 0.11;           // radians per second
    var CLUSTERS = 6;
    var PER_CLUSTER = 30;

    var width = 0;
    var height = 0;
    var angle = 0;
    var running = false;
    var rafId = null;
    var lastTime = 0;
    var ink, graphite, hairline, accent;

    /* --- Palette ------------------------------------------------
       Read from the stylesheet so the figure follows the edition. */

    function hexToRgb(hex) {
        var h = hex.trim().replace('#', '');
        if (h.length === 3) {
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        var n = parseInt(h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function readPalette() {
        var cs = getComputedStyle(document.documentElement);
        ink = hexToRgb(cs.getPropertyValue('--ink'));
        graphite = hexToRgb(cs.getPropertyValue('--graphite'));
        hairline = hexToRgb(cs.getPropertyValue('--hairline'));
        accent = hexToRgb(cs.getPropertyValue('--accent'));
    }

    function rgba(c, a) {
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    }

    /* --- The point cloud ----------------------------------------
       Deterministic: a small LCG, so the figure is the same every
       load and I can pick anchors by index. */

    function buildPoints() {
        var pts = [];
        var seed = 1987;
        var rnd = function () {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };

        for (var c = 0; c < CLUSTERS; c++) {
            // Cluster centres spread evenly by a Fibonacci lattice.
            var phi = Math.acos(1 - 2 * (c + 0.5) / CLUSTERS);
            var theta = Math.PI * (1 + Math.sqrt(5)) * (c + 0.5);
            var cx = Math.sin(phi) * Math.cos(theta);
            var cy = Math.sin(phi) * Math.sin(theta);
            var cz = Math.cos(phi);

            for (var i = 0; i < PER_CLUSTER; i++) {
                var spread = 0.22;
                var x = cx + (rnd() - 0.5) * spread * 2;
                var y = cy + (rnd() - 0.5) * spread * 2;
                var z = cz + (rnd() - 0.5) * spread * 2;
                var n = Math.sqrt(x * x + y * y + z * z) || 1;
                pts.push({ x: x / n, y: y / n, z: z / n });
            }
        }
        return pts;
    }

    var points = buildPoints();
    // Anchor and positive share a cluster; negatives are drawn from two
    // others, so the pull is short and the pushes cross open surface.
    var ANCHOR = PER_CLUSTER * 1 + 5;
    var POSITIVE = PER_CLUSTER * 1 + 12;
    var NEGATIVES = [PER_CLUSTER * 2 + 8, PER_CLUSTER * 4 + 17];

    /* --- Projection ---------------------------------------------
       Spin about Y, then a fixed tilt about X, then orthographic. */

    function project(p, cos, sin, cx, cy, r) {
        var x = p.x * cos + p.z * sin;
        var z = -p.x * sin + p.z * cos;
        var y = p.y;

        var ct = Math.cos(TILT);
        var st = Math.sin(TILT);
        var y2 = y * ct - z * st;
        var z2 = y * st + z * ct;

        return { sx: cx + x * r, sy: cy - y2 * r, z: z2 };
    }

    /* --- Drawing helpers ---------------------------------------- */

    // A great circle in the plane spanned by two unit axes, stroked
    // segment by segment so the far side falls away.
    function greatCircle(axisA, axisB, cos, sin, cx, cy, r) {
        var steps = 72;
        for (var i = 0; i < steps; i++) {
            var t0 = (i / steps) * Math.PI * 2;
            var t1 = ((i + 1) / steps) * Math.PI * 2;

            var p0 = project({
                x: axisA[0] * Math.cos(t0) + axisB[0] * Math.sin(t0),
                y: axisA[1] * Math.cos(t0) + axisB[1] * Math.sin(t0),
                z: axisA[2] * Math.cos(t0) + axisB[2] * Math.sin(t0)
            }, cos, sin, cx, cy, r);

            var p1 = project({
                x: axisA[0] * Math.cos(t1) + axisB[0] * Math.sin(t1),
                y: axisA[1] * Math.cos(t1) + axisB[1] * Math.sin(t1),
                z: axisA[2] * Math.cos(t1) + axisB[2] * Math.sin(t1)
            }, cos, sin, cx, cy, r);

            var depth = (p0.z + 1) / 2;
            ctx.strokeStyle = rgba(hairline, 0.35 + depth * 0.65);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
        }
    }

    function arrowhead(x, y, dx, dy, colour, alpha) {
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len;
        var uy = dy / len;
        var size = 5;
        var spread = 0.42;

        ctx.fillStyle = rgba(colour, alpha);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x - size * (ux * Math.cos(spread) - uy * Math.sin(spread)),
            y - size * (uy * Math.cos(spread) + ux * Math.sin(spread))
        );
        ctx.lineTo(
            x - size * (ux * Math.cos(-spread) - uy * Math.sin(-spread)),
            y - size * (uy * Math.cos(-spread) + ux * Math.sin(-spread))
        );
        ctx.closePath();
        ctx.fill();
    }

    function label(text, x, y, colour, alpha) {
        ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
        ctx.fillStyle = rgba(colour, alpha);
        ctx.fillText(text, x, y);
    }

    /* --- The frame ----------------------------------------------- */

    function draw() {
        var cx = width / 2;
        var cy = height / 2;
        var r = Math.min(width, height) * 0.4;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);

        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';

        // Silhouette.
        ctx.strokeStyle = rgba(hairline, 1);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Two great circles, to give the surface an orientation.
        greatCircle([1, 0, 0], [0, 0, 1], cos, sin, cx, cy, r);
        greatCircle([0, 1, 0], [0, 0, 1], cos, sin, cx, cy, r);

        // Points, back to front.
        var projected = points.map(function (p, i) {
            var q = project(p, cos, sin, cx, cy, r);
            q.i = i;
            return q;
        });
        projected.sort(function (a, b) {
            return a.z - b.z;
        });

        projected.forEach(function (q) {
            if (q.i === ANCHOR || q.i === POSITIVE || NEGATIVES.indexOf(q.i) !== -1) return;
            var depth = (q.z + 1) / 2;
            ctx.fillStyle = rgba(ink, 0.13 + depth * 0.62);
            ctx.beginPath();
            ctx.arc(q.sx, q.sy, 1.4 + depth * 1.35, 0, Math.PI * 2);
            ctx.fill();
        });

        // The marked triple sits on top, in the accent.
        var a = project(points[ANCHOR], cos, sin, cx, cy, r);
        var pos = project(points[POSITIVE], cos, sin, cx, cy, r);
        var negs = NEGATIVES.map(function (i) {
            return project(points[i], cos, sin, cx, cy, r);
        });

        var aDepth = (a.z + 1) / 2;
        var aAlpha = 0.45 + aDepth * 0.55;

        // Push: dashed, arrowhead past the negative.
        ctx.setLineDash([3, 3]);
        negs.forEach(function (n) {
            var alpha = 0.3 + ((n.z + 1) / 2) * 0.5;
            ctx.strokeStyle = rgba(accent, alpha);
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(n.sx, n.sy);
            ctx.stroke();

            var dx = n.sx - a.sx;
            var dy = n.sy - a.sy;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            arrowhead(n.sx + (dx / len) * 11, n.sy + (dy / len) * 11, dx, dy, accent, alpha);

            ctx.setLineDash([]);
            ctx.fillStyle = rgba(accent, alpha);
            ctx.beginPath();
            ctx.arc(n.sx, n.sy, 2.9, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = rgba(accent, alpha * 0.45);
            ctx.beginPath();
            ctx.arc(n.sx, n.sy, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([3, 3]);
        });
        ctx.setLineDash([]);

        // Pull: solid, arrowhead partway along, pointing at the anchor.
        var pAlpha = 0.4 + ((pos.z + 1) / 2) * 0.55;
        ctx.strokeStyle = rgba(ink, pAlpha);
        ctx.beginPath();
        ctx.moveTo(pos.sx, pos.sy);
        ctx.lineTo(a.sx, a.sy);
        ctx.stroke();

        var pdx = a.sx - pos.sx;
        var pdy = a.sy - pos.sy;
        arrowhead(pos.sx + pdx * 0.62, pos.sy + pdy * 0.62, pdx, pdy, ink, pAlpha);

        ctx.fillStyle = rgba(ink, pAlpha);
        ctx.beginPath();
        ctx.arc(pos.sx, pos.sy, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Anchor: filled, ringed.
        ctx.fillStyle = rgba(accent, aAlpha);
        ctx.beginPath();
        ctx.arc(a.sx, a.sy, 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = rgba(accent, aAlpha * 0.5);
        ctx.beginPath();
        ctx.arc(a.sx, a.sy, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        // Labels, faded out as their point turns away. Each one is pushed
        // along the axis it shares with the anchor, facing outward, so the
        // anchor and its positive never sit on top of each other.
        function annotate(text, point, from, colour, alpha, gap, minZ) {
            var fade = Math.max(0, Math.min(1, (point.z - minZ) / 0.25));
            if (fade <= 0) return;
            var dx = point.sx - from.sx;
            var dy = point.sy - from.sy;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            ctx.textAlign = dx >= 0 ? 'left' : 'right';
            label(text, point.sx + (dx / len) * gap, point.sy + (dy / len) * gap + 3, colour, alpha * fade);
            ctx.textAlign = 'left';
        }

        // The anchor is the subject of the figure, so it keeps its label
        // further around the turn than the points it acts on.
        annotate('anchor', a, pos, accent, aAlpha, 13, -0.78);
        annotate('positive', pos, a, graphite, pAlpha, 13, -0.35);
        annotate('negative', negs[0], a, graphite, 0.3 + ((negs[0].z + 1) / 2) * 0.5, 11, -0.35);

        // Figure annotation, fixed to the frame.
        ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace';
        ctx.fillStyle = rgba(graphite, 0.85);
        ctx.textAlign = 'right';
        ctx.fillText('‖z‖ = 1', width - 14, height - 14);
        ctx.textAlign = 'left';
    }

    /* --- Sizing --------------------------------------------------- */

    function resize() {
        var rect = frame.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    /* --- Loop ----------------------------------------------------- */

    function tick(now) {
        if (!running) return;
        var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
        lastTime = now;
        angle += dt * SPIN;
        draw();
        rafId = requestAnimationFrame(tick);
    }

    function start() {
        if (running || reduce.matches) return;
        running = true;
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
    }

    /* --- Wiring --------------------------------------------------- */

    readPalette();
    resize();

    if ('ResizeObserver' in window) {
        new ResizeObserver(resize).observe(frame);
    } else {
        window.addEventListener('resize', resize);
    }

    // Only spin while the figure is actually on screen.
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            entries[0].isIntersecting ? start() : stop();
        }, { threshold: 0 }).observe(frame);
    } else {
        start();
    }

    // Follow the edition switch, and redraw once the mono face lands
    // so the labels are not measured against a fallback.
    new MutationObserver(function () {
        readPalette();
        draw();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(draw);
    }

    reduce.addEventListener('change', function () {
        reduce.matches ? stop() : start();
        draw();
    });
})();
