import React from 'react';
import { createRoot } from 'react-dom/client';
import UserApp from './UserApp';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

createRoot(container).render(
  <React.StrictMode>
    <UserApp />
  </React.StrictMode>,
);
