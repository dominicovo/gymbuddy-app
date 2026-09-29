"""Builds the App Store marketing frames as HTML, one file per frame.

Rendered with headless Chrome at the exact App Store size. 1rem = 10px at
1284 px wide, so every measurement scales with the canvas width.
"""
import os
import html

SHOTS = os.path.expanduser('~/Desktop/GymBuddy-Screenshots')
OUT = os.path.dirname(os.path.abspath(__file__))

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    'family=Inter+Tight:wght@500;600;700;800&family=Instrument+Serif:ital@1'
    '&family=Barlow+Condensed:wght@700;800&display=block">'
)

CSS = """
:root {
  --ink: #08070C; --ink-2: #131219; --ink-3: #1D1B26; --line: rgba(255,255,255,.10);
  --purple: #8B84F0; --purple-hi: #A79FFF; --lav: #ECEAFB; --lav-ink: #15122B;
  --text: #F6F5FA; --muted: #A09DAE; --green: #5FD08F; --amber: #F0B35B;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: calc(100vw / 128.4); }
body {
  width: 100vw; height: 100vh; overflow: hidden; position: relative;
  font-family: 'Inter Tight', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
}
.dark { background: var(--ink); color: var(--text); }
.light { background: var(--lav); color: var(--lav-ink); }
.brand { background: var(--purple); color: var(--ink); }

/* soft glow behind the phone, from the brand colour */
.glow { position: absolute; width: 130rem; height: 130rem; border-radius: 50%;
  left: 50%; top: 118rem; transform: translateX(-50%); filter: blur(12rem); opacity: .55; }
.dark .glow { background: radial-gradient(circle, rgba(139,132,240,.55), transparent 62%); }
.light .glow { background: radial-gradient(circle, rgba(139,132,240,.45), transparent 62%); }
.brand .glow { background: radial-gradient(circle, rgba(255,255,255,.35), transparent 60%); }

.top { position: absolute; left: 9rem; right: 9rem; top: 15rem; text-align: center; }
.eyebrow { font-weight: 700; font-size: 3.4rem; letter-spacing: .32em; text-transform: uppercase; }
.dark .eyebrow { color: var(--purple); }
.light .eyebrow { color: #6C64E0; }
.brand .eyebrow { color: rgba(8,7,12,.62); }
h1 { font-weight: 800; font-size: 13.2rem; line-height: .98; letter-spacing: -.035em; margin-top: 3.4rem; text-wrap: balance; }
h1 em { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; letter-spacing: -.01em; font-size: 1.12em; }
.dark h1 em { color: var(--purple-hi); }
.light h1 em { color: #6C64E0; }
.brand h1 em { color: #fff; }
.sub { font-weight: 500; font-size: 4.4rem; line-height: 1.3; margin-top: 3.6rem; }
.dark .sub { color: var(--muted); }
.light .sub { color: #56527A; }
.brand .sub { color: rgba(8,7,12,.72); }

/* phone */
.phone { position: absolute; width: 100rem; left: 50%; top: 72rem; transform: translateX(-50%) rotate(var(--tilt, 0deg));
  padding: 1.8rem; border-radius: 14.8rem; background: #0B0A10;
  box-shadow: 0 0 0 .5rem #2A2833, 0 6rem 14rem rgba(8,7,12,.55); }
.light .phone { box-shadow: 0 0 0 .5rem #2A2833, 0 6rem 14rem rgba(40,30,120,.35); }
.phone img { display: block; width: 100%; border-radius: 13rem; }

/* floating cards */
.card { position: absolute; border-radius: 4.4rem; padding: 4rem 4.4rem; background: var(--ink-2);
  border: .3rem solid var(--line); box-shadow: 0 4rem 10rem rgba(8,7,12,.5); color: var(--text); }
.light .card, .brand .card { box-shadow: 0 4rem 10rem rgba(20,10,80,.35); }
.row { display: flex; align-items: center; gap: 3rem; }
.icon { width: 11rem; height: 11rem; border-radius: 3.2rem; display: grid; place-items: center; flex: none; }
.icon svg { width: 6rem; height: 6rem; }
.ok { background: rgba(95,208,143,.16); color: var(--green); }
.acc { background: rgba(139,132,240,.18); color: var(--purple-hi); }
.warn { background: rgba(240,179,91,.16); color: var(--amber); }
.card-title { font-weight: 700; font-size: 4.6rem; line-height: 1.15; }
.card-sub { font-weight: 500; font-size: 3.5rem; color: var(--muted); margin-top: .8rem; line-height: 1.3; }
.chip { position: absolute; display: inline-flex; align-items: center; gap: 2rem; padding: 2.6rem 4rem; border-radius: 99rem;
  font-weight: 700; font-size: 3.8rem; background: var(--ink); color: var(--text); box-shadow: 0 3rem 8rem rgba(8,7,12,.4); }
.chip svg { width: 4.6rem; height: 4.6rem; color: var(--purple-hi); }
.dark .chip { background: var(--purple); color: var(--ink); }
.dark .chip svg { color: var(--ink); }
.num { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; letter-spacing: -.01em; }

/* privacy frame */
.list { position: absolute; left: 8rem; right: 8rem; top: 84rem; display: flex; flex-direction: column; gap: 4.4rem; }
.list .card { position: static; padding: 5.2rem 5rem; }
.list .icon { width: 13rem; height: 13rem; }
.list .icon svg { width: 7rem; height: 7rem; }
.list .card-title { font-size: 5.2rem; }
.list .card-sub { font-size: 4rem; }
/* iOS notification, enlarged */
.notif { position: absolute; left: 50%; transform: translateX(-50%); width: 112rem; border-radius: 6rem; padding: 4.4rem 4.6rem;
  background: rgba(236,234,251,.9); backdrop-filter: blur(3rem); color: #111;
  box-shadow: 0 5rem 12rem rgba(8,7,12,.6); display: flex; gap: 3.6rem; align-items: center; }
.notif img { width: 13rem; height: 13rem; border-radius: 3.2rem; flex: none; }
.notif .t { font-weight: 700; font-size: 5.2rem; }
.notif .b { font-weight: 500; font-size: 4.3rem; color: #333; margin-top: .6rem; line-height: 1.25; }
.notif .when { position: absolute; right: 4.6rem; top: 4.2rem; font-size: 3.8rem; color: #666; font-weight: 500; }
/* buddy row card */
.buddy { display: flex; align-items: center; gap: 3.2rem; }
.avatar { width: 13rem; height: 13rem; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 4.8rem; flex: none; }
.nudge-btn { width: 11.5rem; height: 11.5rem; border-radius: 50%; display: grid; place-items: center; background: rgba(240,179,91,.18); color: var(--amber); flex: none; }
.nudge-btn svg { width: 5.6rem; height: 5.6rem; }
.person { position: absolute; filter: drop-shadow(0 3rem 5rem rgba(8,7,12,.35)); }
.wordmark { position: absolute; left: 50%; bottom: 17rem; transform: translateX(-50%); height: 6.6rem; }
"""

ICONS = {
    'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    'lock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>',
    'camera': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    'pinoff': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.75 7.09a3 3 0 0 1 2.16 2.16"/><path d="M17.07 12.62A8 8 0 0 0 20 10a8 8 0 0 0-12.38-6.68"/><path d="m2 2 20 20"/><path d="M5.33 5.39A8 8 0 0 0 4 10c0 6 8 12 8 12s2.6-2 4.7-4.87"/></svg>',
    'trash': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    'moon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    'flame': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-1.9.8-3.2 1.8-4.2.2 1.5 1 2.4 2 2.7C11 8 10.6 5 12 2Z"/></svg>',
    'megaphone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
}


PEOPLE = os.path.join(OUT, 'people')


def person(name, style):
    return f'<img class="person" src="file://{PEOPLE}/{name}.png" style="{style}">'


def phone(shot, tilt=0, top=None):
    style = f'--tilt:{tilt}deg;' + (f'top:{top}rem;' if top is not None else '')
    return f'<div class="phone" style="{style}"><img src="file://{SHOTS}/{shot}"></div>'


def headline(eyebrow, h1, sub=None):
    s = f'<div class="top"><p class="eyebrow">{eyebrow}</p><h1>{h1}</h1>'
    if sub:
        s += f'<p class="sub">{html.escape(sub)}</p>'
    return s + '</div>'


def card(icon, tone, title, sub, style):
    return (f'<div class="card" style="{style}"><div class="row"><div class="icon {tone}">{ICONS[icon]}</div>'
            f'<div><p class="card-title">{title}</p><p class="card-sub">{sub}</p></div></div></div>')


FRAMES = {
    '01-lock': ('dark',
        headline('GymBuddy', 'Locked until <em>you show up.</em>')
        + phone('01-today.png', top=66)
        + '<div class="chip" style="left:5rem;top:196rem;transform:rotate(-4deg)">' + ICONS['lock'] + 'Real Screen Time blocking</div>'),
    '02-check-in': ('light',
        headline('Check in', 'Snap the gym. <em>Get your apps back.</em>')
        + phone('02-check-in.png', tilt=4, top=68)
        + card('phone', 'acc', 'Checked on your phone', 'Your photo is never uploaded.', 'left:5rem;top:150rem;width:84rem;transform:rotate(-3deg)')),
    '03-buddies': ('brand',
        headline('Buddies', 'Better with a <em>buddy.</em>', 'See who showed up today, and who still has to go.')
        + phone('03-buddies.png', tilt=-4, top=84)
        + person('elbow-bump', 'width:122rem;left:50%;bottom:0;transform:translateX(-50%)')),
    '04-nudge': ('dark',
        headline('Nudges', 'Skipping? <em>Your buddy</em> will know.')
        + phone('lock-clean.png', top=66)
        + person('fist-bump', 'height:124rem;right:0;bottom:0')
        + f'<div class="notif" style="top:128rem"><img src="file://{os.path.expanduser("~/Projects/gymbuddy/assets/icon.png")}">'
          '<div><p class="t">Maya nudged you</p><p class="b">Still time to get to the gym today. Your buddy is watching.</p></div>'
          '<span class="when">now</span></div>'),
    '05-streak': ('light',
        headline('Streaks', 'Build a streak <em>that sticks.</em>')
        + phone('05-profile.png', tilt=4, top=68)
        + '<div class="card" style="left:6rem;top:182rem;width:60rem;transform:rotate(-4deg)">'
          '<div class="row" style="gap:2rem"><div class="icon warn" style="width:9rem;height:9rem">' + ICONS['flame'] + '</div>'
          '<p class="card-sub" style="margin:0">Current streak</p></div>'
          '<p style="margin-top:2rem"><span class="num" style="font-size:22rem;line-height:.85;color:var(--amber)">12</span>'
          '<span class="num" style="font-size:8rem;color:var(--muted)"> days</span></p></div>'),
    '06-schedule': ('brand',
        headline('Your plan', 'Your days. <em>Your window.</em>', 'Pick your gym days and hours. Rest days never lock.')
        + phone('06-schedule.png', top=84)
        + '<div class="chip" style="right:6rem;top:212rem;transform:rotate(4deg)">' + ICONS['moon'] + 'Rest days never lock</div>'),
    '07-private': ('dark',
        headline('Privacy', 'Private <em>by design.</em>', 'GymBuddy locks your apps. It doesn’t look inside them.')
        + '<div class="glow" style="top:120rem"></div>'
        + '<div class="list">'
        + card('lock', 'acc', 'Your app list stays on your iPhone', 'Apple keeps it private, even from us.', '')
        + card('camera', 'acc', 'Check-in photos never leave your phone', 'The gym check happens on-device.', '')
        + card('pinoff', 'acc', 'No location tracking', 'GymBuddy doesn’t use your location.', '')
        + card('trash', 'acc', 'Delete your account anytime', 'Everything on it goes with it.', '')
        + '</div>'
        + f'<img class="wordmark" src="file://{os.path.expanduser("~/Projects/gymbuddy/assets/brand/gymbuddy-wordmark.png")}">'),
}

for name, (theme, body) in FRAMES.items():
    glow = '' if 'class="glow"' in body else '<div class="glow"></div>'
    page = (f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{CSS}</style></head>'
            f'<body class="{theme}">{glow}{body}</body></html>')
    with open(os.path.join(OUT, f'{name}.html'), 'w') as f:
        f.write(page)
print('built', len(FRAMES), 'frames')
