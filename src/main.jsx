import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { jsPDF } from 'jspdf';

const originalJsPDFSave = jsPDF.prototype.save;
jsPDF.prototype.save = function(filename) {
  if (window.AndroidApp && window.AndroidApp.downloadBase64File) {
    const base64data = this.output('datauristring');
    window.AndroidApp.downloadBase64File(base64data, filename, 'application/pdf');
  } else {
    originalJsPDFSave.call(this, filename);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
