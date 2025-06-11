import React, { useState } from 'react';
import { Printer, Download, MapPin } from 'lucide-react';
import { Ticket, Tecnico, TECNICOS } from '../types/types';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface PrintRoutesViewProps {
  tickets: Ticket[];
}

const PrintRoutesView: React.FC<PrintRoutesViewProps> = ({ tickets }) => {
  const [selectedTechnician, setSelectedTechnician] = useState<Tecnico>(TECNICOS[0]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const filteredTickets = tickets.filter(ticket => 
    ticket.tecnicoAsignado === selectedTechnician && 
    ticket.fechaCoordinacion === selectedDate
  ).sort((a, b) => a.horaCoordinacion.localeCompare(b.horaCoordinacion));

  const handlePrint = () => {
    window.print();
  };

  const getGoogleMapsUrl = (direccion: string) => {
    // Aseguramos que la dirección incluya Chile para mejor precisión
    const direccionCompleta = `${direccion}, Chile`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionCompleta)}`;
  };  const handleExportPDF = () => {
    try {
      console.log('Iniciando generación de PDF...');
      // Crear nueva instancia de jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configurar fuentes
      doc.setFont('helvetica');
        // Configurar el título
      doc.setFontSize(16);
      doc.text(`Ruta del día: ${selectedDate}`, 15, 20);
      doc.setFontSize(12);
      doc.text(`Técnico: ${selectedTechnician}`, 15, 30);

      // Preparar los datos para la tabla
      const tableData = filteredTickets.map((ticket, index) => [
        (index + 1).toString(),
        ticket.beneficiario.nombre,
        ticket.horaCoordinacion,
        ticket.beneficiario.telefono,
        ticket.beneficiario.direccion,
        ticket.tipoServicio
      ]);      console.log('Datos de la tabla:', tableData);
      console.log('Intentando crear tabla...');      autoTable(doc, {
        startY: 40,
        head: [['#', 'Beneficiario', 'Hora', 'Teléfono', 'Dirección', 'Tipo de Soporte']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: 'helvetica',
          lineColor: [80, 80, 80],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 35 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 60 },
          5: { cellWidth: 35 }
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          halign: 'left'
        }
      });

      // Guardar el PDF
      doc.save(`rutas-${selectedTechnician}-${selectedDate}.pdf`);    } catch (error) {
      console.error('Error al generar el PDF:', error);
      if (error instanceof Error) {
        console.error('Detalles del error:', error.message);
        console.error('Stack trace:', error.stack);
      }
      alert('Ocurrió un error al generar el PDF. Por favor, revise la consola del navegador para más detalles.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
        ¡Organízate con tus rutas!
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Selecciona el Técnico
          </label>
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value as Tecnico)}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            {TECNICOS.map(tecnico => (
              <option key={tecnico} value={tecnico}>{tecnico}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Selecciona la Fecha
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={handlePrint}
          disabled={!selectedDate || filteredTickets.length === 0}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={20} className="mr-2" />
          Imprimir
        </button>
        <button
          onClick={handleExportPDF}
          disabled={!selectedDate || filteredTickets.length === 0}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} className="mr-2" />
          Exportar PDF
        </button>
      </div>

      <div id="printable-content" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 print:shadow-none print:p-0">
        {selectedDate && (
          <>
            <div className="print:mb-6">              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Ruta del día: {selectedDate}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Técnico: {selectedTechnician}
              </p>
            </div>

            {filteredTickets.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 my-8">
                No hay soportes programados para esta fecha
              </p>
            ) : (
              <div className="space-y-4 print:space-y-6">
                {filteredTickets.map((ticket, index) => (
                  <div 
                    key={ticket.id}
                    className="border-b dark:border-gray-700 pb-4 print:pb-6 print:page-break-inside-avoid"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          {index + 1}. {ticket.beneficiario.nombre}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          <strong>Hora:</strong> {ticket.horaCoordinacion}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          <strong>Teléfono:</strong> {ticket.beneficiario.telefono}
                        </p>
                        <div className="flex items-center">
                          <p className="text-gray-600 dark:text-gray-400 flex-1">
                            <strong>Dirección:</strong> {ticket.beneficiario.direccion}
                          </p>
                          <a
                            href={getGoogleMapsUrl(ticket.beneficiario.direccion)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 p-2 text-blue-600 hover:text-blue-800 print:hidden"
                            title="Ver en Google Maps"
                          >
                            <MapPin size={20} />
                          </a>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                          <strong>Tipo de Soporte:</strong> {ticket.tipoServicio}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PrintRoutesView;
