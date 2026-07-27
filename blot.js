/* =============================================================
   The closing mark.

   A folded ink blot for the colophon, in the tradition of a
   printer's device. Only the right half is described; the left is
   that half reflected, the way paper pressed shut on a wet spot
   comes out symmetrical.

   The mass is a set of overlapping lobes collected into ONE path
   and filled once, so the union has no internal seams and reads as
   a single spill rather than as stacked circles. Outlines are a
   radius of 1 plus a few integer harmonics, which keeps every loop
   closed and makes the shape identical on every load.

   Static by design. Fig. 1 is the only thing on this page that
   moves and this is not going to compete with it.
   ============================================================= */

(function () {
    'use strict';

    var canvas = document.getElementById('colophon-blot');
    if (!canvas || !canvas.getContext || typeof Path2D === 'undefined') return;

    var ctx = canvas.getContext('2d');
    var frame = canvas.parentElement;
    var width = 0;
    var height = 0;
    var ink = [0, 0, 0];

    /* --- The right half ------------------------------------------
       Offsets and radii are in units of the base radius. Together
       these overlap into one connected mass; lobe 1 straddles the
       fold, so the two halves meet across the middle. */

    var LOBES = [
        { dx: 0.06, dy: 0.00, r: 0.72, harm: [[3, 0.13, 0.7], [5, 0.08, 2.4], [7, 0.05, 4.1]] },
        { dx: 0.36, dy: -0.54, r: 0.34, harm: [[3, 0.20, 1.9], [5, 0.12, 3.3]] },
        { dx: 0.32, dy: 0.54, r: 0.38, harm: [[3, 0.18, 4.6], [4, 0.11, 1.2]] },
        { dx: 0.74, dy: 0.06, r: 0.28, harm: [[3, 0.22, 2.8], [5, 0.13, 0.5]] },
        { dx: 0.20, dy: -0.88, r: 0.15, harm: [[3, 0.24, 3.7]] },
        { dx: 0.58, dy: 0.82, r: 0.19, harm: [[3, 0.21, 0.9], [5, 0.12, 2.2]] },
        { dx: 0.95, dy: -0.34, r: 0.13, harm: [[3, 0.25, 5.1]] }
    ];

    // Spatter thrown clear of the body. Same ink, so it joins the
    // same path and takes the same fill.
    var DROPS = [
        [1.16, 0.30, 0.045],
        [0.86, -0.78, 0.038],
        [1.28, -0.10, 0.026],
        [0.52, 1.10, 0.032],
        [1.02, 0.72, 0.020],
        [0.30, -1.14, 0.024]
    ];

    function addBlob(path, cx, cy, r, harm) {
        var steps = 80;
        var pts = [];
        var i, h, t, rad;

        for (i = 0; i < steps; i++) {
            t = (i / steps) * Math.PI * 2;
            rad = 1;
            for (h = 0; h < harm.length; h++) {
                rad += harm[h][1] * Math.sin(harm[h][0] * t + harm[h][2]);
            }
            pts.push([cx + Math.cos(t) * rad * r, cy + Math.sin(t) * rad * r]);
        }

        // Midpoint-to-midpoint quadratics, so the edge is wet rather
        // than faceted.
        path.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
        for (i = 1; i <= pts.length; i++) {
            var a = pts[i % pts.length];
            var b = pts[(i + 1) % pts.length];
            path.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        }
        path.closePath();
    }

    function buildHalf(cx, cy, base) {
        var path = new Path2D();

        LOBES.forEach(function (l) {
            addBlob(path, cx + l.dx * base, cy + l.dy * base, l.r * base, l.harm);
        });

        DROPS.forEach(function (d) {
            path.moveTo(cx + (d[0] + d[2]) * base, cy + d[1] * base);
            path.arc(cx + d[0] * base, cy + d[1] * base, d[2] * base, 0, Math.PI * 2);
        });

        return path;
    }

    // The half, plus the same half reflected across x = cx.
    function fold(half, cx) {
        if (typeof DOMMatrix === 'undefined') return null;
        var full = new Path2D();
        full.addPath(half);
        full.addPath(half, new DOMMatrix([-1, 0, 0, 1, 2 * cx, 0]));
        return full;
    }

    function draw() {
        if (!width || !height) return;

        var cx = width / 2;
        var cy = height / 2;
        var base = Math.min(width, height) * 0.3;
        var half = buildHalf(cx, cy, base);
        var full = fold(half, cx);

        ctx.clearRect(0, 0, width, height);

        function paint(path, alpha) {
            ctx.fillStyle = rgba(ink, alpha);
            if (full) {
                ctx.fill(path);
                return;
            }
            // Without DOMMatrix, mirror by transform instead. Fills
            // twice, which is why the alpha has to be solid.
            ctx.fill(path);
            ctx.save();
            ctx.translate(2 * cx, 0);
            ctx.scale(-1, 1);
            ctx.fill(path);
            ctx.restore();
        }

        var shape = full || half;

        // Ink wicking into the paper: the same silhouette, a little
        // larger, very faint, underneath.
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.07, 1.07);
        ctx.translate(-cx, -cy);
        paint(shape, 0.09);
        ctx.restore();

        paint(shape, 0.9);
    }

    function rgba(c, a) {
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    }

    function readInk() {
        var hex = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim().replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var n = parseInt(hex, 16);
        ink = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

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

    readInk();
    resize();

    if ('ResizeObserver' in window) {
        new ResizeObserver(resize).observe(frame);
    } else {
        window.addEventListener('resize', resize);
    }

    new MutationObserver(function () {
        readInk();
        draw();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
