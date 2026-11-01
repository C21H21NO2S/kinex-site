// Links you fill in before publishing. Leave a value empty ('') and the button shows a "coming soon" note instead.
export const LINKS = {
  beta: 'download/', // 加入内测 → this site's download page (A660; the beta installers are published there)
  github: '',   // public repository or project page
};
// The terms and privacy pages are this site's own (terms/, privacy/), linked from the footer directly.

// The promo film, played in a dialog on the home page (src/core/film.js). One entry per site language; null = that
// cut is not made yet, and the page plays the Chinese one with a short note. File names carry the date and a short
// hash, so the server caches them for a year: a new cut gets new names here. Every file sits in both hosts.
export const PROMO = {
  // the Tokyo server first (kinex-account scripts/server/setup.sh, /srv/kinex-media/promo/); this site's own copy
  // (public/media/, GitHub Pages) takes over when it fails
  hosts: ['https://media.kinexnote.com/promo/', 'media/'],
  zh: {
    duration: '2:22',
    poster: 'kinex-promo-zh-20261102-df6404e8.webp',
    sources: [
      { file: 'kinex-promo-zh-20261102-390b6632.webm', type: 'video/webm; codecs="av01.0.08M.10, opus"' }, // AV1, 14.6 MB
      { file: 'kinex-promo-zh-20261102-8081723b.mp4', type: 'video/mp4' }, // H.264, 38 MB, for players without AV1
    ],
    subtitles: null, // burned into the picture
  },
  // the English cut, once there is one, e.g.
  // { duration: '2:20', poster: 'kinex-promo-en-….webp', sources: [ … ],
  //   subtitles: { file: 'kinex-promo-en-….vtt', srclang: 'en', label: 'English' } }  (null if burned in)
  en: null,
};
