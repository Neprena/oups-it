# OUPS, mon ordi !

Site vitrine de Yann Rapenne, dépannage informatique à Avenches et dans le Vully.

Site statique, sans étape de construction : HTML, CSS et JavaScript écrits à la main,
publiés par GitHub Pages depuis la branche `main`.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | La page entière, y compris le plan de la zone en SVG et le JSON-LD |
| `css/styles.css` | Feuille de style unique, découpée en 16 sections commentées |
| `js/scripts.js` | Année du pied de page, conditions générales, lien de navigation actif |
| `img/logo.svg` | **Source** du logo (2,4 Mo). Jamais servi au visiteur. |
| `img/mascotte.*` | Mascotte découpée depuis le SVG, servie en WebP (56 Ko) |
| `img/lettrage.png` | Lettrage « OUPS, mon ordi ! » découpé depuis le SVG |
| `img/og-image.png` | Vignette de partage sur les réseaux, 1200 × 630 |
| `js/demande.js` | Formulaire de demande : choix guidés, estimation en direct, envoi |
| `worker/` | Worker Cloudflare qui reçoit le formulaire et l'envoie par email |

Les chemins d'actifs sont **relatifs**, donc le site fonctionne aussi bien à la racine
d'un domaine que sous un sous-dossier.

## Règles à respecter en modifiant le site

Le public visé a 50 ans et plus. Ces règles priment sur toute considération esthétique :

- texte courant à 20 px, **rien sous 16 px** ;
- toute cible cliquable fait **60 px de haut** au minimum ;
- **liens toujours soulignés**, la couleur seule ne signale jamais un lien ;
- aucune information ne dépend du survol ;
- séparer par l'espace, pas par le trait : filets de 1 px, une seule ombre portée
  sur tout le site (celle de la barre d'appel mobile).

## Ne pas régresser sur le poids

La page complète pèse **165 Ko**, polices comprises, contre environ 2569 Ko avant refonte.
Deux pièges qui l'avaient fait exploser :

- **ne jamais servir `img/logo.svg`** (2,4 Mo, 20 794 tracés). Pour changer la mascotte,
  ré-exporter depuis le SVG en WebP.
- **les polices Google** : les axes de Fraunces sont figés et Nunito Sans est demandée en
  plage variable `400..700`. Redemander trois graisses séparées coûterait 108 Ko de plus.

## Points laissés ouverts

1. **Horaires d'ouverture** : volontairement absents du site et du JSON-LD. L'ancienne
   version annonçait 7 jours sur 7 de 8h à 20h, ce qui était invraisemblable.
2. **Délai d'intervention** : la question manque dans la FAQ, car la réponse engage.
   Un commentaire HTML marque son emplacement, dans `index.html` et dans le JSON-LD.
3. **Les 13 communes** desservies sont une proposition. Les modifier demande de toucher
   trois endroits : la liste, le plan SVG et `areaServed` du JSON-LD.
4. **Une photo de Yann** remplacerait avantageusement la mascotte dans « Qui suis-je ».
   Un commentaire HTML marque l'emplacement.
5. **Article 4 des conditions générales** : il mentionne le paiement par carte bancaire,
   que la page n'annonce pas. Texte juridique laissé intact, à trancher.
6. **Le logo imprimé** porte `yann@oups-ordi.ch`, le site affiche `contact@oups.it`.
7. **L'article 9 des conditions générales** ne mentionne ni le formulaire, ni Calendly, alors que
   des données personnelles transitent désormais par Cloudflare et par Calendly.
8. **L'offre Calendly gratuite ne permet qu'un type d'événement.** Le bloc de réservation annonce
   donc un premier échange à distance. Distinguer « à distance » et « à domicile » demanderait
   l'offre payante.

## Formulaire de demande

Le site étant statique, il n'a aucun serveur pour recevoir un formulaire. Le dossier `worker/`
contient un Worker Cloudflare qui joue ce rôle : il reçoit la demande et vous l'envoie par email.
**Aucun prestataire tiers ne voit passer les messages de vos clients**, contrairement à un service
de formulaire hébergé.

Le Worker est déployé sur `https://oups-contact.yann-99a.workers.dev` et fonctionne.

### ⚠️ N'essayez jamais d'envoyer depuis @oups.it

C'est le piège de ce projet, et il coûterait cher.

`oups.it` a sa messagerie chez **Infomaniak** : `MX mta-gw.infomaniak.ch` et un SPF strict
`v=spf1 include:spf.infomaniak.ch -all`. Activer Cloudflare Email Routing sur ce domaine, ce que
la logique commande pourtant pour « rendre l'expéditeur cohérent », **remplacerait les MX et
ajouterait un second SPF**. Deux SPF sur un domaine les invalident tous les deux : le courrier
d'oups.it partirait en spam, quand il ne serait pas simplement perdu.

L'expéditeur est donc `formulaire@npna.ch`, seule zone du compte où Email Routing est déjà actif.
Personne d'autre que vous ne voit cet expéditeur, et l'en-tête `Reply-To` pointe sur le client :
« Répondre » écrit bien au bon destinataire.

### Les trois valeurs de configuration

Tout est regroupé dans le bloc `CONFIG` en tête de `js/demande.js` :

| Valeur | Effet si on la vide |
|---|---|
| `workerUrl` | Le formulaire ouvre le logiciel de messagerie du visiteur avec tout de pré-rempli |
| `calendlyUrl` | Un encadré prend la place du calendrier |
| `durees` | La ligne « durée habituelle » disparaît de l'estimation |

**`durees` doit ne contenir que vos chiffres réels.** Ils s'affichent au client avant qu'il ne
vous contacte : ils vous engagent. Ils valent aujourd'hui 1 à 2 heures pour tous les types.

### Redéployer le Worker

```sh
cd worker && npx wrangler deploy
```

### Deux pièges de la bibliothèque mimetext

Trouvés à l'exécution, à ne pas réintroduire :

- **`Reply-To` n'accepte pas une chaîne.** Il faut une `Mailbox`, sinon l'envoi échoue avec
  `MIMETEXT_INVALID_HEADER_VALUE`.
- **mimetext déclare l'encodage mais n'encode pas.** Lui annoncer `base64` en lui passant du texte
  brut produit du charabia chez le destinataire, et son défaut `7bit` transporte des octets UTF-8,
  ce qui n'est pas conforme. Les corps sont donc encodés à la main, découpés à 76 caractères.

### Ce qui protège le formulaire

- **Contrôle d'origine** : seules les adresses listées dans `ORIGINES` peuvent poster.
- **Piège à robots** : un champ masqué que seul un robot remplit. S'il est rempli, le Worker
  répond « succès » sans rien envoyer, pour ne pas renseigner le robot.
- **Limiteur** : 5 envois par minute et par adresse IP.
- **Échappement** : le contenu du message est neutralisé avant d'entrer dans l'email.

Si vous modifiez le Worker, rejouez les tests avant de déployer : ils couvrent le contrôle
d'origine, le piège à robots, la validation et l'échappement HTML.

## Calendly

Le calendrier n'est chargé **qu'après l'envoi du formulaire**, jamais avant : aucun cookie tiers
n'est déposé chez un visiteur qui se contente de lire la page. Le nom, l'email et la nature du
souci sont transmis à Calendly en pré-remplissage.

L'offre gratuite de Calendly ne permet qu'**un seul type d'événement**. Distinguer « à distance »
et « à domicile », qui n'ont ni la même durée ni le même tarif, demande l'offre payante.

Pensez à mentionner Calendly dans l'article 9 de vos conditions générales, puisque des données
transitent par ce prestataire.

## Domaine

Le domaine visé est `www.oups.it`. Le fichier `CNAME` sera ajouté **une fois le DNS
basculé vers GitHub Pages**, pas avant : tant qu'il est absent, le site reste consultable
à l'adresse de repli en `github.io`, ce qui permet de le vérifier.
