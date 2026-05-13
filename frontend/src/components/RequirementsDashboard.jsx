import React, { useState, useEffect } from 'react';
import requirementsData from '../data/requirements.json';

const RequirementsDashboard = () => {
  const [requirements, setRequirements] = useState([]);

  useEffect(() => {
    // In a real scenario, this might be fetched from an API endpoint 
    // that runs the script, but for now we just load the static JSON
    setRequirements(requirementsData);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Implemented': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Project Alpha-Orchestrator Requirements</h2>
      <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {requirements.map(req => (
          <div key={req.id} style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            padding: '16px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#374151' }}>{req.id}</span>
              <span style={{ 
                padding: '4px 8px', 
                borderRadius: '9999px', 
                fontSize: '12px', 
                fontWeight: '500',
                backgroundColor: req.status === 'Implemented' ? '#dcfce7' : '#f3f4f6',
                color: req.status === 'Implemented' ? '#166534' : '#374151'
              }}>
                {req.status}
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>{req.title}</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>{req.description}</p>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Category: {req.category}</div>
            
            {req.files && req.files.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Implemented in:</span>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#6b7280' }}>
                  {req.files.map((file, i) => (
                    <li key={i}>{file}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequirementsDashboard;
