import { MainLayout } from '@/components/layout/MainLayout';
import { PalettePreviewDual } from '@/components/settings/PalettePreview';

export default function PaletteDemo() {
  return (
    <MainLayout title="Branding Paletten" subtitle="Vorschau aller kuratierten Industry-Paletten">
      <PalettePreviewDual />
    </MainLayout>
  );
}
