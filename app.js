// v5 — auto-advance, SFTP Detecno default, ERP + archivo salida, logo/colores y footer Detecno
const questions = [
  { id: 'erp', type: 'radio', label: '¿Qué sistema usan para facturar?', options: ['ERP de Nómina', 'Otro ERP (SAP/Oracle/Dynamics/Propio)', 'No tienen ERP'] },
  { id: 'erp_archivo_salida', type: 'text', label: '¿Cómo se llama / en qué formato sale el archivo de su ERP para facturación?', placeholder: 'Ej. facturas.txt, export.xml, layout_cliente.csv' },
  { id: 'entrada', type: 'radio', label: '¿Cuál es el formato de entrada principal?', options: ['TXT (layout Detecno)', 'XML (sin normalización)', 'XML (requiere normalización)', 'Otro/Propietario'], help: 'Archivo que recibe el sistema para emitir CFDI.' },
  { id: 'addendas', type: 'radio', label: '¿Sus clientes piden información especial en las facturas (addendas)?', options: ['Sí', 'No'] },
  { id: 'complementos', type: 'radio', label: '¿Requieren complementos fiscales adicionales (nómina, retenciones, pagos, etc.)?', options: ['Sí', 'No'] },
  { id: 'masiva_excel', type: 'radio', label: '¿Generan facturas de forma masiva desde Excel?', options: ['Sí', 'No'] },
  { id: 'correo', type: 'radio', label: '¿Se requiere envío automático por correo?', options: ['Sí', 'No'] },
  { id: 'impresion', type: 'radio', label: '¿Se requiere impresión de documentos?', options: ['Sí', 'No'] },
  { id: 'salida_sftp', type: 'radio', label: '¿Necesitan dejar XML/PDF en una carpeta de salida?', options: ['Sí, en un SFTP de Detecno', 'Sí, en un SFTP del cliente', 'No necesitan carpeta de salida'] },
  { id: 'metodo_insercion', type: 'radio', label: 'Método de inserción sugerido (puedes cambiarlo si aplica)', options: ['Webservice Detecno', 'SFTP de Detecno', 'SFTP del cliente'], help: 'Se sugiere según formato de entrada y normalización.' },
  { id: 'usuarios', type: 'number', label: '¿Cuántos usuarios usarán el portal? (aprox.)', placeholder: 'Ej. 5' },
  { id: 'rate_timbrado', type: 'number', label: '¿Qué rate de timbrado aproximado se necesita (CFDIs/mes)?', placeholder: 'Ej. 20000' }
];

const state = { idx: 0, answers: {} };

function autoSuggestInsertionMethod() {
  // Reglas:
  // - XML sin normalización => Webservice Detecno
  // - TXT (layout Detecno) o XML con normalización => SFTP (SUGERIR SFTP de Detecno por defecto)
  // - Otro/Propietario => SFTP (SUGERIR SFTP de Detecno por defecto)
  const entrada = state.answers['entrada'];
  if (entrada === 'XML (sin normalización)') {
    state.answers['metodo_insercion'] = 'Webservice Detecno';
  } else if (entrada === 'TXT (layout Detecno)' || entrada === 'XML (requiere normalización)' || entrada === 'Otro/Propietario') {
    // Sugerir SFTP de Detecno por defecto (requerimiento)
    state.answers['metodo_insercion'] = 'SFTP de Detecno';
  }
}

function renderQuestion() {
  const container = document.getElementById('question-container');
  container.innerHTML = '';
  const q = questions[state.idx];

  // Antes de pintar la pregunta de método, calculamos sugerencia
  if (q.id === 'metodo_insercion') autoSuggestInsertionMethod();

  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = q.label;
  fieldset.appendChild(legend);

  if (q.help) {
    const small = document.createElement('small');
    small.className = 'note';
    small.textContent = q.help;
    fieldset.appendChild(small);
  }

  if (q.type === 'radio') {
    const wrap = document.createElement('div');
    wrap.className = 'options';
    q.options.forEach(opt => {
      const label = document.createElement('label');
      label.className = 'opt';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = q.id;
      input.value = opt;
      if (state.answers[q.id] === opt) input.checked = true;
      input.addEventListener('change', () => {
        state.answers[q.id] = opt;
        goNext(); // auto-avance
      });
      const span = document.createElement('span');
      span.textContent = opt;
      label.appendChild(input);
      label.appendChild(span);
      wrap.appendChild(label);
    });
    fieldset.appendChild(wrap);
  } else if (q.type === 'number' || q.type === 'text') {
    const input = document.createElement('input');
    input.type = q.type;
    input.placeholder = q.placeholder || '';
    input.value = state.answers[q.id] || '';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        state.answers[q.id] = e.target.value;
        goNext();
      }
    });
    input.addEventListener('blur', (e) => {
      if (e.target.value !== '') {
        state.answers[q.id] = e.target.value;
        goNext();
      }
    });
    fieldset.appendChild(input);
  }

  container.appendChild(fieldset);

  // Botones
  document.getElementById('prevBtn').disabled = state.idx === 0;
  document.getElementById('nextBtn').classList.add('hidden'); // siempre oculto
  document.getElementById('nextBtn').disabled = true;
}

function score() {
  const a = state.answers;
  const erpNomina = a.erp === 'ERP de Nómina';
  const entrada = a.entrada || '';
  const needsNormal = entrada.includes('requiere normalización');
  const entradaXML = entrada.includes('XML');
  const entradaTXT = entrada.includes('TXT');
  const needsAddenda = a.addendas === 'Sí';
  const needsComplementos = a.complementos === 'Sí' || erpNomina;
  const masiva = a.masiva_excel === 'Sí';
  const requiereImpresion = a.impresion === 'Sí';
  const salidaSFTP = a.salida_sftp && a.salida_sftp.startsWith('Sí');
  const usuarios = parseInt(a.usuarios || '0', 10);
  const rate = parseInt(a.rate_timbrado || '0', 10);

  const altoVolumen = rate >= 20000 || usuarios >= 50;
  const medioVolumen = rate >= 10000 || usuarios >= 25;
  const storageOrPrint = salidaSFTP || requiereImpresion;

  // Reglas priorizadas
  if (
    (entradaXML && (needsNormal || needsAddenda)) ||
    altoVolumen ||
    (storageOrPrint && (entradaXML || needsNormal || needsAddenda)) ||
    (needsComplementos && (needsNormal || needsAddenda || entradaXML))
  ) {
    return { title: 'Emisión Dedicada', desc: 'Requiere personalización por XML/normalización/addendas, complementos y/o alto volumen.' };
  }

  if (entradaTXT && (medioVolumen || storageOrPrint || needsComplementos)) {
    return { title: 'CFDI Manager Emisión + Extensiones', desc: 'Entrada TXT con necesidades adicionales (volumen medio, SFTP/impresión y/o complementos).' };
  }

  if (entradaTXT && !needsNormal && !needsAddenda && !storageOrPrint && rate < 10000 && usuarios < 25) {
    return { title: 'CFDI Manager Emisión', desc: 'Escenario estándar con entrada TXT, bajo volumen y sin personalizaciones especiales.' };
  }

  return { title: 'Revisión Preventa', desc: 'Se requiere más detalle para una recomendación cerrada. Escalar a preventa.' };
}

function showResult() {
  const res = score();
  document.getElementById('questionnaire').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('result-text').innerHTML = `<span class="result-badge">${res.title}</span><p class="mt">${res.desc}</p>`;

  // Mostrar método de inserción elegido
  const metodo = state.answers['metodo_insercion'] || '(no especificado)';
  document.getElementById('insertion-text').innerHTML = `<strong>Método de inserción:</strong> ${metodo} <span class="note">(sugerido según formato de entrada y normalización)</span>`;

  // Resumen de respuestas
  const entries = Object.entries(state.answers);
  document.getElementById('answers-summary').innerHTML = entries.map(([k,v]) => `<div><strong>${k}</strong>: ${v || '-'}</div>`).join('');
}

function goNext() {
  if (state.idx < questions.length - 1) {
    state.idx++;
    renderQuestion();
  } else {
    showResult();
  }
}

document.getElementById('prevBtn').addEventListener('click', () => {
  if (state.idx > 0) state.idx--;
  renderQuestion();
});

document.getElementById('restartBtn')?.addEventListener('click', () => location.reload());

renderQuestion();
