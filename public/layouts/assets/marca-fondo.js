/* Particulas tenues para .marca-bg (ver marca-fondo.css). Sutiles a proposito: no
   distraen, solo comunican que hay movimiento detras. */
(function () {
  var bg = document.querySelector('.marca-bg');
  if (!bg) return;
  var TOTAL = 140, CIAN = 0.3, GLOW = 0.18;
  var MIN_SIZE = 1.5, MAX_SIZE = 4.5, MIN_GLOW = 3, MAX_GLOW = 6, MIN_DUR = 4, MAX_DUR = 9, MAX_DELAY = 10, MAX_DRIFT = 70;
  var frag = document.createDocumentFragment();
  for (var i = 0; i < TOTAL; i++) {
    var p = document.createElement('div');
    var glow = Math.random() < GLOW;
    var size = glow ? MIN_GLOW + Math.random() * (MAX_GLOW - MIN_GLOW) : MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
    p.className = 'm-part' + (Math.random() < CIAN ? ' cian' : '') + (glow ? ' glow' : '');
    p.style.cssText =
      'left:' + (Math.random() * 100) + '%;' +
      'top:' + (Math.random() * 100) + '%;' +
      'width:' + size + 'px;height:' + size + 'px;' +
      'animation-duration:' + (MIN_DUR + Math.random() * (MAX_DUR - MIN_DUR)) + 's;' +
      'animation-delay:' + (Math.random() * MAX_DELAY) + 's;' +
      '--drift:' + ((Math.random() * 2 - 1) * MAX_DRIFT) + 'px;';
    frag.appendChild(p);
  }
  bg.appendChild(frag);
})();
