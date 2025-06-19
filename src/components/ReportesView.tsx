import React, { useState } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Ticket, TicketEstado, TICKET_ESTADOS } from '../types/types';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface ReportesViewProps {
  tickets: Ticket[];
}

type ReportType = TicketEstado;

const ReportesView: React.FC<ReportesViewProps> = ({ tickets }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState<ReportType>('Completado');
  const [showBeneficiaries, setShowBeneficiaries] = useState(false);
  const filteredTickets = tickets.filter(ticket => {
    if (!dateFrom || !dateTo) return false;
    
    const ticketDate = new Date(ticket.fechaCoordinacion);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59); // Include the entire end day
    
    const dateInRange = ticketDate >= fromDate && ticketDate <= toDate;
    return dateInRange && ticket.estado === reportType;
  });
  const getMetrics = () => {
    if (!filteredTickets.length) return null;

    const byDate = filteredTickets.reduce((acc, ticket) => {
      const date = ticket.fechaCoordinacion;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const closedByDate = filteredTickets.reduce((acc, ticket) => {
      if (ticket.estado === 'Completado') {
        const date = ticket.fechaCoordinacion;
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const busiestDayEntry = Object.entries(byDate)
      .sort(([, a], [, b]) => b - a)[0];
    
    const busiestDay = busiestDayEntry ? {
      date: busiestDayEntry[0],
      count: busiestDayEntry[1]
    } : null;    return {
      total: filteredTickets.length,
      byDate,
      closedByDate,
      busiestDay
    };
  };

  const handleExportPDF = () => {
    try {
      const metrics = getMetrics();
      if (!metrics) return;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFont('helvetica');
      doc.setFontSize(16);
      doc.text(`Reporte de Soportes: ${reportType}`, 15, 20);
      doc.setFontSize(12);
      doc.text(`Período: ${dateFrom} al ${dateTo}`, 15, 30);

      // Métricas generales
      const generalMetrics = [
        ['Total de soportes', metrics.total.toString()],
        ['Día más ocupado', `${metrics.busiestDay?.date} (${metrics.busiestDay?.count} soportes)`],
      ];

      autoTable(doc, {
        startY: 40,
        head: [['Métrica', 'Valor']],
        body: generalMetrics,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5
        },
        headStyles: {
          fillColor: [41, 128, 185]
        }
      });      // Lista de beneficiarios
      const beneficiariosData = filteredTickets.map(ticket => [
        ticket.beneficiario.nombre,
        ticket.beneficiario.comuna || (ticket.tipoCliente !== "Particular" ? ticket.tipoCliente : "No especificada"),
        ticket.tipoServicio,
        ticket.detallesCierre?.solucion || 'No registrada'
      ]);

      autoTable(doc, {          startY: (doc as any).lastAutoTable?.finalY + 10 || 150,
        head: [['Beneficiario', 'Comuna', 'Tipo de Soporte', 'Solución']],
        body: beneficiariosData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 128, 185]
        }
      });

      doc.save(`reporte-${reportType}-${dateFrom}-${dateTo}.pdf`);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Ocurrió un error al generar el PDF.');
    }
  };

  const metrics = getMetrics();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
        Reportes y Estadísticas
      </h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fecha Desde
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo de Reporte
          </label>          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            {TICKET_ESTADOS.map(estado => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="p-6 rounded-lg shadow-lg bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-600 dark:to-blue-800">
            <h3 className="text-xl font-bold text-white mb-2">Total de Soportes</h3>
            <p className="text-4xl font-bold text-white">{metrics.total}</p>
          </div>          {metrics.busiestDay && (
            <div className="p-6 rounded-lg shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-700 dark:to-blue-900">
              <h3 className="text-xl font-bold text-white mb-2">Día Más Ocupado</h3>
              <p className="text-2xl font-bold text-white">{metrics.busiestDay.date}</p>
              <p className="text-lg text-white">{metrics.busiestDay.count} soportes</p>
            </div>
          )}
          <div className="p-6 rounded-lg shadow-lg bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950">
            <h3 className="text-xl font-bold text-white mb-2">Promedio Diario</h3>
            <p className="text-4xl font-bold text-white">
              {(metrics.total / Object.keys(metrics.byDate).length).toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={handleExportPDF}
          disabled={!metrics}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} className="mr-2" />
          Exportar PDF
        </button>
        <button
          onClick={() => setShowBeneficiaries(!showBeneficiaries)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showBeneficiaries ? (
            <ChevronUp size={20} className="mr-2" />
          ) : (
            <ChevronDown size={20} className="mr-2" />
          )}
          {showBeneficiaries ? 'Ocultar Beneficiarios' : 'Mostrar Beneficiarios'}
        </button>
      </div>

      {/* Lista de Beneficiarios */}
      {showBeneficiaries && (
        <div className="space-y-4 transition-all duration-300">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {ticket.beneficiario.nombre}
              </h4>              <p className="text-gray-600 dark:text-gray-400">
                <strong>Comuna:</strong> {ticket.beneficiario.comuna || (ticket.tipoCliente !== "Particular" ? ticket.tipoCliente : "No especificada")}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Tipo de Soporte:</strong> {ticket.tipoServicio}
              </p>              {ticket.detallesCierre?.solucion && (
                <p className="text-gray-600 dark:text-gray-400 mt-2 border-t pt-2 dark:border-gray-700">
                  <strong>Solución:</strong> {ticket.detallesCierre.solucion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportesView;
