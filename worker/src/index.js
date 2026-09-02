/**
 * Réception du formulaire de demande de dépannage.
 *
 * Le site est statique, servi par GitHub Pages : il n'a aucun serveur pour
 * recevoir un formulaire. Ce Worker joue ce rôle et transmet la demande par
 * email. Aucun prestataire tiers ne voit passer les messages des clients.
 *
 * L'envoi passe par Email Routing, gratuit sur l'offre Free, et non par le
 * produit Email Sending, qui n'est pas ouvert à ce compte. Conséquence : la
 * destination doit être une adresse vérifiée dans Cloudflare, ce qui n'est pas
 * une gêne ici puisque nous n'écrivons qu'à Yann.
 */
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage, Mailbox } from 'mimetext';

const CHAMPS_MAX = { nom: 120, email: 200, tel: 40, commune: 120, message: 5000, estimation: 1000 };
const SOUCIS = {
  ordinateur: 'Ordinateur',
  internet: 'Connexion Internet',
  imprimante: 'Imprimante',
  autre: 'Autre'
};

const echapper = (t) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const emailValide = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * mimetext déclare l'encodage mais n'encode pas lui-même : si on lui annonce
 * base64 en lui donnant du texte brut, le client affiche du charabia. On
 * encode donc à la main, en découpant à 76 caractères comme l'exige la RFC.
 * Sans cela, le corps part en 7bit avec des octets UTF-8 dedans, ce qui est
 * non conforme et se fait mutiler par certains serveurs.
 */
function enBase64(texte) {
  const octets = new TextEncoder().encode(texte);
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/(.{76})/g, '$1\r\n');
}

function origineAutorisee(request, env) {
  const origine = request.headers.get('Origin');
  if (!origine) return null;
  const permises = (env.ORIGINES || '').split(',').map((o) => o.trim()).filter(Boolean);
  return permises.includes(origine) ? origine : null;
}

function entetes(origine) {
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
  if (origine) {
    h['Access-Control-Allow-Origin'] = origine;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

const reponse = (statut, corps, origine) =>
  new Response(JSON.stringify(corps), { status: statut, headers: entetes(origine) });

export default {
  async fetch(request, env) {
    const origine = origineAutorisee(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: origine ? 204 : 403, headers: entetes(origine) });
    }
    if (request.method !== 'POST') {
      return reponse(405, { erreur: 'Méthode non autorisée.' }, origine);
    }
    if (!origine) {
      return reponse(403, { erreur: 'Origine non autorisée.' }, null);
    }

    // 5 envois par minute et par adresse IP, si le limiteur est configuré
    if (env.LIMITEUR) {
      const ip = request.headers.get('CF-Connecting-IP') || 'inconnue';
      const { success } = await env.LIMITEUR.limit({ key: ip });
      if (!success) {
        return reponse(429, { erreur: 'Trop de demandes envoyées coup sur coup. Réessayez dans une minute.' }, origine);
      }
    }

    let d;
    try {
      d = await request.json();
    } catch {
      return reponse(400, { erreur: 'Requête illisible.' }, origine);
    }

    // Piège à robots : le champ « site » est masqué, un humain ne le remplit
    // jamais. On répond succès pour ne pas renseigner le robot sur l'échec.
    if (typeof d.site === 'string' && d.site.trim() !== '') {
      return reponse(200, { ok: true }, origine);
    }

    const lire = (cle) => String(d[cle] ?? '').trim().slice(0, CHAMPS_MAX[cle] ?? 200);
    const champs = {
      souci: String(d.souci ?? '').trim(),
      commune: lire('commune'),
      nom: lire('nom'),
      email: lire('email'),
      tel: lire('tel'),
      message: lire('message'),
      estimation: lire('estimation')
    };

    const manques = [];
    if (!SOUCIS[champs.souci]) manques.push('souci');
    if (!champs.nom) manques.push('nom');
    if (!emailValide(champs.email)) manques.push('email');
    if (champs.message.length < 5) manques.push('message');
    if (manques.length) {
      return reponse(422, { erreur: 'Formulaire incomplet.', champs: manques }, origine);
    }

    const lignes = [
      ['Nature du souci', SOUCIS[champs.souci]],
      ['Commune', champs.commune || 'non précisée'],
      ['Nom', champs.nom],
      ['Email', champs.email],
      ['Téléphone', champs.tel || 'non communiqué']
    ];

    const texte = [
      'Nouvelle demande de dépannage',
      '',
      ...lignes.map(([k, v]) => k + ' : ' + v),
      '',
      'Message :',
      champs.message,
      '',
      champs.estimation ? 'Estimation affichée au client : ' + champs.estimation : ''
    ].join('\n');

    const html =
      '<h2 style="font-family:sans-serif">Nouvelle demande de dépannage</h2>' +
      '<table style="font-family:sans-serif;border-collapse:collapse">' +
      lignes.map(([k, v]) =>
        '<tr><td style="padding:4px 12px 4px 0;color:#666">' + echapper(k) + '</td>' +
        '<td style="padding:4px 0"><strong>' + echapper(v) + '</strong></td></tr>').join('') +
      '</table>' +
      '<p style="font-family:sans-serif"><strong>Message :</strong></p>' +
      '<p style="font-family:sans-serif;white-space:pre-wrap">' + echapper(champs.message) + '</p>' +
      (champs.estimation
        ? '<p style="font-family:sans-serif;color:#666;font-size:13px">Estimation affichée au client : ' +
          echapper(champs.estimation) + '</p>'
        : '');

    const objet = 'Demande de dépannage : ' + SOUCIS[champs.souci] +
                  (champs.commune ? ' à ' + champs.commune : '') + ' (' + champs.nom + ')';

    try {
      const msg = createMimeMessage();
      msg.setSender({ name: 'Formulaire OUPS', addr: env.EXPEDITEUR });
      msg.setRecipient(env.DESTINATAIRE);
      // « Répondre » dans le logiciel de messagerie écrit directement au client
      // Reply-To exige une Mailbox, une chaîne est refusée par mimetext
      msg.setHeader('Reply-To', new Mailbox({ addr: champs.email, name: champs.nom }, { type: 'From' }));
      msg.setSubject(objet);
      msg.addMessage({ contentType: 'text/plain', encoding: 'base64', data: enBase64(texte) });
      msg.addMessage({ contentType: 'text/html', encoding: 'base64', data: enBase64(html) });

      await env.EMAIL.send(new EmailMessage(env.EXPEDITEUR, env.DESTINATAIRE, msg.asRaw()));
    } catch (e) {
      console.error('envoi impossible', e);
      return reponse(502, { erreur: 'Le message n’a pas pu être transmis.' }, origine);
    }

    return reponse(200, { ok: true }, origine);
  }
};
