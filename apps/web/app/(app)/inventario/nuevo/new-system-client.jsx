'use client';
import SystemWizard from '@/components/inventory/SystemWizard';
import { saveAISystem } from './actions';

export default function NewSystemClient({ initialData, initialTags, prefill }) {
  return (
    <SystemWizard
      mode="create"
      initialData={initialData}
      initialTags={initialTags}
      prefill={prefill}
      onSave={saveAISystem}
    />
  );
}
