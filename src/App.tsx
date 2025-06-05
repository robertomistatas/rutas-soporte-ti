import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { ChevronDown, ChevronRight, ChevronLeft, Plus, Calendar, List, LayoutDashboard, MapPin, Edit2, Trash2, Search, X, Sun, Moon, Menu, User as UserIcon, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import LoginPage from './LoginPage';
import CloseTicketModal, { ClosureDetails } from './components/CloseTicketModal';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLPMbp7up5coX90wS1_GWQKw_j23d5_UE",
  authDomain: "rutas-soporte-ti.firebaseapp.com",
  projectId: "rutas-soporte-ti",
  storageBucket: "rutas-soporte-ti.firebasestorage.app",
  messagingSenderId: "571387968108",
  appId: "1:571387968108:web:1cd279ff67f36e767cb649"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App ID
const appId = 'default-amaia-app';

// Types
interface Beneficiario {
  nombre: string;
  rut: string;
  telefono: string;
  direccion: string;
}

interface Ticket {
  id: string;
  tipoCliente: TipoCliente;
  beneficiario: Beneficiario;
  tipoServicio: string;
  fechaCoordinacion: string;
  horaCoordinacion: string;
  tecnicoAsignado: string;
  estado: string;
  descripcion: string;
  observaciones: string;
  contactoCoordinacion: string;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  historial?: Array<{ fecha: Timestamp; cambio: string; usuario?: string }>;
  detallesCierre?: ClosureDetails;
}

type TicketEstado = "Pendiente" | "Coordinado" | "En Proceso" | "Completado" | "Reagendado" | "Cancelado";

type TipoCliente = "Particular" | "Ñuñoa" | "Peñalolen" | "El Bosque";
const TIPOS_CLIENTE: TipoCliente[] = ["Particular", "Ñuñoa", "Peñalolen", "El Bosque"];

interface DashboardViewProps {
  tickets: Ticket[];
  setView: (view: string) => void;
  onNewTicket: () => void;
  isLoading: boolean;
}

const TICKET_ESTADOS: TicketEstado[] = ["Pendiente", "Coordinado", "En Proceso", "Completado", "Reagendado", "Cancelado"];

// Update ESTADO_COLORES to use default Tailwind colors for both light and dark mode
const ESTADO_COLORES: Record<TicketEstado, string> = {
  "Pendiente": "bg-yellow-200 text-yellow-800 dark:bg-yellow-300 dark:text-yellow-900",
  "Coordinado": "bg-blue-200 text-blue-800 dark:bg-blue-300 dark:text-blue-900",
  "En Proceso": "bg-indigo-200 text-indigo-800 dark:bg-indigo-300 dark:text-indigo-900",
  "Completado": "bg-green-200 text-green-800 dark:bg-green-300 dark:text-green-900",
  "Reagendado": "bg-purple-200 text-purple-800 dark:bg-purple-300 dark:text-purple-900",
  "Cancelado": "bg-red-200 text-red-800 dark:bg-red-300 dark:text-red-900",
};

// Firestore collection path
const getTicketsCollectionPath = (currentAppId: string) => `/artifacts/${currentAppId}/public/data/tickets`;

// Helper Functions
const formatDate = (date: Date | Timestamp | string, includeTime = false): string => {
  if (!date) return 'N/A';
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return d.toLocaleDateString('es-CL', options);
};

const formatISOForInput = (date: Date | Timestamp | string | null): string => {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};


// Components
const Icon = ({ name, size = 16, className = "" }: { name: React.ElementType, size?: number, className?: string }) => {
  const IconComponent = name;
  return <IconComponent size={size} className={className} />;
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <Icon name={X} size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
};


const Sidebar: React.FC<{
  currentView: string;
  setView: (view: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  userId: string | null;
  user: any;
  onLogout: () => void;
}> = ({ currentView, setView, isSidebarOpen, toggleSidebar, userId, user, onLogout }) => {
  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
    { name: "Soportes", icon: List, view: "tickets" },
    { name: "Calendario", icon: Calendar, view: "calendar" },
  ];
  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={toggleSidebar}></div>
      )}
      <aside className={`fixed top-0 left-0 z-40 h-screen bg-blue-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100 transition-transform transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:inset-y-0 lg:flex lg:w-64 lg:flex-col`}>
        <div className="flex items-center justify-between p-4 h-16 border-b border-blue-200 dark:border-gray-800">
          <img src="https://www.mistatas.cl/assets/img/logo-small.png" alt="AMAIA Logo" className="h-10 max-h-12 w-auto object-contain" style={{maxWidth:'120px'}} />
          <button onClick={toggleSidebar} className="lg:hidden text-gray-800 dark:text-gray-100 p-2 rounded-md hover:bg-blue-200 dark:hover:bg-gray-800">
            <Icon name={X} size={24} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => { setView(item.view); if (isSidebarOpen && window.innerWidth < 1024) toggleSidebar(); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-gray-800 ${currentView === item.view ? "bg-blue-300 dark:bg-gray-700" : ""}`}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-200 dark:border-gray-800 flex flex-col gap-2">            {user && (
                <div className="flex items-center space-x-2 p-2 bg-blue-200 dark:bg-gray-800 rounded-md">
                    <Icon name={UserIcon} size={18} className="text-blue-700 dark:text-gray-100" />
                    <span className="text-xs truncate" title={user.email}>{user.email}</span>
                </div>
            )}
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900 dark:hover:bg-red-700 mt-2">
            <Icon name={RefreshCw} size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};

const Header: React.FC<{
  toggleSidebar: () => void;
  currentViewTitle: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
}> = ({ toggleSidebar, currentViewTitle, darkMode, toggleDarkMode }) => {
  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-md h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="lg:hidden text-gray-600 dark:text-gray-300 mr-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <Icon name={Menu} size={24} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{currentViewTitle}</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={toggleDarkMode} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <Icon name={darkMode ? Sun : Moon} size={20} />
        </button>
      </div>
    </header>
  );
};

const TicketForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: Omit<Ticket, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'historial'>, id?: string) => Promise<void>;
  ticketToEdit?: Ticket | null;
  userId: string | null;
}> = ({ isOpen, onClose, onSave, ticketToEdit, userId }) => {
  const [beneficiario, setBeneficiario] = useState<Beneficiario>({ nombre: '', rut: '', telefono: '', direccion: '' });
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("Particular");
  const [tipoServicio, setTipoServicio] = useState<string>(TICKET_TIPOS[0]);
  const [fechaCoordinacion, setFechaCoordinacion] = useState<string>(formatISOForInput(new Date()));
  const [horaCoordinacion, setHoraCoordinacion] = useState<string>('09:00');
  const [tecnicoAsignado, setTecnicoAsignado] = useState<string>('');
  const [estado, setEstado] = useState<TicketEstado>(TICKET_ESTADOS[0]);
  const [descripcion, setDescripcion] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [contactoCoordinacion, setContactoCoordinacion] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ticketToEdit) {
      setBeneficiario(ticketToEdit.beneficiario);
      setTipoCliente(ticketToEdit.tipoCliente);
      setTipoServicio(ticketToEdit.tipoServicio);
      setFechaCoordinacion(formatISOForInput(ticketToEdit.fechaCoordinacion));
      setHoraCoordinacion(ticketToEdit.horaCoordinacion);
      setTecnicoAsignado(ticketToEdit.tecnicoAsignado);
      setEstado(ticketToEdit.estado as TicketEstado);
      setDescripcion(ticketToEdit.descripcion);
      setObservaciones(ticketToEdit.observaciones);
      setContactoCoordinacion(ticketToEdit.contactoCoordinacion);
    } else {
      // Reset form for new ticket
      setBeneficiario({ nombre: '', rut: '', telefono: '', direccion: '' });
      setTipoCliente("Particular");
      setTipoServicio(TICKET_TIPOS[0]);
      setFechaCoordinacion(formatISOForInput(new Date()));
      setHoraCoordinacion('09:00');
      setTecnicoAsignado('');
      setEstado(TICKET_ESTADOS[0]);
      setDescripcion('');
      setObservaciones('');
      setContactoCoordinacion('');
    }
    setErrors({}); // Clear errors when form opens or ticket changes
  }, [ticketToEdit, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!beneficiario.nombre.trim()) newErrors.nombre = "Nombre del beneficiario es requerido.";
    if (!beneficiario.rut.trim()) newErrors.rut = "RUT del beneficiario es requerido.";
    // Basic RUT validation (Chilean format)
    // eslint-disable-next-line no-useless-escape
    else if (!/^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9Kk]$/.test(beneficiario.rut.trim())) newErrors.rut = "Formato de RUT inválido."; // eslint-disable-line no-useless-escape
    if (!beneficiario.telefono.trim()) newErrors.telefono = "Teléfono es requerido.";
    else if (!/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(beneficiario.telefono.trim())) newErrors.telefono = "Formato de teléfono inválido.";
    if (!beneficiario.direccion.trim()) newErrors.direccion = "Dirección es requerida.";
    if (!fechaCoordinacion) newErrors.fechaCoordinacion = "Fecha de coordinación es requerida.";
    if (!horaCoordinacion) newErrors.horaCoordinacion = "Hora de coordinación es requerida.";
    if (!descripcion.trim()) newErrors.descripcion = "Descripción del servicio es requerida.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const ticketData = {
      beneficiario,
      tipoCliente,
      tipoServicio,
      fechaCoordinacion,
      horaCoordinacion,
      tecnicoAsignado,
      estado,
      descripcion,
      observaciones,
      contactoCoordinacion,
    };
    
    try {
      await onSave(ticketData, ticketToEdit?.id);
      onClose(); // Close modal on successful save
    } catch (error) {
      console.error("Error saving ticket:", error);
      setErrors(prev => ({ ...prev, form: "Error al guardar el ticket. Intente nuevamente." }));
    }
  };
  
  const handleBeneficiarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBeneficiario({ ...beneficiario, [e.target.name]: e.target.value });
  };

  const inputClass = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const errorClass = "text-red-500 text-xs mt-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={ticketToEdit ? "Editar Soporte" : "Crear Nuevo Soporte"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <p className={errorClass}>{errors.form}</p>}
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b pb-2 mb-3">Información del Beneficiario</h3>
        
        <div>
          <label htmlFor="tipoCliente" className={labelClass}>Tipo de Cliente</label>
          <select
            id="tipoCliente"
            value={tipoCliente}
            onChange={(e) => setTipoCliente(e.target.value as TipoCliente)}
            className={inputClass}
          >
            {TIPOS_CLIENTE.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nombre" className={labelClass}>Nombre Completo</label>
          <input type="text" name="nombre" id="nombre" value={beneficiario.nombre} onChange={handleBeneficiarioChange} className={inputClass} />
          {errors.nombre && <p className={errorClass}>{errors.nombre}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rut" className={labelClass}>RUT/ID</label>
            <input type="text" name="rut" id="rut" value={beneficiario.rut} onChange={handleBeneficiarioChange} className={inputClass} placeholder="Ej: 12.345.678-K" />
            {errors.rut && <p className={errorClass}>{errors.rut}</p>}
          </div>
          <div>
            <label htmlFor="telefono" className={labelClass}>Teléfono de Contacto</label>
            <input type="tel" name="telefono" id="telefono" value={beneficiario.telefono} onChange={handleBeneficiarioChange} className={inputClass} placeholder="Ej: +56912345678" />
            {errors.telefono && <p className={errorClass}>{errors.telefono}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="direccion" className={labelClass}>Dirección Completa</label>
          <input type="text" name="direccion" id="direccion" value={beneficiario.direccion} onChange={handleBeneficiarioChange} className={inputClass} />
          {errors.direccion && <p className={errorClass}>{errors.direccion}</p>}
        </div>

        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b pb-2 mb-3 pt-4">Detalles del Servicio</h3>
        <div>
          <label htmlFor="tipoServicio" className={labelClass}>Tipo de Servicio</label>
          <select name="tipoServicio" id="tipoServicio" value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} className={inputClass}>
            {TICKET_TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fechaCoordinacion" className={labelClass}>Fecha Coordinación</label>
            <input type="date" name="fechaCoordinacion" id="fechaCoordinacion" value={fechaCoordinacion} onChange={(e) => setFechaCoordinacion(e.target.value)} className={inputClass} />
            {errors.fechaCoordinacion && <p className={errorClass}>{errors.fechaCoordinacion}</p>}
          </div>
          <div>
            <label htmlFor="horaCoordinacion" className={labelClass}>Hora Coordinación</label>
            <input type="time" name="horaCoordinacion" id="horaCoordinacion" value={horaCoordinacion} onChange={(e) => setHoraCoordinacion(e.target.value)} className={inputClass} />
            {errors.horaCoordinacion && <p className={errorClass}>{errors.horaCoordinacion}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="tecnicoAsignado" className={labelClass}>Técnico Asignado (Opcional)</label>
          <input type="text" name="tecnicoAsignado" id="tecnicoAsignado" value={tecnicoAsignado} onChange={(e) => setTecnicoAsignado(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="estado" className={labelClass}>Estado</label>
          <select name="estado" id="estado" value={estado} onChange={(e) => setEstado(e.target.value as TicketEstado)} className={inputClass}>
            {TICKET_ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="descripcion" className={labelClass}>Descripción del Servicio</label>
          <textarea name="descripcion" id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className={inputClass}></textarea>
          {errors.descripcion && <p className={errorClass}>{errors.descripcion}</p>}
        </div>
        <div>
          <label htmlFor="observaciones" className={labelClass}>Observaciones Especiales (Opcional)</label>
          <textarea name="observaciones" id="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={inputClass}></textarea>
        </div>
        <div>
          <label htmlFor="contactoCoordinacion" className={labelClass}>Contacto para Coordinación (Opcional)</label>
          <input type="text" name="contactoCoordinacion" id="contactoCoordinacion" value={contactoCoordinacion} onChange={(e) => setContactoCoordinacion(e.target.value)} className={inputClass} />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            {ticketToEdit ? "Actualizar Soporte" : "Guardar Soporte"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const TicketCard: React.FC<{ ticket: Ticket; onEdit: (ticket: Ticket) => void; onDelete: (id: string) => void; onUpdateStatus: (id: string, estado: TicketEstado) => void; }> = ({ ticket, onEdit, onDelete, onUpdateStatus }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [tempNewStatus, setTempNewStatus] = useState<TicketEstado | null>(null);

  const estadoColorClass = ESTADO_COLORES[ticket.estado as TicketEstado] || "bg-gray-500 text-gray-800";

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEstado = e.target.value as TicketEstado;
    if (newEstado === "Completado") {
      setTempNewStatus(newEstado);
      setShowCloseModal(true);
    } else {
      onUpdateStatus(ticket.id, newEstado);
    }
  };

  const handleConfirmClose = (details: ClosureDetails) => {
    if (tempNewStatus) {
      onUpdateStatus(ticket.id, tempNewStatus, details);
      setShowCloseModal(false);
      setTempNewStatus(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mb-4 hover:shadow-xl transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{ticket.beneficiario.nombre}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.tipoServicio}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${estadoColorClass}`}>
            {ticket.estado}
          </span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {ticket.tipoCliente}
          </span>
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        <p><Icon name={MapPin} className="inline mr-1" size={14}/> {ticket.beneficiario.direccion}</p>
        <p><Icon name={Calendar} className="inline mr-1" size={14}/> {formatDate(ticket.fechaCoordinacion)} <Icon name={Clock} className="inline mr-1 ml-2" size={14}/> {ticket.horaCoordinacion}</p>
        {ticket.tecnicoAsignado && <p><Icon name={UserIcon} className="inline mr-1" size={14}/> Técnico: {ticket.tecnicoAsignado}</p>}
      </div>
      
      {showDetails && (
        <div className="mt-3 pt-3 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p><strong>RUT:</strong> {ticket.beneficiario.rut}</p>
          <p><strong>Teléfono:</strong> {ticket.beneficiario.telefono}</p>
          <p><strong>Descripción:</strong> {ticket.descripcion}</p>
          {ticket.observaciones && <p><strong>Observaciones:</strong> {ticket.observaciones}</p>}
          {ticket.contactoCoordinacion && <p><strong>Contacto Coord.:</strong> {ticket.contactoCoordinacion}</p>}
          <p><strong>Creado:</strong> {formatDate(ticket.fechaCreacion, true)}</p>
          <p><strong>Actualizado:</strong> {formatDate(ticket.fechaActualizacion, true)}</p>
          {ticket.historial && ticket.historial.length > 0 && (
            <div>
              <strong>Historial:</strong>
              <ul className="list-disc list-inside pl-4 text-xs">
                {ticket.historial.slice(0,3).map((h, i) => <li key={i}>{formatDate(h.fecha, true)}: {h.cambio}</li>)}
                {ticket.historial.length > 3 && <li>... y {ticket.historial.length - 3} más</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs px-3 py-1.5 rounded-md text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-gray-700 flex items-center"
        >
          {showDetails ? "Menos Detalles" : "Más Detalles"} 
          <Icon name={showDetails ? ChevronDown : ChevronRight} size={14} className="ml-1" />
        </button>
        <div className="flex space-x-2">
          <button onClick={() => onEdit(ticket)} className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700">
            <Icon name={Edit2} size={16} />
          </button>
          <button onClick={() => onDelete(ticket.id)} className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-100 dark:text-gray-400 dark:hover:text-red-500 dark:hover:bg-gray-700">
            <Icon name={Trash2} size={16} />
          </button>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor={`estado-${ticket.id}`} className="sr-only">Cambiar Estado</label>
        <select
            id={`estado-${ticket.id}`}
            value={ticket.estado}
            onChange={handleStatusChange}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-blue-500 focus:border-blue-500"
        >
            {TICKET_ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
        </select>
      </div>
      <CloseTicketModal
        isOpen={showCloseModal}
        onClose={() => {
          setShowCloseModal(false);
          setTempNewStatus(null);
        }}
        onConfirm={handleConfirmClose}
      />
    </div>
  );
};

const TicketsListView: React.FC<{
  tickets: Ticket[];
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, estado: TicketEstado) => void;
  isLoading: boolean;
}> = ({ tickets, onEdit, onDelete, onUpdateStatus, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterFecha, setFilterFecha] = useState<string>('');

  const filteredTickets = useMemo(() => {
    return tickets
      .filter(ticket => {
        const searchLower = searchTerm.toLowerCase();
        return (
          ticket.beneficiario.nombre.toLowerCase().includes(searchLower) ||
          ticket.beneficiario.rut.toLowerCase().includes(searchLower) ||
          ticket.tipoServicio.toLowerCase().includes(searchLower) ||
          (ticket.tecnicoAsignado && ticket.tecnicoAsignado.toLowerCase().includes(searchLower))
        );
      })
      .filter(ticket => filterEstado ? ticket.estado === filterEstado : true)
      .filter(ticket => filterTipo ? ticket.tipoServicio === filterTipo : true)
      .filter(ticket => filterFecha ? ticket.fechaCoordinacion === filterFecha : true)
      .sort((a, b) => new Date(a.fechaCoordinacion).getTime() - new Date(b.fechaCoordinacion).getTime()); // Sort by coordination date
  }, [tickets, searchTerm, filterEstado, filterTipo, filterFecha]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Icon name={RefreshCw} size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
        <p className="ml-2 text-gray-600 dark:text-gray-300">Cargando tickets...</p>
      </div>
    );
  }
    return (
    <div className="p-4 md:p-6">
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name={Search} size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Nombre, RUT, tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="filterEstado" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
            <select
              id="filterEstado"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Todos los Estados</option>
              {TICKET_ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filterTipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo Servicio</label>
            <select
              id="filterTipo"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Todos los Tipos</option>
              {TICKET_TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </div>
           <div>
            <label htmlFor="filterFecha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Coordinación</label>
            <input
              type="date"
              id="filterFecha"
              value={filterFecha}
              onChange={(e) => setFilterFecha(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {filteredTickets.length === 0 && !isLoading ? (
        <div className="text-center py-10">
          <Icon name={List} size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No se encontraron tickets</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Intenta ajustar los filtros o crea un nuevo ticket.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onEdit={onEdit} onDelete={onDelete} onUpdateStatus={onUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
};

const DashboardView: React.FC<{ tickets: Ticket[]; setView: (view: string) => void; onNewTicket: () => void; isLoading: boolean }> = ({ tickets, setView, onNewTicket, isLoading }) => {
  const summary = useMemo(() => {
    const counts: Record<TicketEstado, number> = {
      "Pendiente": 0, "Coordinado": 0, "En Proceso": 0, "Completado": 0, "Reagendado": 0, "Cancelado": 0
    };
    tickets.forEach(ticket => {
      counts[ticket.estado as TicketEstado]++;
    });
    return counts;
  }, [tickets]);

  const proximasCitas = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return tickets
      .filter(t => {
        const fechaCoordinacion = new Date(t.fechaCoordinacion + 'T00:00:00');
        return fechaCoordinacion >= today && (t.estado === "Pendiente" || t.estado === "Coordinado" || t.estado === "En Proceso");
      })
      .sort((a, b) => new Date(a.fechaCoordinacion + 'T' + a.horaCoordinacion).getTime() - new Date(b.fechaCoordinacion + 'T' + b.horaCoordinacion).getTime())
      .slice(0, 5);
  }, [tickets]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 p-4 md:p-6">
        <Icon name={RefreshCw} size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
        <p className="ml-2 text-gray-600 dark:text-gray-300">Cargando dashboard...</p>
      </div>
    );
  }

  const StatCard: React.FC<{ title: string; value: number | string; icon: React.ElementType; color: string; onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
    <div className={`p-4 rounded-lg shadow-md flex items-center space-x-3 cursor-pointer hover:shadow-lg transition-shadow ${color}`} onClick={onClick}>
      <div className="p-2 bg-white bg-opacity-30 rounded-full">
        <Icon name={icon} size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-white font-medium">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {TICKET_ESTADOS.map(estado => (
          <StatCard 
            key={estado}
            title={estado} 
            value={summary[estado]} 
            icon={estado === "Completado" ? CheckCircle : (estado === "Pendiente" ? AlertCircle : List)}
            color={`${ESTADO_COLORES[estado].split(' ')[0]} text-white`}
            onClick={() => setView('tickets')}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Próximas Citas ({proximasCitas.length})</h3>
            {proximasCitas.length > 0 ? (
              <ul className="space-y-3">
                {proximasCitas.map(ticket => (
                  <li key={ticket.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-blue-600 dark:text-blue-400">{ticket.beneficiario.nombre}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.tipoServicio}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatDate(ticket.fechaCoordinacion)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.horaCoordinacion}</p>
                      </div>
                    </div>
                    <span className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${ESTADO_COLORES[ticket.estado as TicketEstado]}`}>
                      {ticket.estado}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Icon name={Calendar} size={32} className="mx-auto text-gray-400 dark:text-gray-500" />
                <p className="mt-2 text-gray-600 dark:text-gray-400">No hay citas programadas próximamente</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button 
                onClick={onNewTicket}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Icon name={Plus} size={20} className="mr-2"/> Nuevo Soporte
              </button>
              <button 
                onClick={() => setView('calendar')}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Icon name={Calendar} size={20} className="mr-2"/> Ver Calendario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarView: React.FC<{ tickets: Ticket[]; onTicketClick: (ticket: Ticket) => void; isLoading: boolean }> = ({ tickets, onTicketClick, isLoading }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Sunday, 1 = Monday...

  const goToPreviousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const calendarDays = useMemo(() => {
    const numDays = daysInMonth(currentMonth);
    const firstDayIndex = (firstDayOfMonth(currentMonth) + 6) % 7; // Adjust so Monday is 0
    const daysArray = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push({ key: `empty-${i}`, date: null, tickets: [] });
    }

    // Add actual days of the month
    for (let day = 1; day <= numDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateString = formatISOForInput(date);
      const dayTickets = tickets.filter(t => t.fechaCoordinacion === dateString)
                                .sort((a,b) => parseInt(a.horaCoordinacion.replace(':','')) - parseInt(b.horaCoordinacion.replace(':','')));
      daysArray.push({ key: `day-${day}`, date, tickets: dayTickets });
    }
    return daysArray;
  }, [currentMonth, tickets]);

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 p-4 md:p-6">
        <Icon name={RefreshCw} size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
        <p className="ml-2 text-gray-600 dark:text-gray-300">Cargando calendario...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <button onClick={goToPreviousMonth} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <Icon name={ChevronLeft} size={24} className="text-gray-700 dark:text-gray-200" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {currentMonth.toLocaleString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
        </h2>
        <button onClick={goToNextMonth} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <Icon name={ChevronRight} size={24} className="text-gray-700 dark:text-gray-200" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center font-medium text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800">
            {day}
          </div>
        ))}
        {calendarDays.map((dayInfo, index) => (
          <div 
            key={dayInfo.key || index} 
            className="min-h-[100px] md:min-h-[120px] bg-white dark:bg-gray-800 p-1.5 relative overflow-y-auto"
          >
            {dayInfo.date && (
              <>
                <span className={`text-sm font-medium ${new Date().toDateString() === dayInfo.date.toDateString() ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                  {dayInfo.date.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayInfo.tickets.map(ticket => (
                    <div 
                      key={ticket.id}
                      onClick={() => onTicketClick(ticket)}
                      title={`${ticket.horaCoordinacion} - ${ticket.beneficiario.nombre} (${ticket.tipoServicio})`}
                      className={`p-1 rounded text-xs cursor-pointer ${ESTADO_COLORES[ticket.estado as TicketEstado].replace('text-', 'text-xxs-')} truncate`} // Custom class for smaller text
                    >
                      <span className="font-semibold">{ticket.horaCoordinacion.substring(0,5)}</span> {ticket.beneficiario.nombre.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Component removed

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState<boolean>(false);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('amaia-theme') === 'dark';
    }
    return false;
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ticketIdToDelete, setTicketIdToDelete] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('amaia-theme', darkMode ? 'dark' : 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
      setUser(user);
      setAuthReady(true); 
      console.log("Auth state changed. User ID:", user?.uid);
    });
    return () => unsubscribeAuth();
  }, []);


  useEffect(() => {
    if (!authReady || !userId) {
      console.log("Auth not ready or no user ID, skipping Firestore listener setup.");
      setIsLoading(false); // Stop loading if auth fails or no user
      return;
    }
    
    console.log(`Setting up Firestore listener for app ID: ${appId}, user ID: ${userId}`);
    setIsLoading(true);
    const ticketsCollectionPath = getTicketsCollectionPath(appId);
    const q = query(collection(db, ticketsCollectionPath));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        ticketsData.push({ id: doc.id, ...doc.data() } as Ticket);
      });
      setTickets(ticketsData);
      setIsLoading(false);
      console.log("Tickets loaded/updated from Firestore:", ticketsData.length);
    }, (error) => {
      console.error("Error fetching tickets from Firestore: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [authReady, userId]);


  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNewTicket = () => {
    setTicketToEdit(null);
    setIsTicketFormOpen(true);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setTicketToEdit(ticket);
    setIsTicketFormOpen(true);
  };

  const handleDeleteTicket = (id: string) => {
    setTicketIdToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTicket = async () => {
    if (!ticketIdToDelete || !userId) return;
    setIsLoading(true);
    try {
      const ticketDocRef = doc(db, getTicketsCollectionPath(appId), ticketIdToDelete);
      await deleteDoc(ticketDocRef);
      console.log("Ticket deleted:", ticketIdToDelete);
    } catch (error) {
      console.error("Error deleting ticket: ", error);
    } finally {
      setIsLoading(false);
      setTicketIdToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveTicket = async (ticketData: Omit<Ticket, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'historial'>, id?: string) => {
    if (!userId) {
        console.error("No user ID, cannot save ticket.");
        alert("Error: No se pudo identificar al usuario. Intente recargar la página."); // Replace with modal later
        return;
    }
    setIsLoading(true);
    const now = Timestamp.now();
    const ticketsCollectionPath = getTicketsCollectionPath(appId);

    try {
        if (id) { // Editing existing ticket
            const ticketDocRef = doc(db, ticketsCollectionPath, id);
            const existingTicket = tickets.find(t => t.id === id);
            const newHistorialEntry = {
                fecha: now,
                cambio: `Ticket actualizado. Estado: ${ticketData.estado}. Técnico: ${ticketData.tecnicoAsignado || 'N/A'}.`,
                usuario: userId.substring(0,8) // Store part of user ID for audit
            };
            const updatedHistorial = existingTicket?.historial ? [...existingTicket.historial, newHistorialEntry] : [newHistorialEntry];

            await updateDoc(ticketDocRef, {
                ...ticketData,
                fechaActualizacion: now,
                historial: updatedHistorial,
            });
            console.log("Ticket updated:", id);
        } else { // Creating new ticket
            const newHistorialEntry = {
                fecha: now,
                cambio: `Ticket creado. Estado: ${ticketData.estado}.`,
                usuario: userId.substring(0,8)
            };
            await addDoc(collection(db, ticketsCollectionPath), {
                ...ticketData,
                fechaCreacion: now,
                fechaActualizacion: now,
                historial: [newHistorialEntry],
            });
            console.log("New ticket added");
        }
    } catch (error) {
        console.error("Error saving ticket: ", error);
        // Consider showing an error message to the user
        throw error; // Re-throw to be caught in TicketForm
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (id: string, newEstado: TicketEstado, detallesCierre?: ClosureDetails) => {
    if (!userId) return;
    const ticketToUpdate = tickets.find(t => t.id === id);
    if (!ticketToUpdate) return;

    setIsLoading(true);
    const now = Timestamp.now();
    const ticketDocRef = doc(db, getTicketsCollectionPath(appId), id);
    const newHistorialEntry = {
        fecha: now,
        cambio: detallesCierre 
          ? `Estado cambiado de ${ticketToUpdate.estado} a ${newEstado}. Motivo: ${detallesCierre.motivo}. Solución: ${detallesCierre.solucion}`
          : `Estado cambiado de ${ticketToUpdate.estado} a ${newEstado}.`,
        usuario: userId.substring(0,8)
    };
    const updatedHistorial = ticketToUpdate.historial ? [...ticketToUpdate.historial, newHistorialEntry] : [newHistorialEntry];

    try {
        await updateDoc(ticketDocRef, { 
            estado: newEstado,
            fechaActualizacion: now,
            historial: updatedHistorial,
            ...(detallesCierre && { detallesCierre }),
        });
        console.log("Ticket status updated:", id, "to", newEstado);
    } catch (error) {
        console.error("Error updating ticket status: ", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const viewTitles: Record<string, string> = {
    dashboard: "Dashboard Principal",
    tickets: "Lista de Soportes",
    calendar: "Calendario de Soportes",
    technicians: "Gestión de Técnicos",
    routes: "Planificación de Rutas",
  };

  const renderView = () => {
    if (!authReady) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Icon name={RefreshCw} size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
          <p className="ml-2 text-gray-600 dark:text-gray-300">Autenticando...</p>
        </div>
      );
    }
    if (!user) {
      return <LoginPage onLogin={setUser} />;
    }
    switch (currentView) {
      case "dashboard":
        return <DashboardView tickets={tickets} setView={setCurrentView} onNewTicket={handleNewTicket} isLoading={isLoading} />;
      case "tickets":
        return <TicketsListView tickets={tickets} onEdit={handleEditTicket} onDelete={handleDeleteTicket} onUpdateStatus={handleUpdateTicketStatus} isLoading={isLoading} />;
      case "calendar":
        return <CalendarView tickets={tickets} onTicketClick={handleEditTicket} isLoading={isLoading} />;
      default:
        return <DashboardView tickets={tickets} setView={setCurrentView} onNewTicket={handleNewTicket} isLoading={isLoading} />;
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div className={`flex h-screen bg-blue-50 dark:bg-gray-900 ${darkMode ? 'dark' : ''}`}>      <Sidebar currentView={currentView} setView={setCurrentView} isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} userId={userId} user={user} onLogout={handleLogout} />      <div className="flex-1 flex flex-col min-w-0">
        <Header toggleSidebar={toggleSidebar} currentViewTitle={viewTitles[currentView] || ''} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
      <TicketForm
        isOpen={isTicketFormOpen}
        onClose={() => setIsTicketFormOpen(false)}
        onSave={handleSaveTicket}
        ticketToEdit={ticketToEdit}
        userId={userId}
      />
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteTicket}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que deseas eliminar este soporte? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default App;

