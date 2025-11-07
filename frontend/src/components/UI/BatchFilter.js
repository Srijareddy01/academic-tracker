import React from 'react';

const BatchFilter = ({ selectedBatch, onBatchChange, className = '' }) => {
  const handleBatchChange = (e) => {
    console.log('Batch filter changed to:', e.target.value); // Debug log
    onBatchChange(e.target.value);
  };

  return (
    <select
      value={selectedBatch}
      onChange={handleBatchChange}
      className={`input ${className}`}
    >
      <option value="all">All Batches</option>
      <option value="2026-CSE-A">2026-CSE-A</option>
      <option value="2026-CSE-B">2026-CSE-B</option>
      <option value="2026-CSM-A">2026-CSM-A</option>
      <option value="2026-CSM-B">2026-CSM-B</option>
      <option value="2026-CSM-C">2026-CSM-C</option>
      <option value="2026-CSD">2026-CSD</option>
      <option value="2026-CSC">2026-CSC</option>
      <option value="2026-ECE">2026-ECE</option>
      <option value="2027-CSE-A">2027-CSE-A</option>
      <option value="2027-CSE-B">2027-CSE-B</option>
      <option value="2027-CSM-A">2027-CSM-A</option>
      <option value="2027-CSM-B">2027-CSM-B</option>
      <option value="2027-CSM-C">2027-CSM-C</option>
      <option value="2027-CSD">2027-CSD</option>
      <option value="2027-CSC">2027-CSC</option>
      <option value="2027-ECE">2027-ECE</option>
    </select>
  );
};

export default BatchFilter;