'use client';
import SystemWizard from '@/components/inventory/SystemWizard';
import { updateAISystem } from './actions';

export default function EditSystemClient({ systemId, systemName, initialForm, initialTags }) {
  const handleSave = (payload) => updateAISystem({ ...payload, id: systemId });

  return (
    <SystemWizard
      mode="edit"
      systemId={systemId}
      systemName={systemName}
      initialData={initialForm}
      initialTags={initialTags}
      onSave={handleSave}
    />
  );
}
