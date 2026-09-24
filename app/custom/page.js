import CustomPage from '@/components/CustomPage';

export const revalidate = 900;
export const metadata = { title: 'Custom · Love & Co. Embroidery' };

export default function CustomRoute() {
  return <CustomPage />;
}
