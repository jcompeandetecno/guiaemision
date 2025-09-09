const questions = [
  { id: 'entrada', type: 'radio', label: '¿Cuál es el formato de entrada principal?', options: ['TXT', 'XML', 'Otro'], help: 'Archivo que recibe el sistema para emitir CFDI.' },
  { id: 'normalizacion', type: 'radio', label: '¿Se requiere normalización de datos?', options: ['Sí', 'No'], help: 'Mapeo/transformación de campos antes del timbrado.' },
  { id: 'correo', type: 'radio', label: '¿Se requiere envío por correo automático?', options: ['Sí', 'No'] },
  { id: 'impresion', type: 'radio', label: '¿Se requiere impresión de documentos?', options: ['Sí', 'No'] },
  { id: 'masiva_excel', type: 'radio', label: '¿Habrá emisión masiva a partir de Excel?', options: ['Sí', 'No'] },
  { id: 'complementos', type: 'radio', label: '¿Se requieren complementos fiscales adicionales?', options: ['Sí', 'No'] },
  { id: 'addendas', type: 'radio', label: '¿Se requieren addendas adicionales?', options: ['Sí', 'No'] },
  { id: 'salida_sftp', type: 'radio', label: '¿El cliente necesita que las facturas (XML/PDF) se guarden automáticamente en una carpeta de salida?', options: ['Sí, en un SFTP de Detecno', 'Sí, en un SFTP del cliente', 'No necesitan carpeta de salida'], help: 'Entrega automática de XML/PDF en carpeta SFTP.' },
  { id: 'usuarios', type: 'number', label: '¿Cuántos usuarios usarán el portal? (aprox.)', placeholder: 'Ej. 5' },
  { id: 'rate_timbrado', type: 'number', label: '¿Qué rate de timbrado aproximado se necesita (CFDIs/mes)?', placeholder: 'Ej. 5000' }
];

const state = { idx: 0, answers: {} };

function renderQuestion() {
  const container = document.getElementById('question-container');
  container.innerHTML = '';
  const q = questions[state.idx];

  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = q.label;
  fieldset.appendChild(legend);

  if (q.help) {
    const small = document.createElement('small');
    small.style.opacity = .8;
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
      input.addEventListener('change', () => (state.answers[q.id] = opt));
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
    input.addEventListener('input', e => (state.answers[q.id] = e.target.value));
    fieldset.appendChild(input);
  }

  container.appendChild(fieldset);

  document.getElementById('prevBtn').disabled = state.idx === 0;
  document.getElementById('nextBtn').textContent = state.idx === questions.length - 1 ? 'Ver resultado' : 'Siguiente';
}

function score() {
  const a = state.answers;
  const needsNormal = a.normalizacion === 'Sí';
  const needsAddenda = a.addendas === 'Sí' || a.complementos === 'Sí';
  const entradaXML = a.entrada === 'XML';
  const entradaTXT = a.entrada === 'TXT';
  const masiva = a.masiva_excel === 'Sí';
  const sftpSalida = a.salida_sftp === 'Sí, en un SFTP de Detecno' || a.salida_sftp === 'Sí, en un SFTP del cliente';
  const requiereImpresion = a.impresion === 'Sí';
  const storageOrPrint = sftpSalida || requiereImpresion;
  const altoVolumen = (parseInt(a.rate_timbrado || '0', 10) >= 10000) || (parseInt(a.usuarios || '0', 10) >= 25);

  if (entradaXML && (needsNormal || needsAddenda)) {
    return { title: 'Emisión Dedicada', desc: 'Requiere XML con normalización/addendas. Ambiente personalizable e integrable con ERP.' };
  }
  if (entradaTXT && masiva && !storageOrPrint) {
    return { title: 'CFDI Manager Emisión', desc: 'Entrada TXT y carga masiva desde Excel para timbrado ágil, sin impresión/carpeta de salida.' };
  }
  if (altoVolumen || storageOrPrint) {
    const motivo = altoVolumen ? 'alto volumen' : 'necesidad de carpeta SFTP/impresión';
    return { title: 'Emisión Dedicada', desc: `Por ${motivo}, un ambiente dedicado ofrece mejor rendimiento, control y trazabilidad.` };
  }
  if (entradaTXT && !needsNormal) {
    return { title: 'CFDI Manager Emisión', desc: 'Configuración estándar con entrada TXT sin normalización. Implementación rápida.' };
  }
  return { title: 'Revisión Preventa', desc: 'Se requiere más detalle para una recomendación cerrada. Escalar a preventa.' };
}

function showResult() {
  const res = score();
  document.getElementById('questionnaire').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('result-text').innerHTML = `<span class="result-badge">${res.title}</span><p class="mt">${res.desc}</p>`;
  const entries = Object.entries(state.answers);
  document.getElementById('answers-summary').innerHTML = entries.map(([k,v]) => `<div><strong>${k}</strong>: ${v || '-'}</div>`).join('');
}

document.getElementById('prevBtn').addEventListener('click', () => {
  if (state.idx > 0) state.idx--;
  renderQuestion();
});

document.getElementById('nextBtn').addEventListener('click', () => {
  const q = questions[state.idx];
  if (q.type === 'radio' && !q.options.includes(state.answers[q.id])) {
    alert('Selecciona una opción para continuar.');
    return;
  }
  if (state.idx < questions.length - 1) {
    state.idx++;
    renderQuestion();
  } else {
    showResult();
  }
});

document.getElementById('restartBtn')?.addEventListener('click', () => location.reload());
renderQuestion();
