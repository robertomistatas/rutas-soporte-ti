import React, { useState } from 'react';
import Modal from './Modal';

export interface ClosureDetails {
  motivo: string;
  solucion: string;
  observacionesCierre: string;
}

interface CloseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: ClosureDetails) => void;
}

const CloseTicketModal: React.FC<CloseTicketModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [details, setDetails] = useState<ClosureDetails>({
    motivo: '',
    solucion: '',
    observacionesCierre: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(details);
  };

  const inputClass = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles de Cierre">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="motivo" className={labelClass}>Motivo de Cierre</label>
          <input
            id="motivo"
            type="text"
            className={inputClass}
            value={details.motivo}
            onChange={(e) => setDetails(prev => ({ ...prev, motivo: e.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="solucion" className={labelClass}>Solución Aplicada</label>
          <textarea
            id="solucion"
            className={inputClass}
            value={details.solucion}
            onChange={(e) => setDetails(prev => ({ ...prev, solucion: e.target.value }))}
            rows={3}
            required
          />
        </div>
        <div>
          <label htmlFor="observacionesCierre" className={labelClass}>Observaciones Adicionales</label>
          <textarea
            id="observacionesCierre"
            className={inputClass}
            value={details.observacionesCierre}
            onChange={(e) => setDetails(prev => ({ ...prev, observacionesCierre: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Confirmar Cierre
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CloseTicketModal;
