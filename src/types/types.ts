import { Timestamp } from 'firebase/firestore';

export type TipoCliente = "Particular" | "Ñuñoa" | "Peñalolen" | "El Bosque";
export const TIPOS_CLIENTE: TipoCliente[] = ["Particular", "Ñuñoa", "Peñalolen", "El Bosque"];

export type TicketEstado = "Pendiente" | "Coordinado" | "En Proceso" | "Completado" | "Reagendado" | "Cancelado";
export const TICKET_ESTADOS: TicketEstado[] = ["Pendiente", "Coordinado", "En Proceso", "Completado", "Reagendado", "Cancelado"];

export interface Beneficiario {
  nombre: string;
  rut: string;
  telefono: string;
  direccion: string;
}

export interface ClosureDetails {
  motivo: string;
  solucion: string;
  observacionesCierre: string;
}

export interface Ticket {
  id: string;
  tipoCliente: TipoCliente;
  beneficiario: Beneficiario;
  tipoServicio: string;
  fechaCoordinacion: string;
  horaCoordinacion: string;
  tecnicoAsignado: Tecnico;
  estado: string;
  descripcion: string;
  observaciones: string;
  contactoCoordinacion: string;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  historial?: Array<{ fecha: Timestamp; cambio: string; usuario?: string }>;
  detallesCierre?: ClosureDetails;
}

export const TECNICOS = ["Roberto Rojas", "Cristobal Rojas", "Gerardo Vega", "Daniel Osorio A."] as const;
export type Tecnico = typeof TECNICOS[number];

export const ESTADO_COLORES: Record<TicketEstado, string> = {
  "Pendiente": "bg-yellow-200 text-yellow-800 dark:bg-yellow-300 dark:text-yellow-900",
  "Coordinado": "bg-blue-200 text-blue-800 dark:bg-blue-300 dark:text-blue-900",
  "En Proceso": "bg-indigo-200 text-indigo-800 dark:bg-indigo-300 dark:text-indigo-900",
  "Completado": "bg-green-200 text-green-800 dark:bg-green-300 dark:text-green-900",
  "Reagendado": "bg-purple-200 text-purple-800 dark:bg-purple-300 dark:text-purple-900",
  "Cancelado": "bg-red-200 text-red-800 dark:bg-red-300 dark:text-red-900"
};
