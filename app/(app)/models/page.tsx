import { ProviderManager } from '@/components/providers/provider-manager';

export default function ModelsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090d16]">
      <ProviderManager />
    </div>
  );
}
