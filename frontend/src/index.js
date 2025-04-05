import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './tailwind.css'; // Make sure to import Tailwind if using it

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);