'use client';
import SystemWizard from '@/components/inventory/SystemWizard';
import { saveAISystem } from './actions';

export default function NewInventorySystemPage() {
  return (
    <SystemWizard
      mode="create"
      onSave={saveAISystem}
    />
  );
}
