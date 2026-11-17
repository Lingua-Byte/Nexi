// Runs before the page draws: switch to the phone layout on Android / touch screens.
if (/Android|Mobi/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches) {
  document.documentElement.classList.add('mobile');
}
