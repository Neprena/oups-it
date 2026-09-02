/* OUPS : trois comportements, rien de plus.
   Tout le reste est natif : le <dialog> gère Échap et le focus, les <details>
   gèrent l'ouverture des questions, et le défilement doux est en CSS. */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Année courante dans le pied de page
  const annee = document.getElementById('annee');
  if (annee) annee.textContent = new Date().getFullYear();

  // 2. Conditions générales
  const dlg = document.getElementById('cgv');
  const ouvrir = document.getElementById('ouvrirCgv');
  if (dlg && ouvrir) {
    ouvrir.addEventListener('click', () => dlg.showModal());
    dlg.querySelector('.dlg-close')?.addEventListener('click', () => dlg.close());
    // clic sur le fond : la boîte de dialogue occupe tout l'écran, on vérifie
    // donc que le clic est tombé hors du rectangle du contenu
    dlg.addEventListener('click', (e) => {
      const r = dlg.getBoundingClientRect();
      const dedans = e.clientX >= r.left && e.clientX <= r.right &&
                     e.clientY >= r.top && e.clientY <= r.bottom;
      if (!dedans) dlg.close();
    });
  }

  // 3. Liaison entre la liste des communes et le plan
  // Survoler une commune d'un côté allume son jumeau de l'autre. Renfort visuel
  // uniquement : la même information est déjà lisible dans les deux blocs, donc
  // rien n'est ajouté au parcours clavier.
  const zone = document.querySelector('.zone-layout');
  if (zone) {
    const cibles = [...zone.querySelectorAll('[data-commune]')];
    let actif;
    const allumer = (slug) => {
      if (slug === actif) return;
      actif = slug;
      for (const el of cibles) {
        el.classList.toggle('is-active', Boolean(slug) && el.dataset.commune === slug);
      }
    };
    // pointerover plutôt que pointerenter : seul le premier remonte jusqu'ici,
    // ce qui permet de n'installer qu'un écouteur pour les vingt-six éléments.
    zone.addEventListener('pointerover', (e) => {
      const el = e.target.closest?.('[data-commune]');
      allumer(el ? el.dataset.commune : undefined);
    });
    zone.addEventListener('pointerleave', () => allumer(undefined));
  }

  // 4. Mise en évidence du lien de navigation de la section visible
  const liens = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const sections = liens
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if (!sections.length || !('IntersectionObserver' in window)) return;

  const vues = new Set();
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const e of entrees) {
        if (e.isIntersecting) vues.add(e.target.id);
        else vues.delete(e.target.id);
      }
      // la première section visible dans l'ordre du document fait foi
      const actif = sections.find((s) => vues.has(s.id));
      for (const a of liens) {
        const cible = a.getAttribute('href').slice(1);
        if (actif && cible === actif.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );

  sections.forEach((s) => observateur.observe(s));
});
