/* Generador de codigos QR (modo byte, correccion de errores L/M, versiones 1 a 10).
   Sin dependencias. Hecho para la pagina de WiFi: el codigo se genera en el navegador a partir de
   la red y la clave, asi que al cambiar la clave el QR se regenera solo.
   Uso: var qr = BarceloQR.encode('texto', 'M');   // { size, modules: [[bool]], version, mask }
   Sale con Error si el texto no entra en la version 10 (213 bytes con M, 271 con L). */
(function (root) {
  'use strict';

  // [ecCodewordsPorBloque, [[bloques, datosPorBloque], ...]] por version (1..10)
  var BLOQUES = {
    L: [null,
      [7, [[1, 19]]], [10, [[1, 34]]], [15, [[1, 55]]], [20, [[1, 80]]], [26, [[1, 108]]],
      [18, [[2, 68]]], [20, [[2, 78]]], [24, [[2, 97]]], [30, [[2, 116]]], [18, [[2, 68], [2, 69]]]],
    M: [null,
      [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
      [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]]]
  };
  var FORMATO_EC = { L: 1, M: 0 };
  var ALINEACION = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  var BITS_RESTANTES = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

  // ---- GF(256) y Reed-Solomon ----
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function generador(grado) {
    var p = [1];
    for (var i = 0; i < grado; i++) {
      var q = new Array(p.length + 1).fill(0);
      for (var j = 0; j < p.length; j++) {
        q[j] ^= p[j];
        q[j + 1] ^= mul(p[j], EXP[i]);
      }
      p = q;
    }
    return p;   // coeficientes de mayor a menor grado (el primero es 1)
  }

  function resto(datos, ecLen) {
    var gen = generador(ecLen);
    var r = datos.concat(new Array(ecLen).fill(0));
    for (var i = 0; i < datos.length; i++) {
      var c = r[i];
      if (c !== 0) for (var j = 0; j < gen.length; j++) r[i + j] ^= mul(gen[j], c);
    }
    return r.slice(datos.length);
  }

  // ---- texto a bytes UTF-8 ----
  function utf8(texto) {
    var out = [];
    for (var i = 0; i < texto.length; i++) {
      var c = texto.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < texto.length) {
        var d = texto.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function datosTotales(version, nivel) {
    var n = 0, b = BLOQUES[nivel][version][1];
    for (var i = 0; i < b.length; i++) n += b[i][0] * b[i][1];
    return n;
  }

  // ---- codewords: datos + EC intercalados ----
  function codewords(bytes, version, nivel) {
    var capacidad = datosTotales(version, nivel);
    var bits = [];
    function poner(valor, cant) { for (var i = cant - 1; i >= 0; i--) bits.push((valor >>> i) & 1); }
    poner(4, 4);                                   // modo byte
    poner(bytes.length, version <= 9 ? 8 : 16);    // cantidad de caracteres
    for (var i = 0; i < bytes.length; i++) poner(bytes[i], 8);
    var maxBits = capacidad * 8;
    poner(0, Math.min(4, maxBits - bits.length));  // terminador
    while (bits.length % 8) bits.push(0);
    var datos = [];
    for (var k = 0; k < bits.length; k += 8) {
      var v = 0;
      for (var m = 0; m < 8; m++) v = (v << 1) | bits[k + m];
      datos.push(v);
    }
    for (var pad = 0xEC; datos.length < capacidad; pad ^= 0xEC ^ 0x11) datos.push(pad);

    var ecLen = BLOQUES[nivel][version][0], grupos = BLOQUES[nivel][version][1];
    var bloquesDatos = [], bloquesEc = [], pos = 0;
    grupos.forEach(function (g) {
      for (var b = 0; b < g[0]; b++) {
        var d = datos.slice(pos, pos + g[1]); pos += g[1];
        bloquesDatos.push(d);
        bloquesEc.push(resto(d, ecLen));
      }
    });
    var salida = [], maxD = 0;
    bloquesDatos.forEach(function (d) { if (d.length > maxD) maxD = d.length; });
    for (var c = 0; c < maxD; c++) bloquesDatos.forEach(function (d) { if (c < d.length) salida.push(d[c]); });
    for (var e = 0; e < ecLen; e++) bloquesEc.forEach(function (d) { salida.push(d[e]); });
    return salida;
  }

  // ---- matriz ----
  function bit(valor, i) { return ((valor >>> i) & 1) !== 0; }

  function Matriz(version) {
    this.version = version;
    this.size = version * 4 + 17;
    this.mod = [];
    this.fn = [];
    for (var y = 0; y < this.size; y++) {
      this.mod.push(new Array(this.size).fill(false));
      this.fn.push(new Array(this.size).fill(false));
    }
  }
  Matriz.prototype.poner = function (x, y, oscuro) { this.mod[y][x] = oscuro; this.fn[y][x] = true; };

  Matriz.prototype.patronesFijos = function () {
    var n = this.size, i;
    for (i = 0; i < n; i++) { this.poner(6, i, i % 2 === 0); this.poner(i, 6, i % 2 === 0); }
    var self = this;
    function buscador(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n) self.poner(x, y, d !== 2 && d !== 4);
      }
    }
    buscador(3, 3); buscador(n - 4, 3); buscador(3, n - 4);
    var pos = ALINEACION[this.version], cant = pos.length;
    for (var a = 0; a < cant; a++) for (var b = 0; b < cant; b++) {
      if ((a === 0 && b === 0) || (a === 0 && b === cant - 1) || (a === cant - 1 && b === 0)) continue;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++)
        this.poner(pos[a] + dx, pos[b] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    this.formato('L', 0);   // reserva el area; se reescribe al elegir la mascara
    this.versionBits();
  };

  Matriz.prototype.formato = function (nivel, mascara) {
    var datos = (FORMATO_EC[nivel] << 3) | mascara, r = datos, i, n = this.size;
    for (i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bits = ((datos << 10) | r) ^ 0x5412;
    for (i = 0; i <= 5; i++) this.poner(8, i, bit(bits, i));
    this.poner(8, 7, bit(bits, 6));
    this.poner(8, 8, bit(bits, 7));
    this.poner(7, 8, bit(bits, 8));
    for (i = 9; i < 15; i++) this.poner(14 - i, 8, bit(bits, i));
    for (i = 0; i < 8; i++) this.poner(n - 1 - i, 8, bit(bits, i));
    for (i = 8; i < 15; i++) this.poner(8, n - 15 + i, bit(bits, i));
    this.poner(8, n - 8, true);   // modulo oscuro fijo
  };

  Matriz.prototype.versionBits = function () {
    if (this.version < 7) return;
    var r = this.version, i, n = this.size;
    for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    var bits = (this.version << 12) | r;
    for (i = 0; i < 18; i++) {
      var b = bit(bits, i), a = n - 11 + (i % 3), c = Math.floor(i / 3);
      this.poner(a, c, b); this.poner(c, a, b);
    }
  };

  Matriz.prototype.datos = function (cw) {
    var n = this.size, i = 0, total = cw.length * 8 + BITS_RESTANTES[this.version];
    for (var derecha = n - 1; derecha >= 1; derecha -= 2) {
      if (derecha === 6) derecha = 5;
      for (var vert = 0; vert < n; vert++) for (var j = 0; j < 2; j++) {
        var x = derecha - j, sube = ((derecha + 1) & 2) === 0, y = sube ? n - 1 - vert : vert;
        if (!this.fn[y][x] && i < total) {
          this.mod[y][x] = i < cw.length * 8 ? bit(cw[i >>> 3], 7 - (i & 7)) : false;
          i++;
        }
      }
    }
  };

  Matriz.prototype.mascara = function (m) {
    var n = this.size;
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if (this.fn[y][x]) continue;
      var inv;
      switch (m) {
        case 0: inv = (x + y) % 2 === 0; break;
        case 1: inv = y % 2 === 0; break;
        case 2: inv = x % 3 === 0; break;
        case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: inv = (x * y) % 2 + (x * y) % 3 === 0; break;
        case 6: inv = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
        default: inv = ((x + y) % 2 + (x * y) % 3) % 2 === 0;
      }
      if (inv) this.mod[y][x] = !this.mod[y][x];
    }
  };

  Matriz.prototype.penalidad = function () {
    var n = this.size, m = this.mod, p = 0, x, y, k;
    // 1) rachas de 5 o mas del mismo color, en filas y columnas
    for (var eje = 0; eje < 2; eje++) for (y = 0; y < n; y++) {
      var corrida = 1;
      for (x = 1; x < n; x++) {
        var a = eje ? m[x][y] : m[y][x], b = eje ? m[x - 1][y] : m[y][x - 1];
        if (a === b) corrida++; else { if (corrida >= 5) p += 3 + (corrida - 5); corrida = 1; }
      }
      if (corrida >= 5) p += 3 + (corrida - 5);
    }
    // 2) bloques de 2x2
    for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++)
      if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    // 3) patrones tipo buscador (1011101 con 4 claros a un lado)
    var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function coincide(get, pat) { for (var t = 0; t < 11; t++) if ((get(t) ? 1 : 0) !== pat[t]) return false; return true; }
    for (y = 0; y < n; y++) for (x = 0; x <= n - 11; x++) {
      if (coincide(function (t) { return m[y][x + t]; }, P1)) p += 40;
      if (coincide(function (t) { return m[y][x + t]; }, P2)) p += 40;
      if (coincide(function (t) { return m[x + t][y]; }, P1)) p += 40;
      if (coincide(function (t) { return m[x + t][y]; }, P2)) p += 40;
    }
    // 4) proporcion de oscuros
    var oscuros = 0;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (m[y][x]) oscuros++;
    k = Math.floor(Math.abs(oscuros * 20 - n * n * 10) / (n * n));
    return p + k * 10;
  };

  function encode(texto, nivel) {
    nivel = nivel === 'L' ? 'L' : 'M';
    var bytes = utf8(String(texto));
    var orden = nivel === 'M' ? ['M', 'L'] : ['L'];   // si no entra con M, prueba con L
    for (var o = 0; o < orden.length; o++) {
      var niv = orden[o];
      for (var version = 1; version <= 10; version++) {
        var capBytes = datosTotales(version, niv) - (version <= 9 ? 2 : 3);   // modo + largo
        if (bytes.length > capBytes) continue;
        var cw = codewords(bytes, version, niv);
        var base = new Matriz(version);
        base.patronesFijos();
        base.datos(cw);
        var mejor = null, mejorP = Infinity, mejorM = 0;
        for (var mask = 0; mask < 8; mask++) {
          var t = new Matriz(version);
          t.patronesFijos();
          t.mod = base.mod.map(function (f) { return f.slice(); });
          t.mascara(mask);
          t.formato(niv, mask);
          var pen = t.penalidad();
          if (pen < mejorP) { mejorP = pen; mejor = t; mejorM = mask; }
        }
        return { size: mejor.size, modules: mejor.mod, version: version, mask: mejorM, level: niv };
      }
    }
    throw new Error('El texto es demasiado largo para el QR (maximo ~270 bytes)');
  }

  var API = { encode: encode };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BarceloQR = API;
})(typeof window !== 'undefined' ? window : this);
