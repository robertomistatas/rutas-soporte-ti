import React, { useState, useCallback } from 'react';
import { Upload, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AmaiaTicket {
  id: string;
  referencia: string;
  beneficiario: string;
  prioridad: string;
  apertura: string;
  comuna: string;
  grupo: string;
}

const AmaiaTicketsView: React.FC = () => {
  const [tickets, setTickets] = useState<AmaiaTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<AmaiaTicket[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    prioridad: '',
    comuna: '',
    grupo: ''
  });

  // Función para procesar el archivo Excel
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: ['id', 'referencia', 'beneficiario', 'tipo', 'prioridad', 'estado', 'apertura', 'cierre', 'comuna', 'grupo'] });
        
        // Procesar y limpiar los datos
        const processedData = jsonData.slice(1).map((row: any) => ({
          id: row.id?.toString() || '',
          referencia: row.referencia || '',
          beneficiario: row.beneficiario || '',
          prioridad: row.prioridad || '',
          apertura: row.apertura || '',
          comuna: row.comuna || '',
          grupo: row.grupo || ''
        }));

        setTickets(processedData);
        setFilteredTickets(processedData);
      };
      reader.readAsBinaryString(file);
    }
  }, []);

  // Función para aplicar filtros
  const applyFilters = useCallback(() => {
    let result = [...tickets]; // Crear una copia para no mutar el original

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      result = result.filter(ticket => 
        ticket.id.toLowerCase().includes(searchLower) ||
        ticket.referencia.toLowerCase().includes(searchLower) ||
        ticket.beneficiario.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtros exactos para los selectores
    if (filters.prioridad) {
      result = result.filter(ticket => ticket.prioridad === filters.prioridad);
    }

    if (filters.comuna) {
      result = result.filter(ticket => ticket.comuna === filters.comuna);
    }

    if (filters.grupo) {
      result = result.filter(ticket => ticket.grupo === filters.grupo);
    }

    setFilteredTickets(result);
  }, [tickets, filters]);

  // Función para reiniciar filtros
  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      prioridad: '',
      comuna: '',
      grupo: ''
    });
    setFilteredTickets(tickets);
  }, [tickets]);

  // Obtener valores únicos para los filtros
  const getUniqueValues = (field: keyof AmaiaTicket) => 
    Array.from(new Set(tickets.map(ticket => ticket[field]))).filter(Boolean);

  // Métricas
  const metrics = {
    total: filteredTickets.length,
    porPrioridad: getUniqueValues('prioridad').reduce((acc, prioridad) => ({
      ...acc,
      [prioridad]: filteredTickets.filter(t => t.prioridad === prioridad).length
    }), {} as Record<string, number>),
    porComuna: getUniqueValues('comuna').reduce((acc, comuna) => ({
      ...acc,
      [comuna]: filteredTickets.filter(t => t.comuna === comuna).length
    }), {} as Record<string, number>),
    porGrupo: getUniqueValues('grupo').reduce((acc, grupo) => ({
      ...acc,
      [grupo]: filteredTickets.filter(t => t.grupo === grupo).length
    }), {} as Record<string, number>)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
        Tickets Amaia
      </h2>

      {/* Sección de carga de archivo */}
      <div className="mb-8">
        <label className="flex flex-col items-center px-4 py-6 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          <Upload size={48} className="mb-2" />
          <span className="text-sm font-medium">Selecciona o arrastra el archivo Excel</span>
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {tickets.length > 0 && (
        <>
          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por ID, referencia o beneficiario..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {['prioridad', 'comuna', 'grupo'].map((field) => (
                <div key={field}>
                  <select
                    value={filters[field as keyof typeof filters]}
                    onChange={(e) => setFilters(prev => ({ ...prev, [field]: e.target.value }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Filtrar por {field}</option>
                    {getUniqueValues(field as keyof AmaiaTicket).map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            {/* Botón de Aplicar Filtros */}
            <div className="flex justify-end">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Filter size={16} />
                <span>Aplicar Filtros</span>
              </button>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-600 dark:to-blue-800">
              <h3 className="text-xl font-bold text-white mb-2">Total de Tickets</h3>
              <p className="text-4xl font-bold text-white">{metrics.total}</p>
            </div>
            
            {Object.entries(metrics.porPrioridad).map(([prioridad, cantidad]) => (
              <div key={prioridad} 
                className={`p-6 rounded-lg shadow-lg bg-gradient-to-br ${
                  prioridad.toLowerCase().includes('alta') ? 'from-red-400 to-red-600 dark:from-red-600 dark:to-red-800' :
                  prioridad.toLowerCase().includes('media') ? 'from-yellow-400 to-yellow-600 dark:from-yellow-600 dark:to-yellow-800' :
                  'from-green-400 to-green-600 dark:from-green-600 dark:to-green-800'
                }`}
              >
                <h3 className="text-xl font-bold text-white mb-2">Prioridad {prioridad}</h3>
                <p className="text-4xl font-bold text-white">{cantidad}</p>
              </div>
            ))}
          </div>

          {/* Tabla de tickets */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Referencia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Beneficiario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prioridad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Apertura</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comuna</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grupo</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{ticket.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{ticket.referencia}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{ticket.beneficiario}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.prioridad.toLowerCase().includes('alta') ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          ticket.prioridad.toLowerCase().includes('media') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {ticket.prioridad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{ticket.apertura}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{ticket.comuna}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{ticket.grupo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AmaiaTicketsView;
