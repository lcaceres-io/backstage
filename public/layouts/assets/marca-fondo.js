/* Particulas tenues para .marca-bg (ver marca-fondo.css). Sutiles a proposito: no distraen,
   solo comunican que hay movimiento detras. */
(function () {
  var bg = document.querySelector('.marca-bg');
  if (!bg) return;
  var r = function (a, b) { return a + Math.random() * (b - a); };
  var frag = document.createDocumentFragment();
  var TOTAL = 140, CIAN = 0.3, GLOW = 0.18;
  for (var j = 0; j < TOTAL; j++) {
    var p = document.createElement('div');
    var glow = Math.random() < GLOW;
    var size = glow ? r(3, 6) : r(1.5, 4.5);
    p.className = 'm-part' + (Math.random() < CIAN ? ' cian' : '') + (glow ? ' glow' : '');
    p.style.cssText =
      'left:' + r(0, 100) + '%;top:' + r(0, 100) + '%;' +
      'width:' + size + 'px;height:' + size + 'px;' +
      'animation-duration:' + r(4, 9) + 's;' +
      'animation-delay:' + r(0, 10) + 's;' +
      '--drift:' + r(-70, 70) + 'px;';
    frag.appendChild(p);
  }
  bg.appendChild(frag);
})();
