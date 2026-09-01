/**
 * Enlaces al portal de la Corte de Constitucionalidad.
 *
 * No hay permalink por resolución y no puede haberlo: el portal
 * (`consultajur.cc.gob.gt/wcJur/Portal/`) es ASP.NET WebForms, cada consulta
 * es un postback con `__VIEWSTATE`, y los botones del listado arman su URL con
 * la sesión viva. Lo único estable es el número de expediente, así que se
 * enlaza a la búsqueda por expediente y el usuario da un clic más.
 *
 * La cita durable de una resolución es, de todos modos, expediente + fecha.
 *
 * Vive fuera de `lib/services/queries/` porque los componentes cliente la
 * necesitan y ese directorio es `server-only`.
 */
export const CC_PORTAL_EXPEDIENTE_URL =
  'https://consultajur.cc.gob.gt/wcJur/Portal/wfNumExpediente.aspx'

export const CC_PORTAL_HOME_URL = 'https://consultajur.cc.gob.gt/wcJur/Portal/wfPrincipal.aspx'
