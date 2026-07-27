/* =============================================================
   Portfolio: interaction.
   Two jobs: the day/night edition, and marking the current folio.
   ============================================================= */

(function () {
    'use strict';

    var root = document.documentElement;

    /* --- Edition toggle --------------------------------------
       The initial value is set by an inline script in <head> so
       the page never paints in the wrong edition. This only
       handles the switch. */

    var toggle = document.getElementById('edition-toggle');

    if (toggle) {
        toggle.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night';
            root.setAttribute('data-theme', next);
            try {
                localStorage.setItem('edition', next);
            } catch (e) {}
        });
    }

    /* --- Current folio ---------------------------------------
       Marks the masthead numeral for the section you are in.
       No-ops until the work sections exist. */

    var sections = document.querySelectorAll('main section[id]');
    var folios = document.querySelectorAll('.folio');

    if (sections.length && folios.length && 'IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var href = '#' + entry.target.id;
                folios.forEach(function (folio) {
                    folio.classList.toggle('is-current', folio.getAttribute('href') === href);
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

        sections.forEach(function (section) {
            observer.observe(section);
        });
    }
})();
