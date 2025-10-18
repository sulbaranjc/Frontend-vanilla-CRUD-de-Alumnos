
/* =========================================================================
   Frontend vanilla con modales (Login + Crear/Editar + Confirmación) y JWT
   ========================================================================= */
const API_BASE = "http://127.0.0.1:8000";

// ---- helpers DOM/UI
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function showToast(msg, type="ok"){
  const el = $("#snackbar");
  el.textContent = msg;
  el.className = "";
  el.classList.add(type==="ok"?"ok":"err","show");
  setTimeout(()=> el.className="", 3000);
}

// ---- modal helpers
function openModal(id){
  const m = document.getElementById(id);
  if(!m) return;
  m.setAttribute("aria-hidden","false");
  const first = m.querySelector("input,button,select,textarea");
  if(first) setTimeout(()=> first.focus(), 50);
}
function closeModal(id){
  const m = document.getElementById(id);
  if(!m) return;
  m.setAttribute("aria-hidden","true");
}
document.addEventListener("click", (e)=>{
  const closeTarget = e.target.closest("[data-close]");
  if(closeTarget){
    closeModal(closeTarget.getAttribute("data-close"));
  }
  if(e.target.classList.contains("modal")){
    e.target.setAttribute("aria-hidden","true");
  }
});

// ---- auth helpers
const getToken = () => localStorage.getItem("token");
const isAuthenticated = () => !!getToken();
const getAuthHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};
function setAuthState(){
  const logged = isAuthenticated();
  $("#loginBtn").hidden = logged;
  $("#logoutBtn").hidden = !logged;
  $("#newAlumnoBtn").disabled = !logged;

  $$("#alumnosTable [data-action]").forEach(btn=>{
    btn.style.display = logged ? "inline-block" : "none";
  });
}

// ---- CRUD
async function fetchAlumnos(){
  try{
    const res = await fetch(`${API_BASE}/alumnos`);
    if(!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    renderAlumnos(data);
  }catch(err){
    console.error(err);
    renderAlumnos([]);
    showToast("No se pudieron cargar los alumnos","err");
  }
}

async function createAlumno(payload){
  const res = await fetch(`${API_BASE}/alumnos`, {
    method:"POST",
    headers:{"Content-Type":"application/json", ...getAuthHeaders()},
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
async function updateAlumno(id, payload){
  const res = await fetch(`${API_BASE}/alumnos/${id}`, {
    method:"PUT",
    headers:{"Content-Type":"application/json", ...getAuthHeaders()},
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
async function deleteAlumno(id){
  const res = await fetch(`${API_BASE}/alumnos/${id}`, {
    method:"DELETE",
    headers:{...getAuthHeaders()}
  });
  if(!res.ok) throw new Error(`Error ${res.status}`);
  showToast("Eliminado");
  fetchAlumnos();
}
async function getAlumno(id){
  const res = await fetch(`${API_BASE}/alumnos/${id}`);
  if(!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function renderAlumnos(rows=[]){
  const tbody = $("#alumnosTable tbody");
  const q = $("#searchInput").value.trim().toLowerCase();
  const filtered = rows.filter(r => q ? String(r.nombre).toLowerCase().includes(q) : true);
  tbody.innerHTML = filtered.map(r => `
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
  `).join("");
  setAuthState();

  tbody.querySelectorAll("button").forEach(btn => btn.addEventListener("click", async (e)=>{
    const id = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action;
    if(action==="edit"){
      try{
        const a = await getAlumno(id);
        loadForm(a);
        openModal("alumnoModal");
      }catch(err){
        showToast("No se pudo cargar el alumno","err");
      }
    }
    if(action==="del"){
      // Abrir confirmación con modal custom
      pendingDeleteId = id;
      $("#confirmMessage").textContent = `¿Deseas eliminar al alumno #${id}? Esta acción es irreversible.`;
      openModal("confirmModal");
    }
  }));
}

function escapeHTML(str){
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

// ---- form alumno
function formToPayload(){
  return {
    nombre: $("#nombre").value.trim(),
    nota1: parseFloat($("#nota1").value),
    nota2: parseFloat($("#nota2").value),
    nota3: parseFloat($("#nota3").value),
    notaFinal: parseFloat($("#notaFinal").value),
  };
}
function validateNotas({nota1,nota2,nota3,notaFinal}){
  const ok = n => typeof n === "number" && !Number.isNaN(n) && n>=0 && n<=10;
  return ok(nota1) && ok(nota2) && ok(nota3) && ok(notaFinal);
}
function loadForm(a){
  $("#alumnoId").value = a.id ?? "";
  $("#alumnoTitle").textContent = a.id ? `Editar alumno #${a.id}` : "Nuevo alumno";
  $("#saveBtn").textContent = a.id ? "Actualizar" : "Guardar";
  $("#nombre").value = a.nombre ?? "";
  $("#nota1").value = a.nota1 ?? "";
  $("#nota2").value = a.nota2 ?? "";
  $("#nota3").value = a.nota3 ?? "";
  $("#notaFinal").value = a.notaFinal ?? "";
}
function resetForm(){
  loadForm({});
}
$("#resetBtn").addEventListener("click", resetForm);

$("#alumno-form").addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!isAuthenticated()){ showToast("Debes iniciar sesión","err"); openModal("loginModal"); return; }
  const payload = formToPayload();
  if(!payload.nombre){ showToast("El nombre es obligatorio","err"); return; }
  if(!validateNotas(payload)){ showToast("Las notas deben estar entre 0 y 10","err"); return; }

  const id = $("#alumnoId").value;
  try{
    if(id){ await updateAlumno(id, payload); showToast("Alumno actualizado"); }
    else { await createAlumno(payload); showToast("Alumno creado"); }
    closeModal("alumnoModal");
    resetForm();
    fetchAlumnos();
  }catch(err){
    console.error(err);
    showToast("Operación fallida","err");
  }
});

// ---- login UI
$("#loginBtn").addEventListener("click", ()=> openModal("loginModal"));
$("#newAlumnoBtn").addEventListener("click", ()=>{
  if(!isAuthenticated()){ showToast("Debes iniciar sesión","err"); openModal("loginModal"); return; }
  resetForm();
  openModal("alumnoModal");
});

$("#login-form").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const username = $("#username").value.trim();
  const password = $("#password").value;
  try{
    const res = await fetch(`${API_BASE}/auth/login`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({username,password})
    });
    if(!res.ok) throw new Error("Login fallido");
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setAuthState();
    closeModal("loginModal");
    showToast("Sesión iniciada");
    fetchAlumnos();
  }catch(err){
    console.error(err);
    showToast("Credenciales inválidas","err");
  }
});

$("#logoutBtn").addEventListener("click", ()=>{
  localStorage.removeItem("token");
  setAuthState();
  showToast("Sesión cerrada");
});

// ---- confirm delete modal
let pendingDeleteId = null;
$("#confirmOkBtn").addEventListener("click", async ()=>{
  if(!pendingDeleteId) return;
  try{
    await deleteAlumno(pendingDeleteId);
    showToast("Alumno eliminado");
  }catch(e){
    showToast("No se pudo eliminar","err");
  }finally{
    pendingDeleteId = null;
    closeModal("confirmModal");
  }
});

// ---- topbar events
$("#refreshBtn").addEventListener("click", fetchAlumnos);
$("#searchInput").addEventListener("input", fetchAlumnos);

// init
setAuthState();
fetchAlumnos();
