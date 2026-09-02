/* Formulaire de demande de dépannage.
   Une seule page qui se déroule : rien n'est caché, on peut revenir en arrière
   d'un coup d'œil. L'estimation se recalcule à chaque réponse. */

/* ==========================================================================
   CONFIGURATION — les trois seules valeurs à renseigner
   ========================================================================== */
const CONFIG = {
  // Adresse du Worker Cloudflare qui reçoit le formulaire et vous l'envoie par
  // email. Tant qu'elle est vide, le bouton d'envoi explique quoi faire.
  workerUrl: 'https://oups-contact.yann-99a.workers.dev',

  // Lien Calendly, par exemple 'https://calendly.com/votre-compte/depannage'.
  // Tant qu'il est vide, un encadré prend la place du calendrier.
  calendlyUrl: 'https://calendly.com/yann-rapenne/a-distance',

  // Fourchettes de durée habituelles, par type de souci.
  // Laissez à null ce que vous ne voulez pas annoncer : la ligne disparaît
  // alors de l'estimation. N'inventez rien ici, ces chiffres vous engagent.
  durees: {
    ordinateur: { min: 1, max: 2 },
    internet:   { min: 1, max: 2 },
    imprimante: { min: 1, max: 2 },
    autre:      { min: 1, max: 2 }
  }
};

/* ==========================================================================
   Tarifs, repris de la section « Tarifs » de la page
   ========================================================================== */
const TARIFS = { distance: 80, domicile: 100, deplacement: 20 };

const COMMUNES = [
  'Avenches', 'Faoug', 'Cudrefin', 'Vully-les-Lacs', 'Mont-Vully', 'Morat',
  'Villarepos', 'Domdidier', 'Dompierre', 'Corcelles-près-Payerne', 'Payerne',
  'Missy', 'Grandcour'
];

// deux formulations : l'une s'insère dans une phrase, l'autre sert d'étiquette
const SOUCIS = {
  ordinateur: 'un souci d’ordinateur',
  internet:   'un souci de connexion Internet',
  imprimante: 'un souci d’imprimante',
  autre:      'un autre souci'
};
const SOUCIS_COURT = {
  ordinateur: 'Ordinateur',
  internet:   'Connexion Internet',
  imprimante: 'Imprimante',
  autre:      'Autre'
};

/* comparaison tolérante : accents, tirets et casse ne doivent pas faire échouer */
const aplatir = (t) => (t || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z]/g, '');

const COMMUNES_APLATIES = COMMUNES.map(aplatir);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('demande');
  if (!form) return;

  const champs = {
    commune: document.getElementById('commune'),
    nom:     document.getElementById('nom'),
    email:   document.getElementById('email'),
    tel:     document.getElementById('tel'),
    message: document.getElementById('message')
  };
  const estim = document.getElementById('estimation');
  const aideCommune = document.getElementById('aide-commune');
  const bouton = document.getElementById('envoyer');
  let dejaSoumis = false;

  /* ---------- cartes de choix ---------- */
  const cartes = [...form.querySelectorAll('.choix-carte')];
  const majCartes = () => {
    for (const c of cartes) c.classList.toggle('est-choisi', c.querySelector('input').checked);
  };
  for (const c of cartes) {
    const radio = c.querySelector('input');
    radio.addEventListener('change', () => { majCartes(); majEstimation(); valider('souci', false); });
    radio.addEventListener('focus', () => c.classList.add('a-le-focus'));
    radio.addEventListener('blur', () => c.classList.remove('a-le-focus'));
  }

  const souciChoisi = () => form.querySelector('input[name="souci"]:checked')?.value || '';

  /* ---------- estimation ---------- */
  function communeConnue(valeur) {
    const a = aplatir(valeur);
    if (!a) return null;
    const i = COMMUNES_APLATIES.indexOf(a);
    return i === -1 ? false : COMMUNES[i];
  }

  function majEstimation() {
    const souci = souciChoisi();
    const saisie = champs.commune.value.trim();
    const commune = communeConnue(saisie);

    if (commune === null) { aideCommune.textContent = 'Commencez à taper, la liste vous propose les communes où je me déplace.'; }
    else if (commune === false) { aideCommune.textContent = 'Cette commune est hors de ma zone habituelle. Le dépannage à distance reste possible partout, et pour un déplacement, écrivez-le moi, on en parlera.'; }
    else { aideCommune.textContent = 'Parfait, je me déplace à ' + commune + '.'; }

    if (!souci && !saisie) { estim.hidden = true; estim.innerHTML = ''; return; }

    const lignes = [];
    lignes.push(['À distance', 'CHF ' + TARIFS.distance + '.– de l’heure']);
    if (commune) {
      lignes.push(['Chez vous à ' + commune,
        'CHF ' + TARIFS.domicile + '.– de l’heure, plus ' + TARIFS.deplacement + '.– de déplacement']);
    }

    const d = souci ? CONFIG.durees[souci] : null;
    if (d && typeof d.min === 'number' && typeof d.max === 'number') {
      const t = d.min === d.max
        ? d.min + (d.min > 1 ? ' heures' : ' heure')
        : d.min + ' à ' + d.max + (d.max > 1 ? ' heures' : ' heure');
      lignes.push(['Durée habituelle', 'environ ' + t]);
    }

    const intro = souci
      ? 'Pour ' + SOUCIS[souci] + (commune ? ', à ' + commune : '') + ' :'
      : 'Voici ce que cela coûterait :';

    estim.innerHTML =
      '<h3>Votre estimation</h3>' +
      '<p class="mention">' + intro + '</p>' +
      '<dl>' + lignes.map(([t, v]) =>
        '<div class="ligne"><dt>' + t + '</dt><dd>' + v + '</dd></div>').join('') + '</dl>' +
      '<p class="mention">Facturation au pro rata temporis, une heure au minimum. ' +
      (commune === false
        ? 'Le déplacement chez vous reste à confirmer ensemble.'
        : 'Beaucoup de problèmes se règlent à distance, sans attendre de rendez-vous.') + '</p>';
    estim.hidden = false;
  }

  champs.commune.addEventListener('input', majEstimation);

  /* ---------- validation, en français clair ---------- */
  const messages = {
    souci:   'Dites-moi d’abord ce qui ne va pas, en choisissant une des quatre cases.',
    nom:     'J’ai besoin de votre nom pour savoir à qui je réponds.',
    email:   'J’ai besoin de votre adresse email pour vous répondre.',
    emailKo: 'Cette adresse email semble incomplète. Vérifiez qu’elle contient bien un @ et un point.',
    message: 'Décrivez-moi le problème en quelques mots, même très simplement.'
  };

  function afficherErreur(cle, texte) {
    const p = document.getElementById('err-' + cle);
    if (!p) return;
    if (texte) {
      p.innerHTML = '<svg aria-hidden="true"><use href="#i-alerte"/></svg><span>' + texte + '</span>';
      p.hidden = false;
      champs[cle]?.setAttribute('aria-invalid', 'true');
      champs[cle]?.setAttribute('aria-describedby', 'err-' + cle);
    } else {
      p.hidden = true;
      p.textContent = '';
      champs[cle]?.removeAttribute('aria-invalid');
      champs[cle]?.removeAttribute('aria-describedby');
    }
  }

  function valider(cle, montrer = true) {
    let err = '';
    if (cle === 'souci' && !souciChoisi()) err = messages.souci;
    if (cle === 'nom' && !champs.nom.value.trim()) err = messages.nom;
    if (cle === 'email') {
      const v = champs.email.value.trim();
      if (!v) err = messages.email;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) err = messages.emailKo;
    }
    if (cle === 'message' && champs.message.value.trim().length < 5) err = messages.message;
    if (montrer || !err) afficherErreur(cle, err);
    return !err;
  }

  for (const cle of ['nom', 'email', 'message']) {
    champs[cle].addEventListener('blur', () => { if (dejaSoumis) valider(cle); });
    champs[cle].addEventListener('input', () => { if (dejaSoumis) valider(cle, false); });
  }

  /* ---------- envoi ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    dejaSoumis = true;
    afficherErreur('envoi', '');

    const cles = ['souci', 'nom', 'email', 'message'];
    const ok = cles.map((c) => valider(c)).every(Boolean);
    if (!ok) {
      const premier = form.querySelector('[aria-invalid="true"]') || form.querySelector('#choix-souci');
      premier.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (premier.querySelector('input') || premier).focus({ preventScroll: true });
      return;
    }

    const donnees = {
      souci: souciChoisi(),
      commune: champs.commune.value.trim(),
      nom: champs.nom.value.trim(),
      email: champs.email.value.trim(),
      tel: champs.tel.value.trim(),
      message: champs.message.value.trim(),
      site: form.elements.site.value,          // piège à robots, doit rester vide
      estimation: estim.hidden ? '' : estim.innerText.replace(/\s+/g, ' ').trim()
    };

    // Tant que le Worker n'est pas branché, on ne laisse pas le visiteur dans
    // une impasse : son logiciel de messagerie s'ouvre avec tout de pré-rempli.
    if (!CONFIG.workerUrl) {
      reussite(donnees, true);
      return;
    }

    const libelle = bouton.innerHTML;
    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';

    try {
      const r = await fetch(CONFIG.workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      reussite(donnees);
    } catch (err) {
      bouton.disabled = false;
      bouton.innerHTML = libelle;
      afficherErreur('envoi', 'Votre message n’est pas parti, la faute à un souci technique de mon côté. Réessayez dans un instant, ou écrivez directement à contact@oups.it.');
    }
  });

  /* ---------- confirmation et prise de rendez-vous ---------- */
  function corpsEmail(d) {
    return [
      'Nature du souci : ' + (SOUCIS_COURT[d.souci] || d.souci),
      'Commune : ' + (d.commune || 'non précisée'),
      'Nom : ' + d.nom,
      'Téléphone : ' + (d.tel || 'non communiqué'),
      '',
      d.message
    ].join('\n');
  }

  function reussite(d, parEmail) {
    form.hidden = true;
    const bloc = document.getElementById('apres-envoi');
    const titreBloc = bloc.querySelector('.confirmation h3');
    const texte = document.getElementById('confirmation-texte');

    if (parEmail) {
      const lien = 'mailto:contact@oups.it'
        + '?subject=' + encodeURIComponent('Demande de dépannage : ' + (SOUCIS_COURT[d.souci] || d.souci))
        + '&body=' + encodeURIComponent(corpsEmail(d));
      titreBloc.textContent = 'Dernière étape : envoyez-moi ce message';
      texte.innerHTML = 'J’ai rassemblé vos réponses. Cliquez sur le bouton, votre logiciel de messagerie s’ouvrira avec tout de pré-rempli, il ne vous restera qu’à envoyer. ' +
        'Si rien ne s’ouvre, écrivez simplement à <a href="mailto:contact@oups.it">contact@oups.it</a>.' +
        '<br><br><a class="btn btn--big" href="' + lien + '"><svg aria-hidden="true"><use href="#i-mail"/></svg> Ouvrir mon email</a>';
    } else {
      titreBloc.textContent = 'C’est envoyé, merci.';
      texte.textContent = d.nom.split(' ')[0] + ', j’ai bien reçu votre demande et je vous réponds à ' + d.email + '. Si vous voulez gagner du temps, choisissez dès maintenant un créneau qui vous arrange.';
    }
    bloc.hidden = false;

    const rdv = document.getElementById('rdv');
    if (CONFIG.calendlyUrl) {
      const url = new URL(CONFIG.calendlyUrl);
      url.searchParams.set('name', d.nom);
      url.searchParams.set('email', d.email);
      url.searchParams.set('a1', [SOUCIS_COURT[d.souci], d.commune].filter(Boolean).join(', '));
      url.searchParams.set('hide_gdpr_banner', '1');
      rdv.innerHTML = '<h3>Choisissez un créneau</h3>' +
        '<p class="form-note">Il s’agit d’un premier échange à distance. Si un déplacement chez vous s’avère nécessaire, nous conviendrons ensemble d’un second rendez-vous.</p>' +
        '<div class="calendly-inline-widget" data-url="' + url.toString() + '"></div>';
      // le script Calendly n'est chargé qu'ici : aucun cookie tiers avant cet instant
      const s = document.createElement('script');
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      document.body.appendChild(s);
    } else {
      rdv.innerHTML = '<div class="rdv-attente">La prise de rendez-vous en ligne arrive bientôt. En attendant, je vous propose un créneau par email.</div>';
    }

    bloc.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const titre = bloc.querySelector('h3');
    titre.setAttribute('tabindex', '-1');
    titre.focus({ preventScroll: true });
  }

  majCartes();
});
