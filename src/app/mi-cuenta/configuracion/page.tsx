import { redirect } from "next/navigation";
import FormularioPerfil from "@/components/cliente/perfil/FormularioPerfil";
import { documento, fecha, telefonoCO } from "@/lib/admin/format";
import { hoyEnBogota } from "@/lib/admin/horario";
import { enlaceWhatsApp, primerNombre } from "@/lib/admin/whatsapp";
import { getMisDatos } from "@/lib/cliente/datos";
import { esMenorDeEdad } from "@/lib/cliente/registro";
import { TELEFONO_ESTUDIO } from "@/lib/contacto";

/**
 * Área de cliente → Mi perfil (nov 2026; antes «Mi cuenta»), con el formato
 * de «Mi perfil» de DEMO adminGym (decisión del usuario).
 *
 * Los datos de CONTACTO (teléfono, EPS, dirección y contacto de emergencia)
 * los corrige él mismo (`guardarMisDatos` → `actualizar_mis_datos`). Nombre,
 * correo, documento, fecha de nacimiento y acudiente van con candado: los
 * corrige recepción, que comprueba quién es. El correo además es su usuario,
 * y cambiarlo desde la web sin verificarlo abriría la puerta a quedarse con
 * una cuenta.
 */
export default async function MiPerfilPage() {
  const datos = await getMisDatos();
  if (!datos) redirect("/login");
  const [tipo, ...num] = datos.documento.split(" ");
  const menor = datos.fechaNacimiento ? esMenorDeEdad(datos.fechaNacimiento, hoyEnBogota()) : null;
  const acudiente = datos.acudienteNombre
    ? `${datos.acudienteNombre}${datos.acudienteTelefono ? ` · ${telefonoCO(datos.acudienteTelefono)}` : ""}`
    : null;

  return (
    <div className="space-y-6">
      <section className="text-center md:text-left">
        <h1 className="font-display text-4xl text-verde sm:text-5xl">Mi perfil</h1>
        <p className="mt-2 text-verde-700">Cliente desde el {fecha(datos.alta, true)}.</p>
      </section>

      <FormularioPerfil
        bloqueados={{
          nombre: datos.nombre,
          correo: datos.correo ?? "—",
          documento: `${tipo} ${documento(num.join(" "))}`,
          fechaNacimiento: datos.fechaNacimiento ? fecha(datos.fechaNacimiento, true) : "Sin dato",
          acudiente,
        }}
        inicial={{
          telefono: datos.telefono ?? "",
          direccion: datos.direccion ?? "",
          eps: datos.eps ?? "",
          emergenciaNombre: datos.emergenciaNombre ?? "",
          emergenciaTelefono: datos.emergenciaTelefono ?? "",
        }}
        menor={menor}
        enlaceCorreccion={enlaceWhatsApp(
          TELEFONO_ESTUDIO,
          `Hola, soy ${primerNombre(datos.nombre)} (${datos.correo ?? ""}). Quiero corregir un dato de mi ficha: `,
        )}
      />
    </div>
  );
}
