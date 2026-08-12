#!/usr/bin/env python3
"""Build the bilingual site: SEO head blocks, hreflang pairs, and the French pages.

Run from anywhere:  python3 scripts/build-i18n.py

The English pages under the repo root are the source of truth for markup. This
script rewrites their <head> SEO block in place (idempotent), then regenerates
every French page under /fr/ by applying the translation tables below. Re-run it
after editing any English page, otherwise the two languages drift apart.
"""
import posixpath
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.antoninleclei.com"
IMAGE = f"{SITE}/ImageeeA.png"

# ── Page map ────────────────────────────────────────────────────────────────
# en / fr are file paths; en_url / fr_url are the live URLs (trailingSlash: true).
PAGES = [
    {
        "en": "index.html", "fr": "fr/index.html",
        "en_url": "/", "fr_url": "/fr/",
        "name_en": "Home", "name_fr": "Accueil",
        "title_en": "Antonin Le Cleï | Web Designer & Developer in Montreal",
        "desc_en": "Freelance web designer and front-end developer in Montreal. I design and build high-end websites in Webflow, Shopify and custom code — from brand to launch.",
        "title_fr": "Antonin Le Cleï | Web Designer & Développeur à Montréal",
        "desc_fr": "Web designer et développeur front-end freelance à Montréal. Je conçois et développe des sites web haut de gamme en Webflow, Shopify et code sur mesure.",
    },
    {
        "en": "projects/index.html", "fr": "fr/realisations/index.html",
        "en_url": "/projects/", "fr_url": "/fr/realisations/",
        "name_en": "Projects", "name_fr": "Réalisations",
        "title_en": "Web Design Projects & Case Studies | Antonin Le Cleï",
        "desc_en": "Selected web design and front-end projects by Antonin Le Cleï — AI voice agents, real estate investment modelling, and custom sites built in Montreal.",
        "title_fr": "Réalisations & études de cas en création de site web",
        "desc_fr": "Projets de web design et de développement front-end d'Antonin Le Cleï — agents vocaux IA, modélisation d'investissement immobilier et sites sur mesure.",
    },
    {
        "en": "projects/standia/index.html", "fr": "fr/realisations/standia/index.html",
        "en_url": "/projects/standia/", "fr_url": "/fr/realisations/standia/",
        "name_en": "Standia", "name_fr": "Standia",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "Standia — AI Voice Agents for Inbound Calls | Case Study",
        "desc_en": "Standia deploys custom AI voice agents that answer business calls 24/7 — appointment booking, FAQs and lead qualification. Case study by Antonin Le Cleï.",
        "title_fr": "Standia — agents vocaux IA pour appels entrants",
        "desc_fr": "Standia déploie des agents vocaux IA qui répondent aux appels 24/7 — prise de rendez-vous, FAQ et qualification de prospects. Étude de cas d'Antonin Le Cleï.",
    },
    {
        "en": "projects/fin210/index.html", "fr": "fr/realisations/fin210/index.html",
        "en_url": "/projects/fin210/", "fr_url": "/fr/realisations/fin210/",
        "name_en": "Real Estate Investment Financing", "name_fr": "Financement d'investissement immobilier",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "Real Estate Investment Financing Case Study | FINA 210",
        "desc_en": "A $2.685M multi-residential acquisition in Montreal's Plateau: three-scenario DCF, 11.73% levered IRR and a limited partnership structure. JMSB, Concordia.",
        "title_fr": "Financement d'investissement immobilier | Étude de cas",
        "desc_fr": "Acquisition d'un multilogement de 2,685 M$ sur le Plateau à Montréal : DCF à trois scénarios, TRI avec levier de 11,73 % et montage en société en commandite.",
    },
    {
        "en": "experiences/index.html", "fr": "fr/experiences/index.html",
        "en_url": "/experiences/", "fr_url": "/fr/experiences/",
        "name_en": "Experience", "name_fr": "Expériences",
        "title_en": "Experience | Antonin Le Cleï, Web Designer in Montreal",
        "desc_en": "The professional path of Antonin Le Cleï — web design internships, agency work and freelance front-end development in Montreal.",
        "title_fr": "Expériences | Antonin Le Cleï, Web Designer à Montréal",
        "desc_fr": "Le parcours professionnel d'Antonin Le Cleï — stages en web design, expérience en agence et développement front-end freelance à Montréal.",
    },
    {
        "en": "experiences/digitad/index.html", "fr": "fr/experiences/digitad/index.html",
        "en_url": "/experiences/digitad/", "fr_url": "/fr/experiences/digitad/",
        "name_en": "Digitad Internship", "name_fr": "Stage chez Digitad",
        "parent_en": ("Experience", "/experiences/"), "parent_fr": ("Expériences", "/fr/experiences/"),
        "title_en": "Web Design Internship at Digitad, Montreal | Antonin Le Cleï",
        "desc_en": "Web design intern at Digitad, a Montreal marketing agency: Webflow and Shopify builds, client wireframes and AI-assisted integration automations.",
        "title_fr": "Stage en web design chez Digitad, Montréal | Antonin Le Cleï",
        "desc_fr": "Stage en web design chez Digitad, agence de marketing à Montréal : intégration Webflow et Shopify, wireframes clients et automatisations assistées par IA.",
    },
    # ── Archive case studies. Copy is still placeholder, so these stay out of
    # the index until the real write-ups land (flip noindex to False then).
    {
        "en": "projects/concordia/index.html", "fr": "fr/realisations/concordia/index.html",
        "en_url": "/projects/concordia/", "fr_url": "/fr/realisations/concordia/",
        "name_en": "Concordia Project", "name_fr": "Projet Concordia",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "noindex": True,
        "title_en": "Concordia Project — Student Web Design | Antonin Le Cleï",
        "desc_en": "A student web design project built at Concordia University, Montreal (April 2026). Case study by Antonin Le Cleï — full write-up coming soon.",
        "title_fr": "Projet Concordia — web design étudiant | Antonin Le Cleï",
        "desc_fr": "Un projet de web design étudiant réalisé à l'Université Concordia, Montréal (avril 2026). Étude de cas d'Antonin Le Cleï — détails à venir.",
    },
    {
        "en": "projects/cincta/index.html", "fr": "fr/realisations/cincta/index.html",
        "en_url": "/projects/cincta/", "fr_url": "/fr/realisations/cincta/",
        "name_en": "Cincta", "name_fr": "Cincta",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "noindex": True,
        "title_en": "Cincta — Brand & Web Design Project | Antonin Le Cleï",
        "desc_en": "Cincta, a brand and web design project by Antonin Le Cleï (April 2026). Case study and full write-up coming soon.",
        "title_fr": "Cincta — projet de marque & web design | Antonin Le Cleï",
        "desc_fr": "Cincta, un projet de marque et de web design signé Antonin Le Cleï (avril 2026). Étude de cas et détails complets à venir.",
    },
    {
        "en": "projects/kh-nail-bar/index.html", "fr": "fr/realisations/kh-nail-bar/index.html",
        "en_url": "/projects/kh-nail-bar/", "fr_url": "/fr/realisations/kh-nail-bar/",
        "name_en": "Kh Nail Bar", "name_fr": "Kh Nail Bar",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "noindex": True,
        "title_en": "Kh Nail Bar — Web Design Project | Antonin Le Cleï",
        "desc_en": "Kh Nail Bar, a web design project by Antonin Le Cleï (March 2026). Case study and full write-up coming soon.",
        "title_fr": "Kh Nail Bar — projet de web design | Antonin Le Cleï",
        "desc_fr": "Kh Nail Bar, un projet de web design signé Antonin Le Cleï (mars 2026). Étude de cas et détails complets à venir.",
    },
    {
        "en": "projects/stingers/index.html", "fr": "fr/realisations/stingers/index.html",
        "en_url": "/projects/stingers/", "fr_url": "/fr/realisations/stingers/",
        "name_en": "Stingers", "name_fr": "Stingers",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "noindex": True,
        "title_en": "Stingers — Web Design Project | Antonin Le Cleï",
        "desc_en": "Stingers, a web design project by Antonin Le Cleï (February 2026). Case study and full write-up coming soon.",
        "title_fr": "Stingers — projet de web design | Antonin Le Cleï",
        "desc_fr": "Stingers, un projet de web design signé Antonin Le Cleï (février 2026). Étude de cas et détails complets à venir.",
    },
    {
        "en": "projects/cutsinnit/index.html", "fr": "fr/realisations/cutsinnit/index.html",
        "en_url": "/projects/cutsinnit/", "fr_url": "/fr/realisations/cutsinnit/",
        "name_en": "CutsInnit", "name_fr": "CutsInnit",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "noindex": True,
        "title_en": "CutsInnit — Web Design Project | Antonin Le Cleï",
        "desc_en": "CutsInnit, a web design project by Antonin Le Cleï (January 2026). Case study and full write-up coming soon.",
        "title_fr": "CutsInnit — projet de web design | Antonin Le Cleï",
        "desc_fr": "CutsInnit, un projet de web design signé Antonin Le Cleï (janvier 2026). Étude de cas et détails complets à venir.",
    },
    {
        "en": "documents/index.html", "fr": "fr/documents/index.html",
        "en_url": "/documents/", "fr_url": "/fr/documents/",
        "name_en": "CV & Documents", "name_fr": "CV & documents",
        "title_en": "CV & Documents | Antonin Le Cleï, Web Designer",
        "desc_en": "Download the resume of Antonin Le Cleï in French and English — freelance web designer and front-end developer based in Montreal.",
        "title_fr": "CV & documents | Antonin Le Cleï, Web Designer",
        "desc_fr": "Téléchargez le CV d'Antonin Le Cleï en français et en anglais — web designer et développeur front-end freelance basé à Montréal.",
    },
]

# EN page URL -> FR page URL, used to rewrite internal links inside /fr/ pages.
LINK_MAP = {p["en_url"]: p["fr_url"] for p in PAGES}


# ── Small HTML helpers ──────────────────────────────────────────────────────
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def chars(word):
    """Rebuild the per-character .nav-char stack used by animated labels."""
    out, i = [], 0
    for ch in word:
        if ch == " ":
            out.append('<span class="nav-char-space"></span>')
            continue
        d = "0s" if i == 0 else f".{i * 2:02d}s"
        out.append(
            '<span class="nav-char">'
            f'<span class="nav-char-top" style="transition-delay:{d}">{ch}</span>'
            f'<span class="nav-char-bot" style="transition-delay:{d}">{ch}</span>'
            "</span>"
        )
        i += 1
    return "".join(out)


def swap_text(html, tag, anchor, new, required=True):
    """Replace the inner text of the first <tag> whose text contains `anchor`."""
    pat = re.compile(r"(<" + tag + r"\b[^>]*>)([^<]*" + re.escape(anchor) + r"[^<]*)(</" + tag + r">)", re.S)
    out, n = pat.subn(lambda m: m.group(1) + new + m.group(3), html, count=1)
    if required and n != 1:
        raise SystemExit(f"swap_text miss: <{tag}> {anchor!r}")
    return out


def swap_nav_label(html, section, word):
    pat = re.compile(
        r'(<li class="nav-item" data-section="' + section + r'">.*?<span class="nav-label">)(.*?)'
        r'(</span>\s*<span class="nav-progress-bar">)', re.S)
    out, n = pat.subn(lambda m: m.group(1) + chars(word) + m.group(3), html, count=1)
    if n != 1:
        raise SystemExit(f"nav label miss: {section}")
    return out


def swap_char_run(html, anchor_class, word):
    """Replace the animated label of a hero CTA, keeping its trailing arrow.

    The label is a run of nested .nav-char spans, so it cannot be matched with a
    repeated non-greedy group — that only ever consumes the first character and
    leaves the rest of the English word behind. Rebuild the anchor body instead:
    everything from the first .nav-char up to the arrow span is the label.
    """
    pat = re.compile(r'(<a\b[^>]*class="[^"]*' + anchor_class + r'[^"]*"[^>]*>)(.*?)(</a>)', re.S)

    def rebuild(m):
        inner = m.group(2)
        start = inner.find('<span class="nav-char">')
        arrow = inner.find('<span style="font-size:28px">')
        if start < 0 or arrow < 0:
            raise SystemExit(f"char run shape changed: {anchor_class}")
        return m.group(1) + inner[:start] + chars(word) + " " + inner[arrow:] + m.group(3)

    out, n = pat.subn(rebuild, html, count=1)
    if n != 1:
        raise SystemExit(f"char run miss: {anchor_class}")
    return out


# ── <head>: rebuild the SEO block ───────────────────────────────────────────
STRIP = [
    r"<title>.*?</title>\s*",
    r'<meta\s+name="description"[^>]*>\s*',
    r'<meta\s+name="author"[^>]*>\s*',
    r'<meta\s+name="robots"[^>]*>\s*',
    r'<link\s+rel="canonical"[^>]*>\s*',
    r'<link\s+rel="alternate"\s+hreflang[^>]*>\s*',
    r'<meta\s+property="og:[^"]*"[^>]*>\s*',
    r'<meta\s+name="twitter:[^"]*"[^>]*>\s*',
    r"<!-- Open Graph -->\s*",
    r"<!-- Twitter -->\s*",
    r'<script type="application/ld\+json" data-seo>.*?</script>\s*',
]


def build_head(page, lang):
    title = page[f"title_{lang}"]
    desc = page[f"desc_{lang}"]
    url = SITE + page[f"{lang}_url"]
    locale = "fr_CA" if lang == "fr" else "en_CA"
    alt_locale = "en_CA" if lang == "fr" else "fr_CA"

    crumbs = []
    home_name = "Accueil" if lang == "fr" else "Home"
    home_url = SITE + ("/fr/" if lang == "fr" else "/")
    crumbs.append((home_name, home_url))
    parent = page.get(f"parent_{lang}")
    if parent:
        crumbs.append((parent[0], SITE + parent[1]))
    if page[f"{lang}_url"] not in ("/", "/fr/"):
        crumbs.append((page[f"name_{lang}"], url))

    items = ",\n      ".join(
        '{"@type":"ListItem","position":%d,"name":"%s","item":"%s"}' % (i + 1, esc(n), u)
        for i, (n, u) in enumerate(crumbs)
    )
    ld = ""
    if len(crumbs) > 1:
        ld = (
            '  <script type="application/ld+json" data-seo>\n'
            '  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[\n'
            f"      {items}\n  ]}}\n  </script>\n"
        )

    return (
        f"  <title>{esc(title)}</title>\n"
        f'  <meta name="description" content="{esc(desc)}" />\n'
        '  <meta name="author" content="Antonin Le Cleï" />\n'
        + ('  <meta name="robots" content="noindex, follow" />\n' if page.get("noindex")
           else '  <meta name="robots" content="index, follow" />\n')
        + f'  <link rel="canonical" href="{url}" />\n'
        f'  <link rel="alternate" hreflang="en-ca" href="{SITE}{page["en_url"]}" />\n'
        f'  <link rel="alternate" hreflang="en" href="{SITE}{page["en_url"]}" />\n'
        f'  <link rel="alternate" hreflang="fr-ca" href="{SITE}{page["fr_url"]}" />\n'
        f'  <link rel="alternate" hreflang="fr" href="{SITE}{page["fr_url"]}" />\n'
        f'  <link rel="alternate" hreflang="x-default" href="{SITE}{page["en_url"]}" />\n\n'
        "  <!-- Open Graph -->\n"
        '  <meta property="og:type" content="website" />\n'
        '  <meta property="og:site_name" content="Antonin Le Cleï" />\n'
        f'  <meta property="og:locale" content="{locale}" />\n'
        f'  <meta property="og:locale:alternate" content="{alt_locale}" />\n'
        f'  <meta property="og:title" content="{esc(title)}" />\n'
        f'  <meta property="og:description" content="{esc(desc)}" />\n'
        f'  <meta property="og:url" content="{url}" />\n'
        f'  <meta property="og:image" content="{IMAGE}" />\n\n'
        "  <!-- Twitter -->\n"
        '  <meta name="twitter:card" content="summary_large_image" />\n'
        f'  <meta name="twitter:title" content="{esc(title)}" />\n'
        f'  <meta name="twitter:description" content="{esc(desc)}" />\n'
        f'  <meta name="twitter:image" content="{IMAGE}" />\n'
        + ld
    )


def apply_head(html, page, lang):
    for pat in STRIP:
        html = re.sub(pat, "", html, flags=re.S)
    anchor = re.search(r'<meta name="viewport"[^>]*>\n', html)
    if not anchor:
        raise SystemExit("no viewport meta")
    at = anchor.end()
    return html[:at] + build_head(page, lang) + html[at:]


# ── Language switcher ───────────────────────────────────────────────────────
def switcher(page, lang):
    en_cur = ' aria-current="true"' if lang == "en" else ""
    fr_cur = ' aria-current="true"' if lang == "fr" else ""
    t_en = "Français" if lang == "en" else "View this site in English"
    t_fr = "Voir le site en français" if lang == "en" else "Français"
    label = "Language" if lang == "en" else "Langue"
    return (
        f'        <div class="ui-lang" role="group" aria-label="{label}">\n'
        f'          <a href="{page["en_url"]}"{en_cur} hreflang="en" title="{t_en}">EN</a>\n'
        '          <span class="ui-lang-sep">/</span>\n'
        f'          <a href="{page["fr_url"]}"{fr_cur} hreflang="fr" title="{t_fr}">FR</a>\n'
        "        </div>\n"
    )


CLOCK = '<span class="ui-date" id="clockDate">-- ------- ---- [CA]</span>\n'


def apply_switcher(html, page, lang):
    html = re.sub(r' *<div class="ui-lang"[^>]*>.*?</div>\n', "", html, flags=re.S)
    i = html.find(CLOCK)
    if i < 0:
        raise SystemExit("no clock block")
    at = i + len(CLOCK)
    return html[:at] + switcher(page, lang) + html[at:]


# ── Link normalisation ──────────────────────────────────────────────────────
def to_absolute(html, page_dir):
    """Rewrite relative href/src to root-absolute so /fr/ pages resolve."""
    def fix(m):
        pre, url, post = m.group(1), m.group(2), m.group(3)
        if re.match(r"^(https?:|mailto:|tel:|#|/|data:)", url):
            return m.group(0)
        trailing = url.endswith("/")
        full = posixpath.normpath(posixpath.join("/" + page_dir, url))
        if trailing and not full.endswith("/"):
            full += "/"
        return pre + full + post

    html = re.sub(r'(<[^>]*?\b(?:href|src)=")([^"]+)(")', fix, html)
    # /foo/index.html and /foo are both /foo/ under trailingSlash: true
    html = re.sub(r'((?:href|src)="/[^"]*?)index\.html(")', r"\1\2", html)
    html = re.sub(r'href="(/(?:projects|experiences|documents)(?:/[a-z0-9]+)?)"', r'href="\1/"', html)
    return html


def map_links(html):
    """Point internal page links at their French counterparts."""
    def fix(m):
        pre, url, post = m.group(1), m.group(2), m.group(3)
        return pre + LINK_MAP.get(url, url) + post
    return re.sub(r'(<a[^>]*?\bhref=")([^"]+)(")', fix, html)


# ── Shared UI copy ──────────────────────────────────────────────────────────
COMMON = [
    ('aria-label="Open menu"', 'aria-label="Ouvrir le menu"'),
    ('aria-label="Main navigation"', 'aria-label="Navigation principale"'),
    ("Loading document…", "Chargement du document…"),
    ("✕ &nbsp;Close", "✕ &nbsp;Fermer"),
    ('data-cursor-marquee-text="View more →"', 'data-cursor-marquee-text="En savoir plus →"'),
    (">View more<", ">En savoir plus<"),
]

BACK_WORDS = {"BACK": "RETOUR"}


BACK_ANCHOR = re.compile(
    r'(<a\b[^>]*class="[^"]*(?:projects-back|exp-back|documents-back|proj-back)[^"]*"[^>]*>)(.*?)(</a>)',
    re.S)


def translate_common(html):
    for a, b in COMMON:
        html = html.replace(a, b)

    # The animated BACK link is a run of nested .nav-char spans that reaches the
    # end of the anchor, so rebuild everything after the arrow rather than
    # trying to match the nesting.
    def back(m):
        inner = m.group(2)
        cut = inner.find('<span class="nav-char">')
        if cut < 0:
            return m.group(0)
        return m.group(1) + inner[:cut] + chars("RETOUR") + m.group(3)

    return BACK_ANCHOR.sub(back, html, count=1)


# ── Per-page French copy ────────────────────────────────────────────────────
def fr_home(h):
    h = swap_nav_label(h, "info", "INFOS")
    h = swap_nav_label(h, "work", "RÉALISATIONS")
    h = swap_nav_label(h, "archive", "ARCHIVES")
    h = swap_nav_label(h, "contact", "CONTACT")
    h = swap_char_run(h, "hero-projects-cta", "PROJETS")
    h = swap_char_run(h, "hero-experiences-cta", "EXPÉRIENCES")
    for a, b in [
        ('<span class="mobile-menu-num">01</span> INFO', '<span class="mobile-menu-num">01</span> INFOS'),
        ('<span class="mobile-menu-num">02</span> WORK', '<span class="mobile-menu-num">02</span> RÉALISATIONS'),
        ('<span class="mobile-menu-num">03</span> ARCHIVE', '<span class="mobile-menu-num">03</span> ARCHIVES'),
    ]:
        h = h.replace(a, b)
    h = h.replace(
        """Turning brand identity into immersive
digital journeys. I create meaningful
experiences that people don't just use,
they remember.""",
        """Transformer une identité de marque en
parcours numériques immersifs. Je crée des
expériences que l'on ne fait pas qu'utiliser,
on s'en souvient.""")
    h = h.replace("[SCROLL TO EXPLORE]", "[DÉFILEZ POUR EXPLORER]")
    h = h.replace('aria-hidden="true">About</h2>', 'aria-hidden="true">À propos</h2>')
    h = h.replace('<span id="portal-about">About</span>', '<span id="portal-about">À propos</span>')
    h = swap_text(h, "p", "Freelance web designer & front-end developer based in Montreal",
                  "Web designer et développeur front-end freelance basé à Paris. "
                  "Je conçois, développe et mets en ligne des sites web complets — de l'identité "
                  "de marque au produit optimisé et en production — pour des startups, des agences "
                  "et des marques créatives.")
    h = swap_text(h, "h3", "AI-Driven Design", "Design & direction artistique assistés par IA")
    h = swap_text(h, "p", "I design premium interfaces",
                  "Je conçois des interfaces haut de gamme et des visuels de marque, en m'appuyant "
                  "sur Claude et les outils IA que je maîtrise pour passer du concept à une interface "
                  "aboutie sans rien perdre du métier. Un travail original et fidèle à la marque — "
                  "produit vite et avec intention.")
    h = swap_text(h, "h3", "Webflow, Shopify & Front-End Build", "Développement Webflow, Shopify & front-end")
    h = swap_text(h, "p", "I build and ship production sites",
                  "Je développe et mets en production des sites Webflow — structurés et industrialisés "
                  "avec Relume — des boutiques Shopify pour l'e-commerce, et des front-ends codés à la "
                  "main quand le projet l'exige. Des mises en page au pixel près, animées avec GSAP et "
                  "d'autres librairies d'animation.")
    h = swap_text(h, "h3", "SEO, Meta & Conversion", "SEO, métadonnées & conversion")
    h = swap_text(h, "p", "Technical SEO, correctly configured",
                  "SEO technique, balises meta et données structurées correctement configurées, et des "
                  "choix orientés conversion à chaque étape du projet. Votre site se positionne, "
                  "s'affiche proprement au partage, et transforme le trafic en vrais clients.")
    h = swap_text(h, "h2", "03 — Archive", "03 — Archives")
    h = h.replace('aria-label="Concordia Student Project"', 'aria-label="Projet étudiant Concordia"')
    h = swap_text(h, "h3", "Concordia Project", "Projet Concordia")
    for a, b in [("[ APRIL 2026 ]", "[ AVRIL 2026 ]"), ("[ MARCH 2026 ]", "[ MARS 2026 ]"),
                 ("[ FEBRUARY 2026 ]", "[ FÉVRIER 2026 ]"), ("[ JANUARY 2026 ]", "[ JANVIER 2026 ]")]:
        h = h.replace(a, b)
    h = swap_text(h, "span", "Let's", "Collaborons")
    h = h.replace("<em>collaborate.</em>", "<em>ensemble.</em>")
    h = h.replace("© 2026 Antonin Le Cleï — All rights reserved", "© 2026 Antonin Le Cleï — Tous droits réservés")
    h = h.replace("More Documents →", "Plus de documents →")
    # ProfilePage JSON-LD describes the French page now
    h = h.replace('"url": "https://www.antoninleclei.com/",\n    "mainEntity"',
                  '"url": "https://www.antoninleclei.com/fr/",\n    "mainEntity"')
    h = h.replace('"jobTitle": "Web Designer & Front-End Developer",',
                  '"jobTitle": "Web Designer & Développeur Front-End",')
    h = h.replace('"knowsAbout": ["Web Design", "Front-End Development", "UI/UX Design",',
                  '"knowsAbout": ["Web Design", "Développement Front-End", "Design UI/UX",')
    return h


def fr_projects(h):
    h = swap_text(h, "p", "Projects", "Réalisations")
    h = h.replace("● IN PROGRESS", "● EN COURS")
    h = h.replace("Montreal &nbsp;·&nbsp; 2026", "Montréal &nbsp;·&nbsp; 2026")
    h = swap_text(h, "p", "AI voice agents that handle inbound calls",
                  "Des agents vocaux IA qui prennent les appels entrants des entreprises — sans intervention humaine.")
    h = swap_text(h, "p", "Multi-residential income property analysis",
                  "Analyse d'un immeuble à revenus multilogements.")
    h = h.replace("View Project", "Voir le projet")
    h = h.replace('data-cursor-marquee-text="View Project"', 'data-cursor-marquee-text="Voir le projet"')
    return h


def fr_standia(h):
    # the status badge is a bare text node, not wrapped in its own tag
    h = h.replace("</span>\n        In Progress\n", "</span>\n        En cours\n")
    h = h.replace(">In Progress<", ">En cours<")
    for a, b in [(">Status<", ">Statut<"), (">Year<", ">Année<"), (">Location<", ">Lieu<"),
                 (">Montreal<", ">Montréal<"), (">AI Agency<", ">Agence IA<"),
                 ("— AI Agency", "— Agence IA"), ("Project details", "Détails du projet"),
                 (">Coming<", ">Bientôt<"), (">Soon<", ">disponible<")]:
        h = h.replace(a, b)
    h = swap_text(h, "p", "Standia is an AI agency built around one core idea",
                  "Standia est une agence IA construite autour d'une idée simple : votre téléphone ne "
                  "devrait jamais sonner dans le vide. Nous déployons des agents vocaux IA sur mesure "
                  "qui prennent les appels entrants pour le compte des entreprises — cabinets dentaires, "
                  "salles de sport, cabinets d'avocats, entreprises de services — toute organisation qui "
                  "perd de la valeur dès qu'un appel bascule sur la boîte vocale ou qu'aucune "
                  "réceptionniste n'est disponible.")
    h = swap_text(h, "p", "Each agent is trained on the client",
                  "Chaque agent est entraîné sur les processus propres au client : prise de rendez-vous, "
                  "réponses aux questions fréquentes, qualification des prospects, transfert des appels "
                  "urgents à la bonne personne. Le résultat : une expérience d'appel fluide, disponible "
                  "24 h/24 et 7 j/7, pour une fraction du coût d'une réceptionniste.")
    h = swap_text(h, "p", "Standia is currently in active development",
                  "Standia est en développement actif. Plus de détails, des études de cas et l'offre "
                  "complète seront disponibles prochainement.")
    h = swap_text(h, "p", "Full case study", "Étude de cas complète & détails du produit — bientôt en ligne.")
    return h


def fr_fin210(h):
    h = h.replace("Real Estate", "Financement d'investissement").replace("Investment Financing", "immobilier")
    for a, b in [(">Course<", ">Cours<"), (">Team<", ">Équipe<"), (">Year<", ">Année<"),
                 ("John Molson School", "John Molson School"), ("FINA 210 — Finance", "FINA 210 — Finance")]:
        h = h.replace(a, b)
    h = swap_text(h, "p", "For this project, my two partners and I",
                  "Pour ce projet, mes deux coéquipiers et moi avons agi comme une équipe "
                  "d'investissement immobilier présentant une transaction réelle devant un jury de "
                  "professeurs. Nous avons sélectionné un immeuble à revenus multilogements situé au "
                  "4874–4896 rue Drolet, dans le Plateau-Mont-Royal à Montréal — un prix demandé de "
                  "2 685 000 $, entièrement loué et ne nécessitant aucune rénovation. L'objectif : "
                  "déterminer si l'acquisition générait un rendement ajusté au risque suffisant pour "
                  "les investisseurs en capitaux propres, et bâtir un dossier d'investissement solide "
                  "de A à Z.")
    h = swap_text(h, "p", "I led the financial modelling work",
                  "J'ai dirigé le volet modélisation financière. Nous avons construit sous Excel un "
                  "modèle DCF complet à trois scénarios — pessimiste, de base et optimiste — chacun "
                  "avec ses propres hypothèses de croissance des revenus, d'indexation des charges, de "
                  "conditions hypothécaires et de taux de capitalisation à la sortie. J'ai calculé les "
                  "TRI et VAN avec et sans levier pour chaque scénario, je les ai comparés à des taux "
                  "de rendement minimaux dérivés du CMPC et du coût des capitaux propres, puis j'ai "
                  "soumis le modèle à des tests de résistance face à une détérioration réaliste du "
                  "marché. Dans le scénario de base, l'investissement dégage un TRI avec levier de "
                  "11,73 % contre un seuil exigé de 8,27 %, soit une VAN avec levier positive de "
                  "+165 008 $.")
    h = swap_text(h, "p", "Beyond the numbers, we conducted",
                  "Au-delà des chiffres, nous avons mené une analyse rigoureuse du sous-marché du "
                  "Plateau-Mont-Royal — taux d'inoccupation, loyers moyens du marché, transactions "
                  "comparables et taux de capitalisation, mises en chantier et indicateurs "
                  "macroéconomiques, dont la trajectoire des taux du FOMC et l'inflation des loyers "
                  "mesurée par l'IPC canadien. Nous avons profilé en détail le locataire type du "
                  "quartier : niveaux de revenus, répartition par âge, scolarité et modes "
                  "d'occupation — autant d'éléments qui ont directement nourri nos hypothèses de "
                  "croissance des revenus et nos provisions pour inoccupation.")
    h = swap_text(h, "p", "We structured the deal as a limited partnership",
                  "Nous avons structuré la transaction en société en commandite avec une hypothèque de "
                  "premier rang à 65 %, 17,5 % de capitaux propres du commandité (notre équipe) et "
                  "17,5 % de capitaux propres de commanditaires externes — une capitalisation totale "
                  "de 2 738 700 $. Nous avons défini les conditions offertes aux investisseurs, "
                  "modélisé le paiement forfaitaire de l'année 5 et présenté le cadre complet "
                  "d'identification et d'atténuation des risques. Le livrable final : un deck "
                  "d'investisseurs de 21 diapositives et un rapport écrit en 10 sections, tous deux "
                  "téléchargeables ci-dessous.")
    return h


def fr_experiences(h):
    h = swap_text(h, "p", "05 — Experiences", "05 — Expériences")
    h = swap_text(h, "h1", "Experiences", "Expériences")
    h = swap_text(h, "p", "Scroll or drag to spin", "Faites défiler ou glissez pour faire tourner →")
    h = swap_text(h, "h3", "Internship in Web Design", "Stage en web design")
    h = swap_text(h, "p", "June 2026", "Juin 2026")
    h = h.replace(">Role title<", ">Intitulé du poste<").replace(">Company · Location<", ">Entreprise · Lieu<")
    return h


def fr_digitad(h):
    h = swap_text(h, "p", "Experience — Internship", "Expérience — Stage", required=False)
    h = h.replace("Experience — Internship", "Expérience — Stage")
    h = h.replace(">Internship in<", ">Stage en<").replace(">Web Design<", ">web design<")
    for a, b in [(">Company<", ">Entreprise<"), (">Role<", ">Poste<"), (">Date<", ">Date<"),
                 (">Location<", ">Lieu<"), ("Web Design Intern", "Stagiaire en web design"),
                 ("June 2026", "Juin 2026"), ("What I did", "Ce que j'ai fait"),
                 ("Tools &amp; skills", "Outils & compétences"), (">Outcome<", ">Résultat<"),
                 (">Gallery<", ">Galerie<"), ("Website Creation — Webflow", "Création de site — Webflow"),
                 ("Offsite Team Building", "Team building hors site"),
                 ("Website Integration — Shopify", "Intégration de site — Shopify"),
                 ("Wireframes / AI Automation", "Wireframes / automatisation IA")]:
        h = h.replace(a, b)
    h = swap_text(h, "p", "During my internship at Digitad",
                  "Durant mon stage chez Digitad, une agence de marketing montréalaise, je me suis "
                  "concentré sur l'intégration de contenu et sur la création d'automatisations rendant "
                  "cette intégration plus rapide et plus fiable sur l'ensemble des sites clients.")
    h = swap_text(h, "p", "I conceptualized wireframes",
                  "J'ai conçu des wireframes et je les ai présentés directement aux clients, avant de "
                  "les transformer en maquettes finalisées. J'ai imaginé et développé des sites complets "
                  "sur Webflow et Shopify, intégré du contenu dans les sites clients et mis en place des "
                  "flux d'intégration automatisés — transformant un processus manuel et répétitif en "
                  "chaîne de production fluide. J'ai travaillé avec toute la stack de l'agence pour "
                  "livrer des pages rapidement, sans sacrifier la qualité.")
    h = swap_text(h, "p", "I sharpened my command of AI-assisted",
                  "J'ai affûté ma maîtrise des workflows assistés par IA et des outils no-code et de "
                  "gestion de projet de l'agence :")
    h = swap_text(h, "p", "The automations cut down integration time",
                  "Les automatisations ont fortement réduit le temps d'intégration, permettant à "
                  "l'équipe de se concentrer sur le design et la stratégie. J'en suis ressorti à l'aise "
                  "avec la production assistée par IA, le développement no-code et la gestion de projet "
                  "en agence.")
    return h


def fr_documents(h):
    h = swap_text(h, "p", "Documents", "Documents")
    h = h.replace("Français &nbsp;·&nbsp; 2026", "Français &nbsp;·&nbsp; 2026")
    h = h.replace("English &nbsp;·&nbsp; 2026", "Anglais &nbsp;·&nbsp; 2026")
    h = h.replace(">View <", ">Voir <")
    h = h.replace('data-name="Curriculum Vitae — FR"', 'data-name="Curriculum Vitae — FR"')
    return h


def fr_archive(h):
    """Shared copy of the five archive case studies (still scaffolding)."""
    for a, b in [
        (">Type<", ">Type<"), (">Year<", ">Année<"), (">Date<", ">Date<"), (">Role<", ">Rôle<"),
        (">Web Design<", ">Web design<"), ("Design &amp; Build", "Design & développement"),
        ("— Student Web Design", "— web design étudiant"), ("— Brand & Web", "— marque & web"),
        ("— Web Design", "— web design"),
        ("Concordia Project", "Projet Concordia"),
        ("April 2026", "Avril 2026"), ("March 2026", "Mars 2026"),
        ("February 2026", "Février 2026"), ("January 2026", "Janvier 2026"),
        ("Case study</span>", "Étude de cas</span>"),
        (">Coming <", ">Bientôt <"), ("<em>Soon</em>", "<em>disponible</em>"),
        ("Full write-up &amp; project details — launching shortly.",
         "Article complet & détails du projet — bientôt en ligne."),
        ("WRITE THE INTRO HERE — what the project is, who it was for, and what\n"
         "            problem it solved. Replace this paragraph.",
         "ÉCRIS L'INTRO ICI — ce qu'est le projet, pour qui, et le problème résolu.\n"
         "            Remplace ce paragraphe."),
        ("WRITE THE PROCESS HERE — the approach, the tools, the decisions that\n"
         "            shaped the result. Replace this paragraph.",
         "ÉCRIS LE PROCESSUS ICI — l'approche, les outils, les décisions qui ont\n"
         "            façonné le résultat. Remplace ce paragraphe."),
    ]:
        h = h.replace(a, b)
    return h


TRANSLATORS = {
    "index.html": fr_home,
    "projects/concordia/index.html": fr_archive,
    "projects/cincta/index.html": fr_archive,
    "projects/kh-nail-bar/index.html": fr_archive,
    "projects/stingers/index.html": fr_archive,
    "projects/cutsinnit/index.html": fr_archive,
    "projects/index.html": fr_projects,
    "projects/standia/index.html": fr_standia,
    "projects/fin210/index.html": fr_fin210,
    "experiences/index.html": fr_experiences,
    "experiences/digitad/index.html": fr_digitad,
    "documents/index.html": fr_documents,
}


# ── Build ───────────────────────────────────────────────────────────────────
def main():
    for page in PAGES:
        src = ROOT / page["en"]
        html = src.read_text(encoding="utf-8")
        page_dir = posixpath.dirname(page["en"])

        # 1. English page, patched in place
        en = apply_head(html, page, "en")
        en = apply_switcher(en, page, "en")
        src.write_text(en, encoding="utf-8")

        # 2. French page
        fr = to_absolute(en, page_dir)
        fr = fr.replace('<html lang="en">', '<html lang="fr">')
        fr = apply_head(fr, page, "fr")
        fr = translate_common(fr)
        fr = TRANSLATORS[page["en"]](fr)
        fr = map_links(fr)
        # After map_links: it rewrites every internal link to its French
        # counterpart, which would also drag the switcher's English link over to
        # the French URL and leave no way back.
        fr = apply_switcher(fr, page, "fr")

        out = ROOT / page["fr"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(fr, encoding="utf-8")
        print(f"  {page['en']:<32} -> {page['fr']}")

    # 3. Sitemap with hreflang alternates
    urls = []
    for page in PAGES:
        if page.get("noindex"):
            continue  # keep placeholder pages out of the sitemap too
        prio = "1.0" if page["en_url"] == "/" else "0.8"
        for lang in ("en", "fr"):
            loc = SITE + page[f"{lang}_url"]
            alts = "".join(
                f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{SITE}{page[k]}" />'
                for h, k in (("en", "en_url"), ("fr", "fr_url"), ("x-default", "en_url"))
            )
            urls.append(
                f"  <url>\n    <loc>{loc}</loc>{alts}\n"
                f"    <changefreq>monthly</changefreq>\n    <priority>{prio}</priority>\n  </url>"
            )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(urls) + "\n</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print(f"  sitemap.xml -> {len(urls)} urls")


if __name__ == "__main__":
    main()
