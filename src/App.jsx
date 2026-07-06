import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  Timestamp,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

export default function App() {
  // 📌 PANTALLA
  const [pantalla, setPantalla] = useState("home");

  // 🎯 OBJETIVO
  const [objetivo, setObjetivo] = useState({
    dormir: "22:00",
    despertar: "07:00",
    editando: false,
  });

  // 📝 FORMULARIO
  const [horaDormir, setHoraDormir] = useState("");
  const [horaDespertar, setHoraDespertar] = useState("");
  const [comentario, setComentario] = useState("");

  // 📅 SELECCIÓN DE DÍA
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // 📊 REGISTROS
  const [registros, setRegistros] = useState([]);

  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  // 🚀 FECHA ACTUAL (AQUÍ VA)
  const hoy = new Date();

  const [fechaActual, setFechaActual] = useState({
    anio: hoy.getFullYear(),
    mes: hoy.getMonth(),
  });

  // 📅 MESES
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
  ];

  const fechaCompleta = `${diasSemana[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]} del ${hoy.getFullYear()}`;

  // 🧠 CALCULAR ESTADO
  function calcularEstado(registro) {
    const obj = registro.objetivoSnapshot;

    const dormioBien =
      normalizarHora(registro.dormir) === normalizarHora(obj.dormir);

    const despertoBien =
      normalizarHora(registro.despertar) === normalizarHora(obj.despertar);

    if (dormioBien && despertoBien) return "verde";
    if (dormioBien || despertoBien) return "naranja";
    return "rojo";
  }

  // 🎨 COLORES
  function colorEstado(estado) {
    if (estado === "verde") return "bg-green-500";
    if (estado === "naranja") return "bg-orange-500";
    return "bg-red-500";
  }

  // 🕒 FORMATO 12 HORAS
  function formatearHora(hora) {
    if (!hora) return "";

    let [horas, minutos] = hora.split(":");

    horas = parseInt(horas);

    const ampm = horas >= 12 ? "PM" : "AM";

    horas = horas % 12;

    if (horas === 0) horas = 12;

    return `${horas}:${minutos} ${ampm}`;
  }

  // 💾 GUARDAR
  async function guardarRegistro() {
    try {
      if (!horaDormir || !horaDespertar) {
        console.log("❌ Campos vacíos");
        return;
      }

      const hoy = new Date();

      const nuevo = {
        dormir: horaDormir,
        despertar: horaDespertar,
        comentario: comentario,

        fecha: hoy.getDate(),
        mes: hoy.getMonth(),
        anio: hoy.getFullYear(),
        fechaKey: `${hoy.getDate()}-${hoy.getMonth() + 1}-${hoy.getFullYear()}`,

        // 🔥 GUARDAS EL OBJETIVO EN ESE MOMENTO
        objetivoSnapshot: {
          dormir: objetivo.dormir,
          despertar: objetivo.despertar
        },

        createdAt: Timestamp.now()
      };

      console.log("📤 Enviando a Firebase:", nuevo);

      const docRef = await addDoc(collection(db, "registros"), nuevo);

      console.log("✅ Guardado con ID:", docRef.id);

      setHoraDormir("");
      setHoraDespertar("");
      localStorage.removeItem("horaDespertar");
      setComentario("");

      setPantalla("historial");

    } catch (error) {
      console.error("❌ ERROR FIREBASE:", error);
    }
  }

  // 📅 GENERAR CALENDARIO
  function generarDias(mes, anio) {
    const dias = [];

    // PRIMER DÍA DEL MES
    const primerDia = new Date(anio, mes, 1).getDay();

    // TOTAL DÍAS DEL MES
    const totalDias = new Date(anio, mes + 1, 0).getDate();

    // AJUSTE PARA QUE LUNES SEA EL PRIMERO
    const inicio = primerDia === 0 ? 6 : primerDia - 1;

    // ESPACIOS VACÍOS
    for (let i = 0; i < inicio; i++) {
      dias.push(null);
    }

    // DÍAS REALES
    for (let i = 1; i <= totalDias; i++) {
      dias.push({
        dia: i,
        mes,
        anio,
        fechaKey: `${i}-${mes + 1}-${anio}`
      });
    }

    return dias;
  }

  // 📊 ESTADO POR DÍA
  function estadoDelDia(dia) {
    const registro = registros.find(r =>
      r.fechaKey === dia.fechaKey
    );

    if (!registro) return "gris";

    return calcularEstado(registro);
  }

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (user) => {

      if (user) {

        console.log("✅ Usuario autenticado:", user.email);

        setUsuario(user);

        cargarRegistros();
        cargarObjetivo();

      } else {

        console.log("❌ No hay usuario autenticado");

        setUsuario(null);

      }

      setCargandoAuth(false);

    });

    return () => unsubscribe();

  }, []);

  // 💾 CARGAR DATOS TEMPORALES
  useEffect(() => {
    const despertarGuardado = localStorage.getItem("horaDespertar");

    if (despertarGuardado) {
      setHoraDespertar(despertarGuardado);
    }
  }, []);

  function cargarRegistros() {
    const ref = collection(db, "registros");

    return onSnapshot(ref, (snapshot) => {
      const datos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log("🔥 Datos en tiempo real:", datos);

      setRegistros(datos);
    });
  }

  async function guardarObjetivo() {
    try {
      await setDoc(doc(db, "objetivo", "principal"), {
        dormir: objetivo.dormir,
        despertar: objetivo.despertar
      });

      setObjetivo({ ...objetivo, editando: false });

      console.log("🎯 Objetivo guardado");
    } catch (error) {
      console.error(error);
    }
  }

  async function cargarObjetivo() {
    const ref = doc(db, "objetivo", "principal");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setObjetivo(prev => ({
        ...prev,
        ...snap.data()
      }));

      console.log("📥 Objetivo cargado");
    }
  }

  async function iniciarSesion() {
    try {
      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);

      console.log("✅ Sesión iniciada");

    } catch (error) {
      console.error("❌ Error al iniciar sesión:", error);
    }
  }

  function normalizarHora(hora) {
    if (!hora) return "";
    const [h, m] = hora.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }

  function esHoy(dia) {
    const hoy = new Date();

    return (
      dia.dia === hoy.getDate() &&
      dia.mes === hoy.getMonth() &&
      dia.anio === hoy.getFullYear()
    );
  }

  // ==================== AUTH ====================

  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <h2>Cargando...</h2>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl text-center">

          <h1 className="text-3xl font-bold mb-4">
            Sleep Tracker
          </h1>

          <p className="text-gray-400 mb-6">
            Inicia sesión con tu cuenta de Google.
          </p>

          <button
            onClick={iniciarSesion}
            className="bg-blue-600 px-6 py-3 rounded-xl"
          >
            Continuar con Google
          </button>

        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 p-5">
      <div className="max-w-md mx-auto">

        <h1 className="text-3xl font-bold mb-6">
          Sleep Tracker
        </h1>

        {/* ================= HOME ================= */}
        {pantalla === "home" && (
          <>
            {/* OBJETIVO */}
            <div className="bg-gray-900 rounded-2xl p-5 mb-5 border border-gray-800">
              <h2 className="text-xl font-semibold">
                Objetivo
              </h2>

              <p className="text-sm text-gray-400">
                {fechaCompleta}
              </p>

              {!objetivo.editando ? (
                <>
                  <div className="flex justify-between mb-2">
                    <span>Dormir</span>
                    <span>{formatearHora(objetivo.dormir)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Despertar</span>
                    <span>{formatearHora(objetivo.despertar)}</span>
                  </div>

                  <button
                    onClick={() =>
                      setObjetivo({ ...objetivo, editando: true })
                    }
                    className="mt-4 w-full bg-gray-700 rounded-xl p-2"
                  >
                    Editar
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="time"
                    value={objetivo.dormir}
                    onChange={(e) =>
                      setObjetivo({
                        ...objetivo,
                        dormir: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 p-2 rounded-xl mb-3"
                  />

                  <input
                    type="time"
                    value={objetivo.despertar}
                    onChange={(e) =>
                      setObjetivo({
                        ...objetivo,
                        despertar: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 p-2 rounded-xl mb-3"
                  />

                  <button
                    onClick={guardarObjetivo}
                    className="w-full bg-green-600 rounded-xl p-2"
                  >
                    Guardar
                  </button>
                </>
              )}
            </div>

            {/* REGISTRO */}
            <div className="bg-gray-900 rounded-2xl p-5 mb-5 border border-gray-800">
              <h2 className="text-xl font-semibold">
                Registro
              </h2>

              <p className="text-sm text-gray-400">
                {fechaCompleta}
              </p>

              {/* HORA DE DORMIR */}
              <p className="text-sm text-gray-400 mb-1">
                Dormí a las
              </p>

              <input
                type="time"
                value={horaDormir}
                onChange={(e) => setHoraDormir(e.target.value)}
                className="w-full bg-gray-800 p-3 rounded-xl mb-3"
              />

              {/* HORA DE DESPERTAR */}
              <p className="text-sm text-gray-400 mb-1">
                Desperté a las
              </p>

              <input
                type="time"
                value={horaDespertar}
                onChange={(e) => {
                  setHoraDespertar(e.target.value);

                  // 💾 GUARDAR EN CELULAR
                  localStorage.setItem("horaDespertar", e.target.value);
                }}
                className="w-full bg-gray-800 p-3 rounded-xl mb-3"
              />

              {/* COMENTARIO */}
              <p className="text-sm text-gray-400 mb-1">
                Comentario
              </p>

              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="w-full bg-gray-800 p-3 rounded-xl mb-3 h-24"
              />

              <button
                onClick={guardarRegistro}
                className="w-full bg-blue-600 rounded-xl p-3"
              >
                Guardar
              </button>
            </div>
          </>
        )}

        {/* ================= HISTORIAL ================= */}
        {pantalla === "historial" && (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Calendario
            </h2>

            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() =>
                  setFechaActual(prev => ({
                    ...prev,
                    mes: prev.mes === 0 ? 11 : prev.mes - 1,
                    anio: prev.mes === 0 ? prev.anio - 1 : prev.anio
                  }))
                }
                className="text-gray-400"
              >
                ◀
              </button>

              <h2 className="text-lg font-bold">
                {meses[fechaActual.mes]} {fechaActual.anio}
              </h2>

              <button
                onClick={() =>
                  setFechaActual(prev => ({
                    ...prev,
                    mes: prev.mes === 11 ? 0 : prev.mes + 1,
                    anio: prev.mes === 11 ? prev.anio + 1 : prev.anio
                  }))
                }
                className="text-gray-400"
              >
                ▶
              </button>
            </div>

            {/* DÍAS DE LA SEMANA */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm text-gray-400">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
              <div>Dom</div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {generarDias(fechaActual.mes, fechaActual.anio).map((d, i) => {

                // ESPACIO VACÍO
                if (d === null) {
                  return <div key={i}></div>;
                }

                const estado = estadoDelDia(d);

                return (
                  <div
                    key={i}
                    onClick={() => setDiaSeleccionado(d)}
                    className={`
  p-2 text-center rounded-xl cursor-pointer text-sm border
  ${esHoy(d)
                        ? "border-white border-2"
                        : "border-transparent"
                      }

  ${estado === "verde"
                        ? "bg-green-500"
                        : estado === "naranja"
                          ? "bg-orange-500"
                          : estado === "rojo"
                            ? "bg-red-500"
                            : "bg-gray-800"
                      }
`}
                  >
                    {d.dia}
                  </div>
                );
              })}
            </div>

            {/* DETALLE */}
            {diaSeleccionado && (
              <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
                <h3 className="font-semibold mb-3">
                  Día {diaSeleccionado.dia}
                </h3>

                {registros
                  .filter(r => r.fecha === diaSeleccionado.dia)
                  .map((r, i) => (
                    <div key={i} className="space-y-2">

                      <p className="font-semibold text-blue-400">
                        📊 Objetivo del día
                      </p>

                      <p>🌙 Dormir objetivo: {formatearHora(r.objetivoSnapshot?.dormir)}</p>
                      <p>☀️ Despertar objetivo: {formatearHora(r.objetivoSnapshot?.despertar)}</p>

                      <hr className="border-gray-700 my-2" />

                      <p className="font-semibold text-green-400">
                        📌 Registro
                      </p>

                      <p>🌙 Dormí: {formatearHora(r.dormir)}</p>
                      <p>☀️ Desperté: {formatearHora(r.despertar)}</p>
                      <p>📝 {r.comentario}</p>
                    </div>
                  ))}

                {!registros.find(r => r.fecha === diaSeleccionado.dia) && (
                  <p className="text-gray-400">
                    No hay registro
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
        <button
          onClick={() => setPantalla("home")}
          className={`flex-1 p-4 ${pantalla === "home" ? "text-blue-400" : "text-gray-400"}`}
        >
          Home
        </button>

        <button
          onClick={() => setPantalla("historial")}
          className={`flex-1 p-4 ${pantalla === "historial" ? "text-blue-400" : "text-gray-400"}`}
        >
          Calendario
        </button>
      </div>
    </div>
  );
}