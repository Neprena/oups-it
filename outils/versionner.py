#!/usr/bin/env python3
"""
Estampille les feuilles de style et les scripts d'un paramètre tiré de leur
contenu, par exemple css/styles.css?v=3f8a1c2b.

Pourquoi : GitHub Pages sert tout avec cache-control max-age=600, et le HTML
comme le JavaScript expirent chacun de leur côté. Un visiteur peut donc
recevoir un HTML neuf accompagné d'un script périmé, auquel cas le formulaire
ne répond plus. Comme le paramètre change dès que le fichier change, le
navigateur est obligé de retélécharger, et cette désynchronisation ne peut
plus se produire.

À lancer avant chaque commit touchant au CSS ou au JavaScript :
    python3 outils/versionner.py
"""
import hashlib
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
PAGE = RACINE / 'index.html'
ACTIFS = ['css/styles.css', 'js/scripts.js', 'js/demande.js']

html = PAGE.read_text(encoding='utf-8')
change = False

for actif in ACTIFS:
    fichier = RACINE / actif
    if not fichier.exists():
        print(f'  absent, ignoré : {actif}')
        continue
    empreinte = hashlib.sha1(fichier.read_bytes()).hexdigest()[:8]
    motif = re.compile(re.escape(actif) + r'(\?v=[0-9a-f]+)?')
    neuf, n = motif.subn(f'{actif}?v={empreinte}', html)
    if n == 0:
        print(f'  NON RÉFÉRENCÉ dans index.html : {actif}', file=sys.stderr)
        continue
    if neuf != html:
        change = True
    html = neuf
    print(f'  {actif:<20} v={empreinte}  ({n} référence(s))')

if change:
    PAGE.write_text(html, encoding='utf-8')
    print('index.html mis à jour')
else:
    print('rien à changer, les empreintes sont déjà à jour')
