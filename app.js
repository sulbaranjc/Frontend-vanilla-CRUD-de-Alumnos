/* =========================================================================
   Frontend vanilla para CRUD de Alumnos
   - Configura la URL base según dónde corra tu API FastAPI
   - Implementa: listar, crear, editar y eliminar
   - Validación de 0..10 en inputs
   ========================================================================= */

const API_BASE = "http://127.0.0.1:8000"; // cambia si tu API usa otra URL/puerto

// --- Helpers UI ------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg, type = "ok") {
  const el = $("#snackbar");
  el.textContent = msg;
  el.className = "";
  el.classList.add(type === "ok" ? "ok" : "err");
  el.classList.add("show");
  setTimeout(() => (el.className = ""), 3000);
}

function formToPayload() {
  // Lee valores del formulario y genera el payload esperado por la API
  const nombre = $("#nombre").value.trim();
  const nota1 = parseFloat($("#nota1").value);
  const nota2 = parseFloat($("#nota2").value);
  const nota3 = parseFloat($("#nota3").value);
  const notaFinal = parseFloat($("#notaFinal").value);

  return { nombre, nota1, nota2, nota3, notaFinal };
}

function validateNotas({ nota1, nota2, nota3, notaFinal }) {
  const inRange = (n) => typeof n === "number" && !Number.isNaN(n) && n >= 0 && n <= 10;
  return inRange(nota1) && inRange(nota2) && inRange(nota3) && inRange(notaFinal);
}

// --- CRUD ------------------------------------------------------------------

// Listar todos
async function fetchAlumnos() {
  try {
    const res = await fetch(`${API_BASE}/alumnos`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    console.error(err);
    showToast("No se pudo cargar la lista.", "err");
  }
}

// Crear
async function createAlumno(payload) {
  try {
    const res = await fetch(`${API_BASE}/alumnos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    await res.json(); // la API devuelve el alumno creado
    showToast("Alumno creado");
    await fetchAlumnos();
    resetForm();
  } catch (err) {
    console.error(err);
    showToast("No se pudo crear el alumno.", "err");
  }
}

// Obtener uno (para editar)
async function getAlumno(id) {
  const res = await fetch(`${API_BASE}/alumnos/${id}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json();
}

// Actualizar
async function updateAlumno(id, payload) {
  try {
    const res = await fetch(`${API_BASE}/alumnos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    await res.json();
    showToast("Alumno actualizado");
    await fetchAlumnos();
    resetForm();
  } catch (err) {
    console.error(err);
    showToast("No se pudo actualizar.", "err");
  }
}

// Eliminar
async function deleteAlumno(id) {
  if (!confirm("¿Eliminar este alumno?")) return;
  try {
    const res = await fetch(`${API_BASE}/alumnos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    showToast("Eliminado");
    await fetchAlumnos();
  } catch (err) {
    console.error(err);
    showToast("No se pudo eliminar.", "err");
  }
}

// --- Render de tabla -------------------------------------------------------
function renderTable(rows = []) {
  const tbody = $("#alumnosTable tbody");
  const q = $("#searchInput").value.trim().toLowerCase();

  const filtered = rows.filter((r) =>
    q ? String(r.nombre).toLowerCase().includes(q) : true
  );

  tbody.innerHTML = filtered
    .map(
      (r) => `
      <tr>
        <td>${r.id}</td>
        <td>${escapeHTML(r.nombre)}</td>
        <td>${r.nota1}</td>
        <td>${r.nota2}</td>
        <td>${r.nota3}</td>
        <td>${r.notaFinal}</td>
        <td><strong>${r.promedioFinal}</strong></td>
        <td class="center">
          <button class="btn ghost" data-action="edit" data-id="${r.id}">Editar</button>
          <button class="btn danger" data-action="del" data-id="${r.id}">Borrar</button>
        </td>
      </tr>
    `
    )
    .join("");

  // Delegación de eventos para acciones
  tbody.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const action = e.currentTarget.getAttribute("data-action");
      if (action === "edit") {
        try {
          const a = await getAlumno(id);
          loadForm(a);
        } catch (err) {
          showToast("No se pudo cargar el alumno.", "err");
        }
      }
      if (action === "del") {
        await deleteAlumno(id);
      }
    })
  );
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// --- Form helpers ----------------------------------------------------------
function loadForm(a) {
  $("#alumnoId").value = a.id;
  $("#nombre").value = a.nombre;
  $("#nota1").value = a.nota1;
  $("#nota2").value = a.nota2;
  $("#nota3").value = a.nota3;
  $("#notaFinal").value = a.notaFinal;
  $("#form-title").textContent = `Editar alumno #${a.id}`;
  $("#saveBtn").textContent = "Actualizar";
}

function resetForm() {
  $("#alumno-form").reset();
  $("#alumnoId").value = "";
  $("#form-title").textContent = "Crear alumno";
  $("#saveBtn").textContent = "Guardar";
}

// --- Eventos UI ------------------------------------------------------------
$("#alumno-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = formToPayload();

  if (!payload.nombre) {
    showToast("El nombre es obligatorio.", "err");
    return;
  }
  if (!validateNotas(payload)) {
    showToast("Las notas deben estar entre 0 y 10.", "err");
    return;
  }

  const id = $("#alumnoId").value;
  if (id) {
    await updateAlumno(id, payload);
  } else {
    await createAlumno(payload);
  }
});

$("#resetBtn").addEventListener("click", resetForm);
$("#refreshBtn").addEventListener("click", fetchAlumnos);
$("#searchInput").addEventListener("input", fetchAlumnos);

// Carga inicial
fetchAlumnos();
