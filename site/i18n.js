/* ============================================================
   90+3 — i18n
   English lives in the HTML (source of truth).
   Spanish lives here. Dynamic strings live in DICT for both.
   ============================================================ */
(function () {
  'use strict';

  const DICT = {
    es: {
      'meta.title': 'José García — Ingeniero Cloud & DevOps',
      'meta.desc': 'José Ángel García Pérez — ingeniero de software en transición a cloud y DevOps. Construyo sistemas que aguantan bajo presión. Prueba el lab: tres cuellos de botella, tres decisiones, resultados en vivo.',

      'brand.role': 'Cloud & DevOps',
      'nav.work': 'Trabajo',
      'nav.stack': 'Stack',
      'nav.lab': 'El Lab',
      'nav.about': 'Sobre mí',
      'nav.contact': 'Contacto',
      'nav.play': 'Jugar el lab',

      'hero.eyebrow': 'Ingeniero Cloud & DevOps · Culiacán, MX',
      'hero.title': 'Construyo sistemas<br /><span class="line2">que aguantan el <em>minuto 90.</em></span>',
      'hero.sub': 'Ingeniero de software en transición a cloud. Diseño, mido y arreglo lo que se rompe bajo presión — y lo demostré con un <b>API real que puedes jugar ahora</b>.',
      'hero.cta1': 'Entrar al lab',
      'hero.cta2': 'Ver mi trabajo',

      'lab.online': 'Lab en línea',
      'lab.stat1': 'partidas hoy',
      'lab.stat2': 'le ganaron al cuello de botella',
      'lab.stat3': 'mejor p95',
      'lab.todayTop': 'Top 3 de hoy',
      'lab.onlineNow': 'en línea',
      'lab.noRuns': 'Aún no hay partidas. Sé el primero.',
      'lab.hint': 'Sin registro. 60 segundos. API real.',
      'lab.enter': 'Entrar al lab',

      'work.eyebrow': '01 · Trabajo seleccionado',
      'work.title': 'Construido, no imaginado.',
      'work.idx': 'proyectos · 2023–2026',
      'work.featured': 'Destacado',
      'work.repo': 'Ver repositorio',
      'work.private': 'Privado / académico',
      'work.p1.role': 'Refugios contra el calor para adultos mayores · AWS + Terraform',
      'work.p1.desc': 'Un mapa de refugios frescos para adultos mayores durante olas de calor en Culiacán, Hermosillo y Mexicali. Combiné datos de <strong>Overture Maps</strong> y <strong>Meta HRSL</strong>, los serví con <strong>AWS Location Service</strong> y aprovisioné la infraestructura con <strong>Terraform</strong>. Lo difícil no fue el mapa: fue decidir qué dato era confiable a 45&nbsp;°C.',
      'work.p1.m1': 'ciudades mapeadas',
      'work.p1.m2': 'Location Service',
      'work.p1.m3': 'Terraform / HCL',
      'work.p1.m4': 'restricción de diseño',
      'work.p2.role': 'Seguridad alimentaria cuando se va la luz',
      'work.p2.desc': 'Un agente que ayuda a las familias a decidir qué todavía se puede comer después de un corte de luz. Construido con <strong>Strands</strong> y Python: el modelo razona sobre tiempo y temperatura, pero las reglas de seguridad son código explícito y auditable.',
      'work.p3.title': 'Imputación hidrometeorológica',
      'work.p3.role': 'Rellenar datos climáticos faltantes · equipo de 2',
      'work.p3.desc': 'Proyecto de investigación para imputar series hidrometeorológicas incompletas. Trabajé las etapas 1–7: limpieza, análisis exploratorio, comparación de modelos y validación en Jupyter. Mi primera lección real sobre <strong>datos que no puedes creer a primera vista</strong>.',
      'work.p4.role': 'Plataforma web · proyecto en equipo con Laravel',
      'work.p4.desc': 'Sistema web full-stack con <strong>Laravel, Blade, PHP y MySQL</strong>. Mantuve módulos de punta a punta: migraciones, controladores, validación y vistas Blade. Aprendí cuánto del backend es en realidad <strong>ponerse de acuerdo en el contrato</strong>.',
      'work.p5.role': 'Vue + TypeScript · backend en Kotlin',
      'work.p5.desc': 'Producto multi-repositorio con frontend en <strong>Vue/TypeScript</strong> y backend en <strong>Kotlin/TypeScript</strong>. Me enfoqué en documentación, requerimientos e integración: convertir un blanco móvil en algo que el equipo pudiera construir.',
      'work.p6.role': 'Sistema de gestión · Feria de Ingeniería',
      'work.p6.desc': 'Sistema de gestión en Java + Spring + MySQL presentado en la Feria de Ingeniería. CRUD, roles, reportes — la base poco glamorosa que me enseñó cómo una aplicación real sigue viva después de la demo.',

      'stack.eyebrow': '02 · Stack',
      'stack.title': 'Los once que sí alineo.',
      'stack.idx': 'sin suplentes',
      'stack.docker': 'Contenedores',
      'stack.js': 'Enganche',
      'stack.aws': 'Fichaje nuevo',
      'stack.sql': 'Mediocampo',
      'stack.java': 'Motor',
      'stack.python': 'Box-to-box',
      'stack.html': 'Lateral izquierdo',
      'stack.css': 'Central',
      'stack.php': 'Lateral derecho',
      'stack.laravel': 'Carrilero',
      'stack.git': 'Portero',
      'stack.evd.shipped': 'en producción',
      'stack.evd.rising': 'Amplify · Lambda',
      'stack.evd.projects': '3 proyectos',
      'stack.evd.data': 'datos + agentes',
      'stack.evd.every': 'cada commit',
      'stack.legend1': 'Probado en partido',
      'stack.legend2': 'Enviado en proyectos de equipo',
      'stack.legend3': 'Subiendo — entrenando con el primer equipo',

      'lab.eyebrow': '03 · El laboratorio',
      'lab.title': 'Tres cuellos de botella. Tu jugada.',
      'lab.idx': 'API real',
      'lab.lead': 'Heredas un sistema que va <strong>0–2 abajo</strong>: un scan completo, un agregado que se recalcula en cada request y un N+1. Tres sustituciones. Cada número de abajo se mide contra un API corriendo — <strong>sin latencia falsa, sin animaciones fingiendo ser lentas</strong>.',
      'lab.playsToday': 'partidas hoy',
      'lab.winsToday': 'remontadas',
      'lab.anonymous': 'Anónimo por defecto · sin cookies',
      'lab.matchTitle': 'El sistema que heredaste',
      'lab.matchSub': 'El mismo equipo. Tres decisiones. El resultado se mide, no se narra.',
      'lab.you': 'Tú',
      'lab.bottleneck': 'Cuello de botella',
      'lab.clock': 'reloj del partido',
      'lab.s1.title': 'Mete un 9',
      'lab.s1.tag': 'Arregla el patrón de acceso',
      'lab.s1.desc': 'La app escanea la tabla completa para encontrar un registro. Funciona en tu laptop. En producción es tarjeta roja. Cambia el scan completo por una query sobre un índice disperso.',
      'lab.s2.title': 'Cierra el medio',
      'lab.s2.tag': 'Deja de recalcular',
      'lab.s2.desc': 'El dashboard recalcula el mismo agregado en cada request. En desarrollo nadie lo nota. En el partido lo nota todo el mundo. Calcula una vez, cachea el resultado.',
      'lab.s3.title': 'Cambia de banda',
      'lab.s3.tag': 'Mata el N+1',
      'lab.s3.desc': 'Doscientos jugadores, doscientos viajes secuenciales. El clásico N+1 que parece inocente dentro de un loop. Una lectura por lote en su lugar.',
      'lab.notMeasured': 'sin medir',
      'lab.run': 'Hacer la sub',
      'lab.note': 'Medido <b>en el servidor</b> · misma región · mismo contrato',
      'lab.board': 'Ranking de hoy',
      'lab.manager': 'Manager',
      'lab.country': 'País',
      'lab.result': 'Resultado',
      'lab.time': 'Tiempo',
      'lab.feed': 'En vivo desde el lab',
      'lab.feedEmpty': 'Esperando la primera jugada.',
      'lab.share': 'Compartir este lab',
      'lab.dash': 'Ver el panel de visitantes',
      'lab.shareNote': 'Cualquiera puede jugar. Sin registro, sin instalar nada.',

      'about.eyebrow': '04 · Sobre mí',
      'about.title': 'La versión corta.',
      'about.p1': 'Soy <strong>José Ángel García Pérez</strong>, ingeniero de software de Culiacán, Sinaloa. Estudio en el <strong>Instituto Tecnológico de Culiacán</strong> y he pasado los últimos años enviando proyectos en equipo: plataformas Laravel, servicios Java, trabajo de datos en Python y frontends Vue.',
      'about.p2': 'En algún punto entre el bug de las 11 de la noche y la demo de las 8 de la mañana encontré lo que hago bien: <strong>diagnosticar sistemas bajo presión</strong>. Leo la falla, aíslo la causa y entrego el arreglo. Esa es la habilidad que traigo a cloud y DevOps.',
      'about.pull': 'No memoricé la sintaxis. <b>Diagnostico sistemas.</b> No es lo mismo.',
      'about.p3': 'Este sitio es la prueba, no la promesa: un API real, carga real y números reales. Todo lo que mediste en el lab corrió en AWS — y el código es público.',
      'about.f1k': 'Base',
      'about.f1v': 'Culiacán, Sinaloa, México',
      'about.f2k': 'Estudiando',
      'about.f2v': 'Ingeniería en Sistemas · 9.º semestre',
      'about.f3k': 'Enfoque',
      'about.f3v': '<b>Cloud</b> · DevOps · backend',
      'about.f4k': 'Inglés',
      'about.f5v': '<b>Construyendo en público</b>',
      'about.f6k': 'Fuera del trabajo',
      'about.f6v': 'FIFA, guitarra, anime, familia',
      'about.f7k': 'Estado',
      'about.f7v': '<b>Abierto a roles cloud</b>',

      'contact.eyebrow': '05 · Contacto',
      'contact.title': '¿Contratando? Hablemos.',
      'contact.idx': 'Abierto',
      'contact.idx2': 'a cloud & DevOps',
      'contact.avail': 'Disponible para prácticas y roles junior',
      'contact.lead': 'Si estás construyendo algo donde <strong>el último 10% decide el resultado</strong> — una migración, un endpoint lento, un sistema que nadie quiere tocar — ese es el partido que quiero. Busco un equipo que valore el criterio por encima de la memorización.',
      'contact.email': 'Correo',
      'contact.note': 'Base en Culiacán, Sinaloa (GMT−7). Inglés B2 · español nativo. La forma más rápida de ver cómo pienso es jugar el lab de arriba.',
      'contact.quote': '"No memoricé la sintaxis.<br /><em>Diagnostico el sistema.</em>"',
      'contact.who': '— el único reporte de scouting que importa',

      'footer.built': 'hecho para el',
      'footer.dash': 'Panel de visitantes',

      'finale.requests': 'Requests',
      'finale.sign': 'Firma el reporte del partido',
      'finale.signBtn': 'Firmar',
      'finale.back': 'Volver al portafolio',
      'finale.public': 'El ranking es público',
      'finale.share': 'Compartir resultado'
    },

    en: {
      'lab.noRuns': 'No runs yet. Be the first.',
      'lab.feedEmpty': 'Waiting for the first move.',
      'lab.notMeasured': 'not measured',
      'lab.run': 'Make the sub',
      'finale.signBtn': 'Sign',
      't.signedOne': '{name}, your report is in the leaderboard — you are the first.',
      'meta.title': 'José García — Cloud & DevOps Engineer',
      'meta.desc': 'José Ángel García Pérez — software engineer moving into cloud and DevOps. I build systems that hold under pressure. Try the real API lab: three bottlenecks, three decisions, live results.',

      't.working': 'Working',
      't.measuring': 'measuring…',
      't.done': 'Sub made ✓',
      't.goal': 'Goal. {a} → {b}',
      't.apiOffline': 'API not reachable — showing <b>recorded</b> measurements.',
      't.whistle': 'You took the whistle. <b>Make three subs.</b>',
      't.copied': 'Link copied.',
      't.shareTitle': '90+3 — can you beat the bottleneck?',
      't.shareText': 'I fixed 3 bottlenecks in {s}s. Real API, real load.',
      't.placeholder': 'Your name',
      't.signed': '{name}, your report is in the leaderboard — {n} managers signed.',
      't.signedOne': '{name}, your report is in the leaderboard — you are the first.',
      't.offlineSaved': 'Saved locally — the live table is offline.',
      't.anonymous': 'Anonymous',
      't.live': 'live',
      't.now': 'now',
      't.minAgo': '{n}m ago',
      't.ev.join': 'joined the lab',
      't.ev.sub1': 'fixed the full scan',
      't.ev.sub2': 'killed the recompute',
      't.ev.sub3': 'killed the N+1',
      't.ev.win': 'won 3–2',
      't.ev.sign': 'signed the report',
      't.ev.visit': 'opened the portfolio',
      't.ev.project': 'opened a project',
      't.ev.contact': 'checked contact',
      't.ev.lang': 'switched language',
      't.ev.share': 'shared the lab',
      't.finaleSub': '{ok} of {n} requests in {s}s — {fail} errors.',
      't.finaleSubRecorded': 'Recorded burst: 500 of 500 requests, 0 errors.',
      't.noName': 'Anonymous',
      't.you': 'You',
      't.finished': 'finished',
      't.of': 'of',
      't.err': 'errors',
      't.reportOk': 'Report signed.'
    }
  };

  // Spanish dynamic strings (same keys as t.* above).
  DICT.es['t.working'] = 'Trabajando';
  DICT.es['t.measuring'] = 'midiendo…';
  DICT.es['t.done'] = 'Sub hecha ✓';
  DICT.es['t.goal'] = 'Gol. {a} → {b}';
  DICT.es['t.apiOffline'] = 'API no disponible — mostrando mediciones <b>registradas</b>.';
  DICT.es['t.whistle'] = 'Tomaste el silbato. <b>Haz tres cambios.</b>';
  DICT.es['t.copied'] = 'Link copiado.';
  DICT.es['t.shareTitle'] = '90+3 — ¿le ganas al cuello de botella?';
  DICT.es['t.shareText'] = 'Arreglé 3 cuellos de botella en {s}s. API real, carga real.';
  DICT.es['t.placeholder'] = 'Tu nombre';
  DICT.es['t.signed'] = '{name}, tu reporte está en el ranking — {n} managers firmaron.';
  DICT.es['t.signedOne'] = '{name}, tu reporte está en el ranking — eres el primero.';
  DICT.es['t.offlineSaved'] = 'Guardado localmente — la tabla en vivo está offline.';
  DICT.es['t.anonymous'] = 'Anónimo';
  DICT.es['t.live'] = 'en vivo';
  DICT.es['t.now'] = 'ahora';
  DICT.es['t.minAgo'] = 'hace {n}m';
  DICT.es['t.ev.join'] = 'entró al lab';
  DICT.es['t.ev.sub1'] = 'arregló el scan';
  DICT.es['t.ev.sub2'] = 'mató el recálculo';
  DICT.es['t.ev.sub3'] = 'mató el N+1';
  DICT.es['t.ev.win'] = 'ganó 3–2';
  DICT.es['t.ev.sign'] = 'firmó el reporte';
  DICT.es['t.ev.visit'] = 'abrió el portafolio';
  DICT.es['t.ev.project'] = 'abrió un proyecto';
  DICT.es['t.ev.contact'] = 'vio el contacto';
  DICT.es['t.ev.lang'] = 'cambió de idioma';
  DICT.es['t.ev.share'] = 'compartió el lab';
  DICT.es['t.finaleSub'] = '{ok} de {n} requests en {s}s — {fail} errores.';
  DICT.es['t.finaleSubRecorded'] = 'Burst registrado: 500 de 500 requests, 0 errores.';
  DICT.es['t.noName'] = 'Anónimo';
  DICT.es['t.you'] = 'Tú';
  DICT.es['t.finished'] = 'terminó';
  DICT.es['t.of'] = 'de';
  DICT.es['t.err'] = 'errores';
  DICT.es['t.reportOk'] = 'Reporte firmado.';

  Object.assign(DICT.es, {
    'dash.nav.lab': 'El Lab',
    'dash.back': 'Volver al portafolio',
    'dash.eyebrow': 'Panel de visitantes · en vivo',
    'dash.title': 'El laboratorio, desde adentro.',
    'dash.sub': 'Cada partida se mide de forma anónima: dónde se detienen los visitantes, qué arreglan, qué idioma eligen. Sin cookies, sin píxeles, sin datos personales — y <b>Do Not Track se respeta</b>.',
    'dash.waiting': 'esperando datos…',
    'dash.ttl': 'los eventos anónimos expiran en 7 días',
    'dash.k1': 'visitas',
    'dash.k1s': 'sesiones únicas',
    'dash.k2': 'partidas iniciadas',
    'dash.k2s': 'entraron al lab',
    'dash.k3': 'remontadas',
    'dash.k3s': '3–2 en tiempo de descuento',
    'dash.k4': 'reportes firmados',
    'dash.k4s': 'entraron al ranking',
    'dash.k5': 'finalización',
    'dash.k5s': 'iniciaron → ganaron',
    'dash.funnel': 'El embudo',
    'dash.funnelSub': 'dónde se detienen',
    'dash.empty': 'Aún no hay datos. Sé el primero en jugar.',
    'dash.geo': 'Desde dónde juegan',
    'dash.geoSub': 'estimado por el idioma del navegador',
    'dash.devices': 'Dispositivos',
    'dash.mobile': 'Móvil',
    'dash.desktop': 'Escritorio',
    'dash.langs': 'Idiomas',
    'dash.bench': 'Latencia real del API',
    'dash.benchSub': 'medida en el servidor, DynamoDB',
    'dash.mode': 'Modo',
    'dash.calls': 'Llamadas',
    'dash.avg': 'Promedio',
    'dash.last': 'Última',
    'dash.engagement': 'Interacción',
    'dash.engagementSub': 'qué más abren',
    'dash.projects': 'clics en proyectos',
    'dash.contact': 'clics en contacto',
    'dash.shares': 'veces compartido',
    'dash.note': 'Los conteos son eventos, no personas. Un visitante puede jugar más de una vez. <b>Nada aquí identifica a nadie.</b>',
    'dash.foot': 'Construido con <b>Amplify · API Gateway · Lambda · DynamoDB · CloudWatch</b>. Los datos son agregados y anónimos. El código es público.',
    'dash.updated': 'actualizado hace {s}s',
    'dash.offline': 'API sin conexión — reintentando',
    'dash.ofVisits': '{p}% de las visitas',
    'dash.fromPrev': '{p}% del paso anterior',
    'dash.stage.visit': 'Visitas',
    'dash.stage.lab_start': 'Iniciaron partida',
    'dash.stage.sub1': 'Arreglaron el scan',
    'dash.stage.sub2': 'Mataron el recálculo',
    'dash.stage.sub3': 'Mataron el N+1',
    'dash.stage.win': 'Ganaron 3–2',
    'dash.stage.sign': 'Firmaron el reporte',
    'dash.docTitle': '90+3 — Panel de visitantes'
  });

  Object.assign(DICT.en, {
    'dash.empty': 'No data yet. Be the first to play.',
    'dash.updated': 'updated {s}s ago',
    'dash.offline': 'API offline — retrying',
    'dash.ofVisits': '{p}% of visits',
    'dash.fromPrev': '{p}% from previous step',
    'dash.stage.visit': 'Visits',
    'dash.stage.lab_start': 'Started a match',
    'dash.stage.sub1': 'Fixed the scan',
    'dash.stage.sub2': 'Killed the recompute',
    'dash.stage.sub3': 'Killed the N+1',
    'dash.stage.win': 'Won 3–2',
    'dash.stage.sign': 'Signed the report',
    'dash.docTitle': '90+3 — Visitor dashboard'
  });

  const state = {
    lang: 'en',
    nodes: []
  };

  function t(key, vars) {
    const table = DICT[state.lang] || DICT.en;
    let out = table[key] != null ? table[key] : (DICT.en[key] != null ? DICT.en[key] : key);
    if (vars) {
      Object.keys(vars).forEach((k) => {
        out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return out;
  }

  function capture() {
    state.nodes = Array.from(document.querySelectorAll('[data-i18n], [data-i18n-html]'));
    state.nodes.forEach((el) => {
      if (!el.dataset.origHtml) el.dataset.origHtml = el.innerHTML;
    });
  }

  function apply(lang, opts) {
    const next = lang === 'es' ? 'es' : 'en';
    state.lang = next;
    document.documentElement.lang = next;
    try { localStorage.setItem('903-lang', next); } catch (e) { /* ignore */ }

    if (!state.nodes.length) capture();

    state.nodes.forEach((el) => {
      if (el.classList.contains('sub-result')) return;
      const key = el.dataset.i18n || el.dataset.i18nHtml;
      const val = (next !== 'en' && DICT[next] && DICT[next][key] != null) ? DICT[next][key] : el.dataset.origHtml;
      if (el.innerHTML !== val) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      const key = el.dataset.i18nPh;
      el.placeholder = (next !== 'en' && DICT[next][key]) || DICT.en[key] || el.placeholder;
    });

    const title = t('meta.title');
    if (title !== 'meta.title') document.title = title;
    const desc = document.querySelector('meta[name="description"]');
    const d = t('meta.desc');
    if (desc && d !== 'meta.desc') desc.setAttribute('content', d);

    document.querySelectorAll('[data-lang]').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.lang === next ? 'true' : 'false');
    });

    if (opts && opts.silent) return;
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: next } }));
  }

  function init() {
    capture();
    let lang = 'en';
    try {
      const url = new URLSearchParams(location.search).get('lang');
      const saved = localStorage.getItem('903-lang');
      if (url === 'es' || url === 'en') lang = url;
      else if (saved === 'es' || saved === 'en') lang = saved;
      else if ((navigator.language || '').toLowerCase().startsWith('es')) lang = 'es';
    } catch (e) { /* ignore */ }
    apply(lang, { silent: true });
    document.querySelectorAll('[data-lang]').forEach((b) => {
      b.addEventListener('click', () => {
        apply(b.dataset.lang);
        document.dispatchEvent(new CustomEvent('langpick', { detail: { lang: b.dataset.lang } }));
      });
    });
  }

  window.I18N = { init, apply, t, get lang() { return state.lang; } };
})();
