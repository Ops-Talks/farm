import { KeycloakIntegrationClient } from './_components/KeycloakIntegrationClient';

export const metadata = {
  title: 'Keycloak SSO | Farm',
  description: 'Configure Keycloak OpenID Connect SSO for enterprise login',
};

export default function KeycloakPage() {
  return <KeycloakIntegrationClient />;
}
