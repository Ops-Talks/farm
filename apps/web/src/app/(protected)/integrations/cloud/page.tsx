import { CloudProvidersClient } from './_components/CloudProvidersClient';

export const metadata = {
  title: 'Cloud Providers',
  description: 'Connect AWS, GCP, and Azure cloud providers to Farm',
};

export default function CloudProvidersPage() {
  return <CloudProvidersClient />;
}
