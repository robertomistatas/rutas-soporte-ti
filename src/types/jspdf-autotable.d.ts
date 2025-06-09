declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';
    
    function autoTable(doc: jsPDF, options: {
            startY?: number;
            head?: any[][];
            body?: any[][];
            theme?: string;
            styles?: {
                fontSize?: number;
                cellPadding?: number;
                font?: string;
                lineColor?: number[];
                lineWidth?: number;
            };
            columnStyles?: {
                [key: number]: {
                    cellWidth?: number;
                };
            };
            headStyles?: {
                fillColor?: number[];
                textColor?: number;
                fontSize?: number;
                fontStyle?: string;
                halign?: string;
            };
            bodyStyles?: {
                halign?: string;
            };        }): void;
    export default autoTable;
}
