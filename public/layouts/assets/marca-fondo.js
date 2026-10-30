/* Trazos de velocidad y particulas para .marca-bg (ver marca-fondo.css). Tenues a proposito:
   no distraen, solo comunican que hay movimiento detras. */
(function () {
  var bg = document.querySelector('.marca-bg');
  if (!bg) return;
  var r = function (a, b) { return a + Math.random() * (b - a); };
  var frag = document.createDocumentFragment();

  // Trazos diagonales. Delay negativo: al cargar ya estan repartidos por la pantalla.
  var LINEAS = 7;
  for (var i = 0; i < LINEAS; i++) {
    var l = document.createElement('div');
    var dur = r(18, 30);
    l.className = 'm-linea' + (Math.random() < 0.35 ? ' cian' : '');
    l.style.cssText =
      'top:' + r(-5, 105) + '%;' +
      'width:' + r(260, 720) + 'px;height:' + r(5, 10) + 'px;' +
      'animation-duration:' + dur + 's;' +
      'animation-delay:-' + r(0, dur) + 's;';
    frag.appendChild(l);
  }

  // Particulas
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
